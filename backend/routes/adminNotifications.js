import express from 'express';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { requirePermission } from '../middleware/permissions.js';
import { emitToUser, emitToAllUsers } from '../utils/realtime.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

router.post('/', requireAdmin, requirePermission('notify:send'), async (req, res) => {
  const { title, body, type = 'info', userId, force = false, data } = req.body || {};
  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  if (userId) {
    const id = crypto.randomUUID();
    await pool.query(
      'INSERT INTO notifications (id, user_id, title, body, type, data, force) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userId, title, body, type, data ? JSON.stringify(data) : null, force ? 1 : 0]
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

export default router;
