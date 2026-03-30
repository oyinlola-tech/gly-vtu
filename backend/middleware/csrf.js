import crypto from 'crypto';

export function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

export function csrfMiddleware(req, res, next) {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next();

  const csrfExemptPaths = [
    '/api/flutterwave/webhook',
    '/api/vtpass/webhook',
    '/api/auth/csrf',
    '/api/admin/auth/csrf',
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
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  const cookieValue = Array.isArray(csrfCookie) ? csrfCookie[0] : csrfCookie;
  const headerValue = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;
  if (!cookieValue || !headerValue || cookieValue.length !== headerValue.length) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  let isMatch = false;
  try {
    isMatch = crypto.timingSafeEqual(Buffer.from(cookieValue), Buffer.from(headerValue));
  } catch (err) {
    isMatch = false;
  }
  if (!isMatch) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  return next();
}
