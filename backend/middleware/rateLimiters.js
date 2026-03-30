import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || '';
let redisClient = null;
let redisStore = null;

if (REDIS_URL) {
  redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => {
    console.error('Redis rate limiter error:', err.message);
  });
  redisClient.connect().catch((err) => {
    console.error('Redis connection failed:', err.message);
  });
  redisStore = new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  });
}

function limiterOptions(extra) {
  return {
    standardHeaders: true,
    legacyHeaders: false,
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
