import express from 'express';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { requirePermission } from '../middleware/permissions.js';
import { emitToUser, emitToAllUsers } from '../utils/realtime.js';
import { logAudit } from '../utils/audit.js';
import { validateRequest, validateQuery, adminNotificationSchema, adminNotificationHistoryQuerySchema } from '../middleware/requestValidation.js';

const router = express.Router();

router.post('/', requireAdmin, requirePermission('notify:send'), validateRequest(adminNotificationSchema), async (req, res) => {
  const { title, body, type = 'info', userId, force = false, data } = req.validated || req.body || {};
  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  if (userId) {
    const id = crypto.randomUUID();
    await pool.query(
      'INSERT INTO notifications (id, user_id, title, body, type, data, force) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userId, title, body, type, data ? JSON.stringify(data) : null, force ? 1 : 0]
    );
    await pool.query(
      'INSERT INTO admin_notifications (id, title, body, type, target_user_id, target_scope, force, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), title, body, type, userId, 'single', force ? 1 : 0, req.admin.sub]
    );
    emitToUser(userId, {
      type: 'notification.new',
      notification: { id, title, body, type, data, force: Boolean(force), createdAt: new Date().toISOString() },
    });
  } else {
    const [users] = await pool.query('SELECT id FROM users');
    if (users.length) {
      const values = users.map((row) => [
        crypto.randomUUID(),
        row.id,
        title,
        body,
        type,
        data ? JSON.stringify(data) : null,
        force ? 1 : 0,
      ]);
      await pool.query(
        `INSERT INTO notifications (id, user_id, title, body, type, data, force)
         VALUES ${values.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',')}`,
        values.flat()
      );
    }
    emitToAllUsers({
      type: 'notification.new',
      notification: {
        title,
        body,
        type,
        data,
        force: Boolean(force),
        createdAt: new Date().toISOString(),
      },
    });
    await pool.query(
      'INSERT INTO admin_notifications (id, title, body, type, target_user_id, target_scope, force, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), title, body, type, null, 'broadcast', force ? 1 : 0, req.admin.sub]
    );
  }

  logAudit({
    actorType: 'admin',
    actorId: req.admin.sub,
    action: 'notification.send',
    entityType: 'notification',
    entityId: userId || 'broadcast',
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(() => null);

  return res.status(201).json({ message: 'Notification sent' });
});

router.get('/history', requireAdmin, requirePermission('notify:send'), validateQuery(adminNotificationHistoryQuerySchema), async (req, res) => {
  const limit = Number(req.validatedQuery?.limit || 50);
  const offset = Number(req.validatedQuery?.offset || 0);
  const [rows] = await pool.query(
    `SELECT n.id, n.title, n.body, n.type, n.target_user_id, n.target_scope, n.force, n.created_by, n.created_at,
            a.name AS created_by_name, a.email AS created_by_email
     FROM admin_notifications n
     LEFT JOIN admin_users a ON a.id = n.created_by
     ORDER BY n.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return res.json(rows);
});

export default router;
