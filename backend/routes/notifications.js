import express from 'express';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireUser, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const [rows] = await pool.query(
    `SELECT id, title, body, type, data, force, read_at, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [req.user.sub, limit]
  );
  return res.json(rows);
});

router.get('/unread-count', requireUser, async (req, res) => {
  const [[row]] = await pool.query(
    'SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND read_at IS NULL',
    [req.user.sub]
  );
  return res.json({ unread: Number(row?.total || 0) });
});

router.post('/read', requireUser, async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ error: 'Notification IDs required' });
  }
  await pool.query(
    `UPDATE notifications SET read_at = NOW()
     WHERE user_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
    [req.user.sub, ...ids]
  );
  return res.json({ message: 'Notifications marked as read' });
});

router.post('/read-all', requireUser, async (req, res) => {
  await pool.query(
    'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
    [req.user.sub]
  );
  return res.json({ message: 'All notifications marked as read' });
});

export default router;
