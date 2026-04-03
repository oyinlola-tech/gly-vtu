import { pool } from '../config/db.js';
import { logger } from './logger.js';

export async function refundPendingBill(reference) {
  if (!reference) return { refunded: false, reason: 'missing_reference' };
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[tx]] = await conn.query(
      'SELECT id, user_id, status, total FROM transactions WHERE reference = ? FOR UPDATE',
      [reference]
    );
    if (!tx) {
      await conn.rollback();
      return { refunded: false, reason: 'not_found' };
    }
    if (tx.status !== 'pending') {
      await conn.rollback();
      return { refunded: false, reason: 'not_pending' };
    }
    await conn.query('UPDATE transactions SET status = ? WHERE id = ?', ['failed', tx.id]);
    await conn.query('UPDATE bill_orders SET status = ? WHERE reference = ?', [
      'failed',
      reference,
    ]);
    await conn.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [
      Number(tx.total || 0),
      tx.user_id,
    ]);
    await conn.commit();
    return { refunded: true };
  } catch (err) {
    await conn.rollback();
    logger.error('Bill refund failed', { error: logger.format(err), reference });
    return { refunded: false, reason: 'error' };
  } finally {
    conn.release();
  }
}

