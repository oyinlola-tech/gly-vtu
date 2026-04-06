import express from 'express';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/auth.js';
import { emitToAdmins, emitToUser } from '../utils/realtime.js';
import { logAudit } from '../utils/audit.js';
import { validateRequest, conversationSendSchema } from '../middleware/requestValidation.js';
import { sanitizeUserText } from '../utils/sanitize.js';

const router = express.Router();

async function ensureConversation(userId) {
  const [[existing]] = await pool.query(
    'SELECT id, status, subject, last_message_at FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  if (existing?.id) return existing;
  const id = crypto.randomUUID();
  await pool.query(
    'INSERT INTO conversations (id, user_id, status, subject, last_message_at) VALUES (?, ?, ?, ?, NOW())',
    [id, userId, 'open', 'Support']
  );
  return { id, status: 'open', subject: 'Support', last_message_at: new Date().toISOString() };
}

router.get('/me', requireUser, async (req, res) => {
  const conversation = await ensureConversation(req.user.sub);
  const [messages] = await pool.query(
    `SELECT id, sender_type, sender_id, body, created_at
     FROM conversation_messages
     WHERE conversation_id = ?
     ORDER BY created_at ASC
     LIMIT 200`,
    [conversation.id]
  );
  return res.json({ conversation, messages });
});

router.post('/send', requireUser, validateRequest(conversationSendSchema), async (req, res) => {
  const { text } = req.validated || req.body || {};
  // SECURITY: Sanitize user-generated content to reduce stored XSS risk.
  const body = sanitizeUserText(text, 2000);
  if (!body) return res.status(400).json({ error: 'Message required' });

  const conversation = await ensureConversation(req.user.sub);
  const messageId = crypto.randomUUID();
  await pool.query(
    'INSERT INTO conversation_messages (id, conversation_id, sender_type, sender_id, body) VALUES (?, ?, ?, ?, ?)',
    [messageId, conversation.id, 'user', req.user.sub, body]
  );
  await pool.query('UPDATE conversations SET last_message_at = NOW() WHERE id = ?', [
    conversation.id,
  ]);

  const message = {
    id: messageId,
    conversationId: conversation.id,
    senderType: 'user',
    senderId: req.user.sub,
    body,
    createdAt: new Date().toISOString(),
  };

  emitToUser(req.user.sub, { type: 'chat.message', message });
  emitToAdmins({ type: 'chat.message', message, userId: req.user.sub });

  logAudit({
    actorType: 'user',
    actorId: req.user.sub,
    action: 'chat.message',
    entityType: 'conversation',
    entityId: conversation.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(() => null);

  return res.status(201).json({ message: 'Sent', data: message });
});

export default router;
