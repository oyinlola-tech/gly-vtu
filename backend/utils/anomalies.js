import { pool } from '../config/db.js';
import { logSecurityEvent } from './securityEvents.js';
import { sendAnomalyAlertEmail } from './email.js';

const WITHDRAWAL_AMOUNT_THRESHOLD = Number(process.env.ANOMALY_WITHDRAWAL_THRESHOLD_NGN || 500000);
const WITHDRAWAL_WINDOW_MINUTES = Number(process.env.ANOMALY_WITHDRAWAL_WINDOW_MINUTES || 60);
const WITHDRAWAL_COUNT_THRESHOLD = Number(process.env.ANOMALY_WITHDRAWAL_COUNT || 3);
const TOPUP_AMOUNT_THRESHOLD = Number(process.env.ANOMALY_TOPUP_THRESHOLD_NGN || 1000000);
const TOPUP_WINDOW_MINUTES = Number(process.env.ANOMALY_TOPUP_WINDOW_MINUTES || 60);
const TOPUP_COUNT_THRESHOLD = Number(process.env.ANOMALY_TOPUP_COUNT || 5);
const NEW_RECIPIENT_THRESHOLD = Number(process.env.ANOMALY_NEW_RECIPIENT_THRESHOLD || 3);
const NEW_RECIPIENT_WINDOW_HOURS = Number(process.env.ANOMALY_NEW_RECIPIENT_WINDOW_HOURS || 24);
const DEVICE_COUNT_THRESHOLD = Number(process.env.ANOMALY_DEVICE_COUNT_THRESHOLD || 5);
const FAILED_LOGIN_THRESHOLD = Number(process.env.ANOMALY_FAILED_LOGIN_THRESHOLD || 5);
const ADMIN_ADJUSTMENT_THRESHOLD = Number(process.env.ANOMALY_ADMIN_ADJUSTMENT_THRESHOLD_NGN || 500000);

export async function checkNewRecipientAnomaly({ userId, recipient, ip, userAgent }) {
  if (!userId || !recipient || !NEW_RECIPIENT_THRESHOLD) return;
  
  // Check if this recipient is new (no previous transactions in the last window)
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM transactions
     WHERE user_id = ?
       AND type = 'send'
       AND JSON_EXTRACT(metadata, '$.to') = ?
       AND created_at >= NOW() - INTERVAL ? HOUR`,
    [userId, recipient, NEW_RECIPIENT_WINDOW_HOURS]
  );
  const hasPrevious = Number(rows[0]?.cnt || 0) > 0;
  if (hasPrevious) return; // Not new

  // Count new recipients in the window
  const [newRecipients] = await pool.query(
    `SELECT COUNT(DISTINCT JSON_EXTRACT(metadata, '$.to')) AS cnt
     FROM transactions
     WHERE user_id = ?
       AND type = 'send'
       AND created_at >= NOW() - INTERVAL ? HOUR`,
    [userId, NEW_RECIPIENT_WINDOW_HOURS]
  );
  const newCount = Number(newRecipients[0]?.cnt || 0);
  
  if (newCount >= NEW_RECIPIENT_THRESHOLD) {
    logSecurityEvent({
      type: 'anomaly.recipient.new',
      severity: 'medium',
      actorType: 'user',
      actorId: userId,
      ip,
      userAgent,
      metadata: {
        newRecipients: newCount,
        threshold: NEW_RECIPIENT_THRESHOLD,
        windowHours: NEW_RECIPIENT_WINDOW_HOURS,
        currentRecipient: recipient,
      },
    }).catch(() => null);
    
    // Send email alert
    const [[user]] = await pool.query(
      'SELECT email, email_encrypted FROM users WHERE id = ? LIMIT 1',
      [userId]
    ).catch(() => [[null]]);
    
    if (user?.email) {
      sendAnomalyAlertEmail({
        to: user.email,
        anomalyType: 'anomaly.recipient.new',
        details: {
          'New Recipients': newCount,
          'Time Window': `${NEW_RECIPIENT_WINDOW_HOURS} hours`,
          'Threshold': NEW_RECIPIENT_THRESHOLD,
          'Current Recipient': recipient,
        },
        severity: 'medium',
      }).catch(() => null);
    }
  }
}

export async function checkWithdrawalAnomaly({ userId, amount, ip, userAgent }) {
  if (!userId) return;
  const numericAmount = Number(amount || 0);
  
  // Fetch user email for alerts (non-blocking)
  const [[user]] = await pool.query(
    'SELECT email, email_encrypted FROM users WHERE id = ? LIMIT 1',
    [userId]
  ).catch(() => [[null]]);

  if (WITHDRAWAL_AMOUNT_THRESHOLD && numericAmount >= WITHDRAWAL_AMOUNT_THRESHOLD) {
    logSecurityEvent({
      type: 'anomaly.withdrawal.amount',
      severity: 'high',
      actorType: 'user',
      actorId: userId,
      entityType: 'transaction',
      entityId: null,
      ip,
      userAgent,
      metadata: { amount: numericAmount, threshold: WITHDRAWAL_AMOUNT_THRESHOLD },
    }).catch(() => null);
    
    // Send email alert for high-severity withdrawal anomaly
    if (user?.email) {
      sendAnomalyAlertEmail({
        to: user.email,
        anomalyType: 'anomaly.withdrawal.amount',
        details: {
          Amount: `NGN ${numericAmount.toLocaleString()}`,
          Threshold: `NGN ${WITHDRAWAL_AMOUNT_THRESHOLD.toLocaleString()}`,
          'Timestamp': new Date().toLocaleString(),
        },
        severity: 'high',
      }).catch(() => null);
    }
  }

  if (WITHDRAWAL_COUNT_THRESHOLD && WITHDRAWAL_WINDOW_MINUTES) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS cnt
       FROM transactions
       WHERE user_id = ?
         AND type = 'send'
         AND created_at >= NOW() - INTERVAL ? MINUTE`,
      [userId, WITHDRAWAL_WINDOW_MINUTES]
    );
    const count = Number(rows[0]?.cnt || 0);
    if (count >= WITHDRAWAL_COUNT_THRESHOLD) {
      logSecurityEvent({
        type: 'anomaly.withdrawal.frequency',
        severity: 'medium',
        actorType: 'user',
        actorId: userId,
        ip,
        userAgent,
        metadata: {
          count,
          windowMinutes: WITHDRAWAL_WINDOW_MINUTES,
          threshold: WITHDRAWAL_COUNT_THRESHOLD,
        },
      }).catch(() => null);
      
      // Send email alert for withdrawal frequency anomaly
      if (user?.email) {
        sendAnomalyAlertEmail({
          to: user.email,
          anomalyType: 'anomaly.withdrawal.frequency',
          details: {
            'Transactions': count,
            'Time Window': `${WITHDRAWAL_WINDOW_MINUTES} minutes`,
            'Threshold': WITHDRAWAL_COUNT_THRESHOLD,
          },
          severity: 'medium',
        }).catch(() => null);
      }
    }
  }

  if (DEVICE_COUNT_THRESHOLD) {
    const [devices] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM user_devices WHERE user_id = ?',
      [userId]
    );
    const deviceCount = Number(devices[0]?.cnt || 0);
    if (deviceCount >= DEVICE_COUNT_THRESHOLD) {
      logSecurityEvent({
        type: 'anomaly.devices.count',
        severity: 'low',
        actorType: 'user',
        actorId: userId,
        ip,
        userAgent,
        metadata: { deviceCount, threshold: DEVICE_COUNT_THRESHOLD },
      }).catch(() => null);
      
      // Send email alert for device count anomaly (low severity)
      if (user?.email) {
        sendAnomalyAlertEmail({
          to: user.email,
          anomalyType: 'anomaly.devices.count',
          details: {
            'Active Devices': deviceCount,
            'Threshold': DEVICE_COUNT_THRESHOLD,
          },
          severity: 'low',
        }).catch(() => null);
      }
    }
  }
}

export async function checkTopupAnomaly({ userId, amount, ip, userAgent }) {
  if (!userId) return;
  const numericAmount = Number(amount || 0);

  // Fetch user email for alerts (non-blocking)
  const [[user]] = await pool.query(
    'SELECT email, email_encrypted FROM users WHERE id = ? LIMIT 1',
    [userId]
  ).catch(() => [[null]]);

  if (TOPUP_AMOUNT_THRESHOLD && numericAmount >= TOPUP_AMOUNT_THRESHOLD) {
    logSecurityEvent({
      type: 'anomaly.topup.amount',
      severity: 'high',
      actorType: 'user',
      actorId: userId,
      entityType: 'transaction',
      entityId: null,
      ip,
      userAgent,
      metadata: { amount: numericAmount, threshold: TOPUP_AMOUNT_THRESHOLD },
    }).catch(() => null);

    // Send email alert for high-severity topup anomaly
    if (user?.email) {
      sendAnomalyAlertEmail({
        to: user.email,
        anomalyType: 'anomaly.topup.amount',
        details: {
          Amount: `NGN ${numericAmount.toLocaleString()}`,
          Threshold: `NGN ${TOPUP_AMOUNT_THRESHOLD.toLocaleString()}`,
          'Timestamp': new Date().toLocaleString(),
        },
        severity: 'high',
      }).catch(() => null);
    }
  }

  if (TOPUP_COUNT_THRESHOLD && TOPUP_WINDOW_MINUTES) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS cnt
       FROM transactions
       WHERE user_id = ?
         AND type = 'topup'
         AND created_at >= NOW() - INTERVAL ? MINUTE`,
      [userId, TOPUP_WINDOW_MINUTES]
    );
    const count = Number(rows[0]?.cnt || 0);
    if (count >= TOPUP_COUNT_THRESHOLD) {
      logSecurityEvent({
        type: 'anomaly.topup.frequency',
        severity: 'medium',
        actorType: 'user',
        actorId: userId,
        ip,
        userAgent,
        metadata: {
          count,
          windowMinutes: TOPUP_WINDOW_MINUTES,
          threshold: TOPUP_COUNT_THRESHOLD,
        },
      }).catch(() => null);

      // Send email alert for topup frequency anomaly
      if (user?.email) {
        sendAnomalyAlertEmail({
          to: user.email,
          anomalyType: 'anomaly.topup.frequency',
          details: {
            'Topups': count,
            'Time Window': `${TOPUP_WINDOW_MINUTES} minutes`,
            'Threshold': TOPUP_COUNT_THRESHOLD,
          },
          severity: 'medium',
        }).catch(() => null);
      }
    }
  }
}

export function checkFailedLoginAnomaly({ actorId, actorType = 'user', attempts, ip, userAgent }) {
  if (!attempts || !FAILED_LOGIN_THRESHOLD) return;
  if (Number(attempts) >= FAILED_LOGIN_THRESHOLD) {
    logSecurityEvent({
      type: 'anomaly.login.failed',
      severity: 'medium',
      actorType,
      actorId,
      ip,
      userAgent,
      metadata: { attempts, threshold: FAILED_LOGIN_THRESHOLD },
    }).catch(() => null);
    
    // Send email alert for high failed login attempts (async, non-blocking)
    if (actorType === 'user' && actorId) {
      pool.query('SELECT email FROM users WHERE id = ? LIMIT 1', [actorId])
        .then(([[user]]) => {
          if (user?.email) {
            sendAnomalyAlertEmail({
              to: user.email,
              anomalyType: 'anomaly.login.failed',
              details: {
                'Failed Attempts': attempts,
                'Threshold': FAILED_LOGIN_THRESHOLD,
                'IP Address': ip || 'Unknown',
              },
              severity: 'medium',
            }).catch(() => null);
          }
        })
        .catch(() => null);
    }
  }
}

export function checkAdminAdjustmentAnomaly({ adminId, amount, ip, userAgent }) {
  const numericAmount = Number(amount || 0);
  if (ADMIN_ADJUSTMENT_THRESHOLD && numericAmount >= ADMIN_ADJUSTMENT_THRESHOLD) {
    logSecurityEvent({
      type: 'anomaly.admin.adjustment',
      severity: 'high',
      actorType: 'admin',
      actorId: adminId,
      ip,
      userAgent,
      metadata: { amount: numericAmount, threshold: ADMIN_ADJUSTMENT_THRESHOLD },
    }).catch(() => null);
  }
}
