import express from 'express';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { requirePermission } from '../middleware/permissions.js';
import { emitToAdmins, emitToUser } from '../utils/realtime.js';
import { logAudit } from '../utils/audit.js';
import { applyUserPII } from '../utils/encryption.js';
import {
  validateParams,
  validateRequest,
  adminConversationIdParamSchema,
  adminConversationSendSchema,
} from '../middleware/requestValidation.js';

const router = express.Router();

router.get('/', requireAdmin, requirePermission('support:chat'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.user_id, c.status, c.subject, c.last_message_at,
            u.full_name, u.email, u.full_name_encrypted, u.email_encrypted
     FROM conversations c
     JOIN users u ON u.id = c.user_id
     ORDER BY c.last_message_at DESC
     LIMIT 200`
  );
  return res.json(rows.map((row) => applyUserPII(row)));
});

router.get('/:id/messages', requireAdmin, requirePermission('support:chat'), validateParams(adminConversationIdParamSchema), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, sender_type, sender_id, body, created_at
     FROM conversation_messages
     WHERE conversation_id = ?
     ORDER BY created_at ASC
     LIMIT 200`,
    [req.validatedParams.id]
  );
  return res.json(rows);
});

router.post('/:id/send', requireAdmin, requirePermission('support:chat'), validateParams(adminConversationIdParamSchema), validateRequest(adminConversationSendSchema), async (req, res) => {
  const { text } = req.validated || req.body || {};
  const body = String(text || '').trim();
  if (!body) return res.status(400).json({ error: 'Message required' });

  const [[conversation]] = await pool.query(
    'SELECT id, user_id FROM conversations WHERE id = ? LIMIT 1',
    [req.validatedParams.id]
  );
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const messageId = crypto.randomUUID();
  await pool.query(
    'INSERT INTO conversation_messages (id, conversation_id, sender_type, sender_id, body) VALUES (?, ?, ?, ?, ?)',
    [messageId, conversation.id, 'admin', req.admin.sub, body]
  );
  await pool.query('UPDATE conversations SET last_message_at = NOW() WHERE id = ?', [
    conversation.id,
  ]);

  const message = {
    id: messageId,
    conversationId: conversation.id,
    senderType: 'admin',
    senderId: req.admin.sub,
    body,
    createdAt: new Date().toISOString(),
  };

  emitToUser(conversation.user_id, { type: 'chat.message', message });
  emitToAdmins({ type: 'chat.message', message, userId: conversation.user_id });

  logAudit({
    actorType: 'admin',
    actorId: req.admin.sub,
    action: 'chat.message',
    entityType: 'conversation',
    entityId: conversation.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(() => null);

  return res.status(201).json({ message: 'Sent', data: message });
});

export default router;
