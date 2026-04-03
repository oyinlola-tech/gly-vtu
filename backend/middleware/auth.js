import jwt from 'jsonwebtoken';
import { AUTH_COOKIE_NAME } from '../utils/tokens.js';
import { logger } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

/**
 * Enhanced requireUser middleware with robust JWT validation
 * - Validates token signature
 * - Validates token expiration
 * - Validates token type
 * - Logs security events on validation failures
 */
export function requireUser(req, res, next) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME] || null;
  const token = bearer || cookieToken;

  if (!token) {
    logger.warn('Authorization: Missing token', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // jwt.verify() automatically checks:
    // 1. Signature validity
    // 2. Token expiration (exp claim)
    // 3. Thrown invalid/expired/malformed errors
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'], // Explicit algorithm specification
      maxAge: process.env.JWT_ACCESS_TTL || '15m', // Enforce max age
    });

    // Explicit validation checks beyond jwt.verify
    if (!payload.sub || !payload.type) {
      logger.warn('Authorization: Missing required claims', {
        path: req.path,
        sub: !!payload.sub,
        type: !!payload.type,
      });
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (payload.type !== 'user') {
      logger.warn('Authorization: Invalid token type', {
        path: req.path,
        expectedType: 'user',
        actualType: payload.type,
        ip: req.ip,
      });
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Validate expiration is set and not already expired (double-check)
    if (!payload.exp) {
      logger.warn('Authorization: Missing exp claim', {
        path: req.path,
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Invalid token' });
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSeconds) {
      logger.debug('Authorization: Token expired', {
        path: req.path,
        expiresAt: new Date(payload.exp * 1000),
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Token expired' });
    }

    req.user = payload;
    return next();
  } catch (err) {
    // jwt.verify throws specific errors:
    // - JsonWebTokenError: signature invalid
    // - TokenExpiredError: token expired
    // - NotBeforeError: token not yet valid
    const errorType = err.name || 'UnknownError';
    logger.warn(`Authorization: JWT validation failed (${errorType})`, {
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
