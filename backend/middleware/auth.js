import jwt from 'jsonwebtoken';
import { AUTH_COOKIE_NAME } from '../utils/tokens.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

export function requireUser(req, res, next) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME] || null;
  const token = bearer || cookieToken;

  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'user') return res.status(403).json({ error: 'Forbidden' });
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
