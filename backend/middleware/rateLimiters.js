import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || '';
const isProd = process.env.NODE_ENV === 'production';
let redisClient = null;
let redisStore = null;
let redisConnected = false;
const adminLoginLocal = new Map();

if (REDIS_URL) {
  redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => {
    logger.error('Redis rate limiter error', { error: err.message });
    redisConnected = false;
    
    // In production, fail hard if Redis (required) goes down
    if (isProd) {
      logger.error('Redis connection lost in production - rate limiting disabled', {
        error: err.message,
        severity: 'critical'
      });
    }
  });
  redisClient.on('connect', () => {
    redisConnected = true;
    logger.info('Redis rate limiter connected');
  });
  
  redisClient.connect().catch((err) => {
    logger.error('Redis connection failed', { error: err.message });
    redisConnected = false;
    
    // In production, fail startup if Redis is required but unavailable
    if (isProd) {
      logger.error('Failed to connect to Redis in production', {
        error: err.message,
        redis_url: REDIS_URL ? 'configured' : 'not configured',
        severity: 'critical'
      });
      // Option: uncomment to fail startup
      // process.exit(1);
    }
  });
  
  redisStore = new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  });
}

// SECURITY: In production, Redis is REQUIRED for distributed rate limiting
// If not configured in production, warn (should fail in high-load deployments)
if (isProd && !REDIS_URL) {
  console.warn(
    'WARNING: REDIS_URL not configured in production. ' +
    'Rate limiting will use in-memory storage and will NOT work across multiple server instances. ' +
    'Distributed DoS attacks can overwhelm the server. ' +
    'Configure REDIS_URL for production deployments.'
  );
}

function limiterOptions(extra) {
  return {
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKeyGenerator,
    ...(redisStore ? { store: redisStore } : {}),
    ...extra,
  };
}

function guardRateLimiter(limiter) {
  return (req, res, next) => {
    if (isProd && REDIS_URL && !redisConnected) {
      logger.error('Rate limiting unavailable - blocking request', {
        ip: req.ip,
        path: req.path,
        severity: 'critical',
      });
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
    return limiter(req, res, next);
  };
}

export const authLimiter = guardRateLimiter(
  rateLimit(
    limiterOptions({
      windowMs: 10 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_AUTH_MAX || 30),
    })
  )
);

export const otpLimiter = guardRateLimiter(
  rateLimit(
    limiterOptions({
      windowMs: 10 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_OTP_MAX || 10),
    })
  )
);

export const webhookLimiter = guardRateLimiter(
  rateLimit(
    limiterOptions({
      windowMs: 60 * 1000,
      max: Number(process.env.RATE_LIMIT_WEBHOOK_MAX || 120),
    })
  )
);

export const adminAuthLimiter = guardRateLimiter(
  rateLimit(
    limiterOptions({
      windowMs: 10 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_ADMIN_AUTH_MAX || 20),
    })
  )
);

export const adminLoginLimiter = guardRateLimiter(
  rateLimit(
    limiterOptions({
      windowMs: 15 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_ADMIN_LOGIN_MAX || 5),
      keyGenerator: (req) => {
        const email = String(req.body?.email || '').toLowerCase().trim();
        return `${ipKeyGenerator(req)}:${email || 'no-email'}`;
      },
    })
  )
);

export async function adminLoginPerEmailLimiter(req, res, next) {
  const email = String(req.body?.email || '').toLowerCase().trim();
  if (!email) return next();

  const max = Number(process.env.RATE_LIMIT_ADMIN_LOGIN_PER_EMAIL_MAX || 3);
  const windowSeconds = Number(process.env.RATE_LIMIT_ADMIN_LOGIN_PER_EMAIL_WINDOW_SEC || 1800);
  const key = `admin_login:${email}:${ipKeyGenerator(req)}`;

  if (redisClient && redisConnected) {
    try {
      const attempts = await redisClient.incr(key);
      if (attempts === 1) {
        await redisClient.expire(key, windowSeconds);
      }
      if (attempts > max) {
        return res.status(429).json({ error: 'Admin account temporarily locked' });
      }
      return next();
    } catch (err) {
      logger.warn('Admin login per-email limiter failed', { error: err.message });
      return next();
    }
  }

  const now = Date.now();
  const entry = adminLoginLocal.get(key);
  if (!entry || entry.expiresAt <= now) {
    adminLoginLocal.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return next();
  }
  entry.count += 1;
  adminLoginLocal.set(key, entry);
  if (entry.count > max) {
    return res.status(429).json({ error: 'Admin account temporarily locked' });
  }
  return next();
}

export const billsLimiter = guardRateLimiter(
  rateLimit(
    limiterOptions({
      windowMs: 5 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_BILLS_MAX || 60),
    })
  )
);
