import { pool } from '../config/db.js';
import { logSecurityEvent } from './securityEvents.js';

const WITHDRAWAL_AMOUNT_THRESHOLD = Number(process.env.ANOMALY_WITHDRAWAL_THRESHOLD_NGN || 500000);
const WITHDRAWAL_WINDOW_MINUTES = Number(process.env.ANOMALY_WITHDRAWAL_WINDOW_MINUTES || 60);
const WITHDRAWAL_COUNT_THRESHOLD = Number(process.env.ANOMALY_WITHDRAWAL_COUNT || 3);
const ADMIN_ADJUSTMENT_THRESHOLD = Number(process.env.ANOMALY_ADMIN_ADJUSTMENT_NGN || 500000);
const DEVICE_COUNT_THRESHOLD = Number(process.env.ANOMALY_DEVICE_COUNT || 5);
const FAILED_LOGIN_THRESHOLD = Number(process.env.ANOMALY_FAILED_LOGIN_THRESHOLD || 5);

export async function checkWithdrawalAnomaly({ userId, amount, ip, userAgent }) {
  if (!userId) return;
  const numericAmount = Number(amount || 0);
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

