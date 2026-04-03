import express from 'express';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { requirePermission } from '../middleware/permissions.js';

const router = express.Router();

router.get('/', requireAdmin, requirePermission('audit:read'), async (req, res) => {
  const anomalies = [];

  const [failedLogins] = await pool.query(
    `SELECT id, login_failed_attempts, last_login_failed_at
     FROM users
     WHERE login_failed_attempts >= 5 AND last_login_failed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     ORDER BY last_login_failed_at DESC
     LIMIT 20`
  );
  for (const row of failedLogins || []) {
    anomalies.push({
      id: `failed-${row.id}`,
      type: 'anomaly.login.failed',
      severity: 'high',
      description: `User has ${row.login_failed_attempts} failed login attempts.`,
      userId: row.id,
      createdAt: row.last_login_failed_at,
    });
  }

  const [largeTx] = await pool.query(
    `SELECT id, user_id, total, created_at
     FROM transactions
     WHERE status = 'success' AND type IN ('send','bill') AND total >= 250000
       AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     ORDER BY created_at DESC
     LIMIT 20`
  );
  for (const row of largeTx || []) {
    anomalies.push({
      id: `tx-${row.id}`,
      type: 'anomaly.withdrawal.amount',
      severity: 'medium',
      description: `Large outgoing transaction of NGN ${Number(row.total || 0).toFixed(2)}.`,
      userId: row.user_id,
      createdAt: row.created_at,
    });
  }

  const [devices] = await pool.query(
    `SELECT user_id, COUNT(*) AS device_count
     FROM user_devices
     GROUP BY user_id
     HAVING device_count >= 5
     LIMIT 20`
  );
  for (const row of devices || []) {
    anomalies.push({
      id: `device-${row.user_id}`,
      type: 'anomaly.devices.count',
      severity: 'low',
      description: `User has ${row.device_count} active devices.`,
      userId: row.user_id,
      createdAt: new Date().toISOString(),
    });
  }

  return res.json(anomalies);
});

export default router;
