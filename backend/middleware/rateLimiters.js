import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || '';
const isProd = process.env.NODE_ENV === 'production';
let redisClient = null;
let redisStore = null;
let redisConnected = false;

if (REDIS_URL) {
  redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => {
    console.error('Redis rate limiter error:', err.message);
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
    console.log('Redis rate limiter connected');
  });
  
  redisClient.connect().catch((err) => {
    console.error('Redis connection failed:', err.message);
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
    skip: (req) => {
      // In production with Redis down, optionally skip rate limiting to allow traffic
      // WARNING: This is a fallback and makes your app vulnerable to DoS
      if (isProd && REDIS_URL && !redisConnected) {
        logger.warn('Rate limiter skipped due to Redis unavailability', {
          ip: req.ip,
          path: req.path,
          severity: 'high'
        });
        return true; // Skip rate limiting (DANGEROUS but allows graceful degradation)
      }
      return false;
    },
    ...(redisStore ? { store: redisStore } : {}),
    ...extra,
  };
}

export const authLimiter = rateLimit(
  limiterOptions({
    windowMs: 10 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_AUTH_MAX || 30),
  })
);

export const otpLimiter = rateLimit(
  limiterOptions({
    windowMs: 10 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_OTP_MAX || 10),
  })
);

export const webhookLimiter = rateLimit(
  limiterOptions({
    windowMs: 60 * 1000,
    max: Number(process.env.RATE_LIMIT_WEBHOOK_MAX || 120),
  })
);

export const adminAuthLimiter = rateLimit(
  limiterOptions({
    windowMs: 10 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_ADMIN_AUTH_MAX || 20),
  })
);

export const adminLoginLimiter = rateLimit(
  limiterOptions({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_ADMIN_LOGIN_MAX || 5),
    keyGenerator: (req) => {
      const email = String(req.body?.email || '').toLowerCase().trim();
      return `${req.ip || 'unknown'}:${email || 'no-email'}`;
    },
  })
);

export const billsLimiter = rateLimit(
  limiterOptions({
    windowMs: 5 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_BILLS_MAX || 60),
  })
);
