import crypto from 'crypto';
import { logger } from '../utils/logger.js';

export function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Enhanced CSRF middleware with token rotation
 * - Double-submit pattern validation (cookie + header)
 * - Timing-safe comparison to prevent timing attacks
 * - Token rotation after successful validation
 * - Security event logging for CSRF violations
 */
export function csrfMiddleware(req, res, next) {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next();

  const csrfExemptPaths = [
    '/api/flutterwave/webhook',
    '/api/vtpass/webhook',
    '/api/auth/csrf',
    '/api/auth/refresh',
    '/api/admin/auth/csrf',
    '/api/admin/auth/refresh',
  ];
  const path = req.path || '';
  const proxyStripped = path.startsWith('/app/admin/api')
    ? path.replace('/app/admin/api', '/api/admin')
    : path.startsWith('/app/api')
      ? path.replace('/app/api', '/api')
      : path;
  
  if (csrfExemptPaths.some((p) => proxyStripped.startsWith(p))) return next();

  // CSRF validation is required for all state-changing requests
  // regardless of authentication method (Authorization header doesn't exempt CSRF checks)
  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.headers['x-csrf-token'];
  
  if (!csrfCookie || !csrfHeader) {
    logger.warn('CSRF: Missing token', {
      path: proxyStripped,
      method,
      hasCookie: !!csrfCookie,
      hasHeader: !!csrfHeader,
      ip: req.ip,
    });
    return res.status(403).json({ error: 'CSRF validation failed' });
  }

  const cookieValue = Array.isArray(csrfCookie) ? csrfCookie[0] : csrfCookie;
  const headerValue = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;
  
  // Length check first (prevents timing attacks on unequal strings)
  if (!cookieValue || !headerValue || cookieValue.length !== headerValue.length) {
    logger.warn('CSRF: Token length mismatch', {
      path: proxyStripped,
      method,
      cookieLength: cookieValue?.length || 0,
      headerLength: headerValue?.length || 0,
      ip: req.ip,
    });
    return res.status(403).json({ error: 'CSRF validation failed' });
  }

  // Timing-safe comparison to prevent timing attacks
  let isMatch = false;
  try {
    isMatch = crypto.timingSafeEqual(Buffer.from(cookieValue), Buffer.from(headerValue));
  } catch (err) {
    logger.warn('CSRF: Comparison error', {
      path: proxyStripped,
      method,
      error: err.message,
      ip: req.ip,
    });
    isMatch = false;
  }

  if (!isMatch) {
    logger.warn('CSRF: Token mismatch', {
      path: proxyStripped,
      method,
      userId: req.user?.sub || req.admin?.sub || null,
      ip: req.ip,
    });
    return res.status(403).json({ error: 'CSRF validation failed' });
  }

  // CSRF token rotation: rotate token after successful validation
  // This ensures each request has a new token, improving security
  const newToken = generateCsrfToken();
  res.cookie('csrf_token', newToken, {
    httpOnly: false, // Must be accessible to JavaScript for header injection
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 6, // 6 hours
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
  
  // Store new token in response for client consumption if needed
  res.setHeader('X-CSRF-Token-New', newToken);

  logger.debug('CSRF: Validation successful + token rotated', {
    path: proxyStripped,
    method,
    ip: req.ip,
  });

  return next();
}
