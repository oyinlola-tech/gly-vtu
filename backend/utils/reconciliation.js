import { pool } from '../config/db.js';
import { logger } from './logger.js';
import { logSecurityEvent } from './securityEvents.js';

/**
 * Reconciliation utility for fintech transactions
 * Matches internal transactions with external provider events
 * Detects discrepancies and anomalies
 */

export async function reconcileFlutterwaveTransactions() {
  const conn = await pool.getConnection();
  try {
    logger.info('Starting Flutterwave transaction reconciliation');

    // Get all successful topup transactions in the last 30 days
    const [transactions] = await conn.query(`
      SELECT t.id, t.user_id, t.amount, t.reference, t.created_at,
             SUBSTRING(t.reference, 5) as flw_ref
      FROM transactions t
      WHERE t.type = 'topup'
        AND t.status = 'success'
        AND t.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND t.reference LIKE 'FLW-%'
    `);

    // Get all successful Flutterwave events in the last 30 days
    const [events] = await conn.query(`
      SELECT event_id, tx_ref, flw_ref, status, raw_payload, processed_at
      FROM flutterwave_events
      WHERE status = 'successful'
        AND COALESCE(processed_at, created_at) > DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    const discrepancies = [];

    // Check transactions have corresponding events
    for (const tx of transactions) {
      const matchingEvent = events.find(e =>
        e.flw_ref === tx.flw_ref ||
        e.tx_ref === tx.tx_ref ||
        e.event_id === tx.flw_ref
      );

      if (!matchingEvent) {
        discrepancies.push({
          type: 'missing_event',
          transaction_id: tx.id,
          reference: tx.reference,
          amount: tx.amount,
          user_id: tx.user_id
        });
      } else {
        // Check amount matches if available in payload
        const payload = JSON.parse(matchingEvent.raw_payload || '{}');
        const eventAmount = payload.data?.amount;
        if (eventAmount && Number(eventAmount) !== Number(tx.amount)) {
          discrepancies.push({
            type: 'amount_mismatch',
            transaction_id: tx.id,
            reference: tx.reference,
            internal_amount: tx.amount,
            external_amount: eventAmount,
            user_id: tx.user_id
          });
        }
      }
    }

    // Check events have corresponding transactions (potential double-credits)
    for (const event of events) {
      const matchingTx = transactions.find(tx =>
        tx.flw_ref === event.flw_ref ||
        tx.reference === `FLW-${event.flw_ref}` ||
        tx.reference === `FLW-${event.event_id}`
      );

      if (!matchingTx) {
        discrepancies.push({
          type: 'orphaned_event',
          event_id: event.event_id,
          flw_ref: event.flw_ref,
          tx_ref: event.tx_ref,
          amount: JSON.parse(event.raw_payload || '{}').data?.amount
        });
      }
    }

    // Log discrepancies
    for (const disc of discrepancies) {
      await logSecurityEvent({
        type: 'reconciliation.flutterwave.discrepancy',
        severity: disc.type === 'amount_mismatch' ? 'high' : 'medium',
        actorType: 'system',
        entityType: 'transaction',
        entityId: disc.transaction_id || disc.event_id,
        metadata: disc
      });
    }

    logger.info(`Flutterwave reconciliation complete. Found ${discrepancies.length} discrepancies`);
    return { success: true, discrepancies: discrepancies.length };

  } catch (error) {
    logger.error('Flutterwave reconciliation failed', { error: logger.format(error) });
    return { success: false, error: error.message };
  } finally {
    conn.release();
  }
}

export async function reconcileVtpassTransactions() {
  const conn = await pool.getConnection();
  try {
    logger.info('Starting VTpass transaction reconciliation');

    // Get all bill transactions in the last 30 days
    const [transactions] = await conn.query(`
      SELECT t.id, t.user_id, t.amount, t.total, t.reference, t.status, t.created_at,
             SUBSTRING(t.reference, 6) as request_id
      FROM transactions t
      WHERE t.type IN ('bill', 'airtime', 'data', 'electricity', 'tv')
        AND t.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND t.reference LIKE 'BILL-%'
    `);

    // Get all VTpass events in the last 30 days
    const [events] = await conn.query(`
      SELECT request_id, transaction_id, status, raw_payload, created_at
      FROM vtpass_events
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    const discrepancies = [];

    // Check transactions have corresponding events
    for (const tx of transactions) {
      const matchingEvent = events.find(e => e.request_id === tx.request_id);

      if (!matchingEvent) {
        discrepancies.push({
          type: 'missing_event',
          transaction_id: tx.id,
          reference: tx.reference,
          status: tx.status,
          user_id: tx.user_id
        });
      } else {
        // Check status matches
        if (matchingEvent.status !== tx.status) {
          discrepancies.push({
            type: 'status_mismatch',
            transaction_id: tx.id,
            reference: tx.reference,
            internal_status: tx.status,
            external_status: matchingEvent.status,
            user_id: tx.user_id
          });
        }
      }
    }

    // Check events have corresponding transactions
    for (const event of events) {
      const matchingTx = transactions.find(tx => tx.request_id === event.request_id);

      if (!matchingTx) {
        discrepancies.push({
          type: 'orphaned_event',
          request_id: event.request_id,
          transaction_id: event.transaction_id,
          status: event.status
        });
      }
    }

    // Log discrepancies
    for (const disc of discrepancies) {
      await logSecurityEvent({
        type: 'reconciliation.vtpass.discrepancy',
        severity: disc.type === 'status_mismatch' ? 'high' : 'medium',
        actorType: 'system',
        entityType: 'transaction',
        entityId: disc.transaction_id || disc.request_id,
        metadata: disc
      });
    }

    logger.info(`VTpass reconciliation complete. Found ${discrepancies.length} discrepancies`);
    return { success: true, discrepancies: discrepancies.length };

  } catch (error) {
    logger.error('VTpass reconciliation failed', { error: logger.format(error) });
    return { success: false, error: error.message };
  } finally {
    conn.release();
  }
}

export async function runFullReconciliation() {
  logger.info('Starting full transaction reconciliation');

  const flutterwave = await reconcileFlutterwaveTransactions();
  const vtpass = await reconcileVtpassTransactions();

  const summary = {
    flutterwave,
    vtpass,
    total_discrepancies: (flutterwave.discrepancies || 0) + (vtpass.discrepancies || 0),
    timestamp: new Date().toISOString()
  };

  logger.info('Full reconciliation complete', summary);
  return summary;
}
