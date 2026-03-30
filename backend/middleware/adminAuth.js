import jwt from 'jsonwebtoken';
import { ADMIN_AUTH_COOKIE_NAME } from '../utils/tokens.js';

const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET;
if (!JWT_ADMIN_SECRET) {
  throw new Error('JWT_ADMIN_SECRET is required');
}

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const cookieToken = req.cookies?.[ADMIN_AUTH_COOKIE_NAME] || null;
  const token = bearer || cookieToken;

  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_ADMIN_SECRET);
    if (payload.type !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.admin = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
