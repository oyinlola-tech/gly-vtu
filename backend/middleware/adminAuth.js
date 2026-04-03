import jwt from 'jsonwebtoken';
import { ADMIN_AUTH_COOKIE_NAME } from '../utils/tokens.js';
import { logger } from '../utils/logger.js';

const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET;
if (!JWT_ADMIN_SECRET) {
  throw new Error('JWT_ADMIN_SECRET is required');
}

/**
 * Enhanced requireAdmin middleware with robust JWT validation
 * - Validates token signature with explicit algorithm
 * - Validates token expiration
 * - Validates admin type
 * - Logs security events on validation failures
 * - Requires TOTP verification for sensitive operations (handled in route level)
 */
export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const cookieToken = req.cookies?.[ADMIN_AUTH_COOKIE_NAME] || null;
  const token = bearer || cookieToken;

  if (!token) {
    logger.warn('AdminAuth: Missing admin token', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, JWT_ADMIN_SECRET, {
      algorithms: ['HS256'], // Explicit algorithm specification
      maxAge: process.env.JWT_ACCESS_TTL || '15m', // Enforce max age
    });

    // Explicit validation checks
    if (!payload.sub || !payload.type) {
      logger.warn('AdminAuth: Missing required claims', {
        path: req.path,
        sub: !!payload.sub,
        type: !!payload.type,
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (payload.type !== 'admin') {
      logger.warn('AdminAuth: Invalid token type', {
        path: req.path,
        expectedType: 'admin',
        actualType: payload.type,
        ip: req.ip,
      });
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Validate expiration claim exists and is valid
    if (!payload.exp) {
      logger.warn('AdminAuth: Missing exp claim', {
        path: req.path,
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Invalid token' });
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSeconds) {
      logger.debug('AdminAuth: Token expired', {
        path: req.path,
        expiresAt: new Date(payload.exp * 1000),
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Token expired' });
    }

    req.admin = payload;
    return next();
  } catch (err) {
    const errorType = err.name || 'UnknownError';
    logger.warn(`AdminAuth: JWT validation failed (${errorType})`, {
      path: req.path,
      error: err.message,
      ip: req.ip,
    });

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    return res.status(401).json({ error: 'Invalid token' });
  }
}
