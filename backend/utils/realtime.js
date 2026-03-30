import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import { pool } from '../config/db.js';
import { logAudit } from './audit.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_ADMIN_SECRET =
  process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET || 'dev_secret_change_me';

const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const extraOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0)
  : [...defaultOrigins, ...extraOrigins];
const WS_TOKEN_MAX_AGE_MINUTES = Number(process.env.WS_TOKEN_MAX_AGE_MINUTES || 10);

function originAllowed(origin) {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

const userClients = new Map();
const adminClients = new Map();

function addClient(store, id, ws) {
  if (!store.has(id)) store.set(id, new Set());
  store.get(id).add(ws);
}

function removeClient(store, id, ws) {
  if (!store.has(id)) return;
  const set = store.get(id);
  set.delete(ws);
  if (!set.size) store.delete(id);
}

function emitToSet(set, payload) {
  if (!set) return;
  const message = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === 1) {
      ws.send(message);
    }
  }
}

export function emitToUser(userId, payload) {
  emitToSet(userClients.get(userId), payload);
}

export function emitToAdmins(payload) {
  for (const set of adminClients.values()) {
    emitToSet(set, payload);
  }
}

export function emitToAllUsers(payload) {
  for (const set of userClients.values()) {
    emitToSet(set, payload);
  }
}

async function getOrCreateConversation(userId) {
  const [[existing]] = await pool.query(
    'SELECT id FROM conversations WHERE user_id = ? AND status = "open" LIMIT 1',
    [userId]
  );
  if (existing?.id) return existing.id;

  const conversationId = crypto.randomUUID();
  await pool.query(
    'INSERT INTO conversations (id, user_id, status, subject, last_message_at) VALUES (?, ?, ?, ?, NOW())',
    [conversationId, userId, 'open', 'Support']
  );
  return conversationId;
}

async function insertMessage({ conversationId, senderType, senderId, body }) {
  const messageId = crypto.randomUUID();
  await pool.query(
    'INSERT INTO conversation_messages (id, conversation_id, sender_type, sender_id, body) VALUES (?, ?, ?, ?, ?)',
    [messageId, conversationId, senderType, senderId, body]
  );
  await pool.query('UPDATE conversations SET last_message_at = NOW() WHERE id = ?', [
    conversationId,
  ]);
  return {
    id: messageId,
    conversationId,
    senderType,
    senderId,
    body,
    createdAt: new Date().toISOString(),
  };
}

function parseAuth(reqUrl, req) {
  const url = new URL(reqUrl, 'http://localhost');
  const role = url.searchParams.get('role') || 'user';
  const protocol = req.headers['sec-websocket-protocol'] || '';
  const token = String(protocol).split(',')[0]?.trim();
  if (!token) return null;
  try {
    const secret = role === 'admin' ? JWT_ADMIN_SECRET : JWT_SECRET;
    const payload = jwt.verify(token, secret);
    if (role === 'admin' && payload.type !== 'admin') return null;
    if (role === 'user' && payload.type !== 'user') return null;
    if (payload?.iat) {
      const ageMs = Date.now() - payload.iat * 1000;
      if (ageMs > WS_TOKEN_MAX_AGE_MINUTES * 60 * 1000) return null;
    }
    return { role, id: payload.sub, payload };
  } catch {
    return null;
  }
}

export function attachRealtime(server) {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    handleProtocols: (protocols) => protocols.values().next().value || false,
  });

  wss.on('connection', (ws, req) => {
    if (!originAllowed(req.headers.origin)) {
      ws.close(1008, 'Origin not allowed');
      return;
    }
    const auth = parseAuth(req.url, req);
    if (!auth) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    ws.role = auth.role;
    ws.identity = auth.id;

    if (auth.role === 'admin') {
      addClient(adminClients, auth.id, ws);
    } else {
      addClient(userClients, auth.id, ws);
    }

    ws.send(JSON.stringify({ type: 'ws.ready', role: auth.role }));

    ws.on('message', async (raw) => {
      let payload = null;
      try {
        payload = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (payload?.type === 'chat.send') {
        const text = String(payload.text || '').trim();
        if (!text) return;
        try {
          if (auth.role === 'user') {
            const conversationId = await getOrCreateConversation(auth.id);
            const message = await insertMessage({
              conversationId,
              senderType: 'user',
              senderId: auth.id,
              body: text,
            });
            emitToUser(auth.id, { type: 'chat.message', message });
            emitToAdmins({ type: 'chat.message', message, userId: auth.id });
            logAudit({
              actorType: 'user',
              actorId: auth.id,
              action: 'chat.message',
              entityType: 'conversation',
              entityId: conversationId,
              ip: req.socket.remoteAddress,
              userAgent: req.headers['user-agent'],
            }).catch(() => null);
          } else {
            const conversationId = payload.conversationId;
            const userId = payload.userId;
            if (!conversationId || !userId) return;
            const message = await insertMessage({
              conversationId,
              senderType: 'admin',
              senderId: auth.id,
              body: text,
            });
            emitToUser(userId, { type: 'chat.message', message });
            emitToAdmins({ type: 'chat.message', message, userId });
            logAudit({
              actorType: 'admin',
              actorId: auth.id,
              action: 'chat.message',
              entityType: 'conversation',
              entityId: conversationId,
              ip: req.socket.remoteAddress,
              userAgent: req.headers['user-agent'],
            }).catch(() => null);
          }
        } catch {
          ws.send(JSON.stringify({ type: 'chat.error', message: 'Failed to send message' }));
        }
      }
    });

    ws.on('close', () => {
      if (auth.role === 'admin') {
        removeClient(adminClients, auth.id, ws);
      } else {
        removeClient(userClients, auth.id, ws);
      }
    });
  });

  return wss;
}
