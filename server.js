import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import csurf from 'csurf';
import { initDatabase } from './backend/config/db.js';
import authRoutes from './backend/routes/auth.js';
import adminAuthRoutes from './backend/routes/adminAuth.js';
import userRoutes from './backend/routes/user.js';
import walletRoutes from './backend/routes/wallet.js';
import billsRoutes from './backend/routes/bills.js';
import transactionsRoutes from './backend/routes/transactions.js';
import adminUsersRoutes from './backend/routes/adminUsers.js';
import adminBillsRoutes from './backend/routes/adminBills.js';
import adminTransactionsRoutes from './backend/routes/adminTransactions.js';
import adminManagementRoutes from './backend/routes/adminManagement.js';
import adminAuditRoutes from './backend/routes/adminAudit.js';
import adminSecurityEventsRoutes from './backend/routes/adminSecurityEvents.js';
import adminAnomaliesRoutes from './backend/routes/adminAnomalies.js';
import adminComplianceRoutes from './backend/routes/adminCompliance.js';
import adminFinanceRoutes from './backend/routes/adminFinance.js';
import flutterwaveWebhookRoutes from './backend/routes/flutterwaveWebhook.js';
import vtpassWebhookRoutes from './backend/routes/vtpassWebhook.js';
import adminVtpassRoutes from './backend/routes/adminVtpass.js';
import adminFlutterwaveRoutes from './backend/routes/adminFlutterwave.js';
import cardsRoutes from './backend/routes/cards.js';
import banksRoutes from './backend/routes/banks.js';
import notificationsRoutes from './backend/routes/notifications.js';
import adminNotificationsRoutes from './backend/routes/adminNotifications.js';
import conversationsRoutes from './backend/routes/conversations.js';
import adminConversationsRoutes from './backend/routes/adminConversations.js';
import { refreshBankCache } from './backend/utils/bankCache.js';

import { authLimiter, adminAuthLimiter, webhookLimiter } from './backend/middleware/rateLimiters.js';
import { csrfMiddleware } from './backend/middleware/csrf.js';
import { attachRealtime } from './backend/utils/realtime.js';
import { pruneWebhookEvents, pruneAuditLogs, pruneSecurityEvents } from './backend/utils/retention.js';
import { logger } from './backend/utils/logger.js';
import { SecretValidator } from './backend/utils/secretValidator.js';
import { TokenCleanupManager } from './backend/utils/tokenCleanup.js';
import { globalErrorHandler } from './backend/middleware/errorHandler.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.disable('x-powered-by');

const isProd = process.env.NODE_ENV === 'production';
let dbReady = false;
let dbCheckedAt = null;
let dbError = null;
// CRITICAL: Validate all required secrets are set and strong in production
if (isProd) {
  const validateSecret = (name, value) => {
    if (!value || value === 'dev_secret_change_me' || value.length < 32) {
      logger.error(
        `${name} must be set to a strong value (≥32 chars) in production. ` +
        `Do not use default values or short strings.`
      );
      process.exit(1);
    }
  };

  // Validate all 4 critical secrets are separate and strong
  validateSecret('JWT_SECRET', process.env.JWT_SECRET);
  validateSecret('JWT_ADMIN_SECRET', process.env.JWT_ADMIN_SECRET);
  validateSecret('PII_ENCRYPTION_KEY', process.env.PII_ENCRYPTION_KEY);
  validateSecret('COOKIE_ENC_SECRET', process.env.COOKIE_ENC_SECRET);
  
  // Webhook IP whitelist is mandatory in production
  if (!process.env.FLW_WEBHOOK_IPS) {
    logger.error(
      'FLW_WEBHOOK_IPS must be set in production. ' +
      'Obtain Flutterwave webhook IP whitelists from webhook docs and set as comma-separated values.'
    );
    process.exit(1);
  }

  // Verify secrets are unique (defense in depth)
  const secretsArray = [
    process.env.JWT_SECRET,
    process.env.JWT_ADMIN_SECRET,
    process.env.PII_ENCRYPTION_KEY,
    process.env.COOKIE_ENC_SECRET
  ];
  if (new Set(secretsArray).size < secretsArray.length) {
    logger.error(
      'ERROR: Multiple secrets must have different values in production. ' +
      'Each secret serves a different purpose: JWT_SECRET, JWT_ADMIN_SECRET, PII_ENCRYPTION_KEY, COOKIE_ENC_SECRET'
    );
    process.exit(1);
  }
}
const trustProxy = Number(process.env.TRUST_PROXY || 0);
if (trustProxy) {
  app.set('trust proxy', trustProxy);
}

const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const extraOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0)
  : [...defaultOrigins, ...extraOrigins];
const normalizedOrigins = allowedOrigins.filter((o) => o !== '*');

// SECURITY: Validate CORS configuration in production
if (isProd) {
  if (!normalizedOrigins.length) {
    logger.error(
      'CORS_ORIGIN must be set to specific domain(s) in production (not wildcard). ' +
      'Example: CORS_ORIGIN=https://example.com,https://admin.example.com'
    );
    process.exit(1);
  }
  
  // Warn about HTTP origins in production (should use HTTPS)
  const httpOrigins = normalizedOrigins.filter((o) => o.startsWith('http://'));
  if (httpOrigins.length) {
    logger.warn(
      `WARNING: HTTP origins detected in production CORS config: ${httpOrigins.join(', ')}. ` +
      `For production, use HTTPS origins only.`
    );
  }
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin and non-browser requests (no Origin header)
    if (!origin) {
      return callback(null, true);
    }

    if (normalizedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  maxAge: 600,
};

const cspOrigins = normalizedOrigins.length ? normalizedOrigins : defaultOrigins;
const wsOrigins = cspOrigins.map((o) =>
  o.startsWith('https://') ? o.replace('https://', 'wss://') : o.replace('http://', 'ws://')
);
const helmetConfig = isProd
  ? {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // SECURITY: Removed 'unsafe-inline' from scriptSrc to prevent XSS attacks
          // All scripts must be loaded from the app origin (Vite builds generate unique hashes)
          scriptSrc: ["'self'"],
          // SECURITY: Keep unsafe-inline for styles (Tailwind builds inline critical CSS)
          // Consider moving to external stylesheet + nonce in future
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", ...cspOrigins, ...wsOrigins],
          // SECURITY: Disallow plugins and object embedding (reduces attack surface)
          objectSrc: ["'none'"],
          baseSrc: ["'self'"],
          // SECURITY: Require iframe to be same-origin for 3D Secure and payment flows
          frameSrc: ["'self'"],
          // SECURITY: Restrict form submission to same-origin
          formAction: ["'self'"],
          // SECURITY: Disable Web Worker loading from external sources
          workerSrc: ["'self'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    }
  : undefined;

app.use(helmet(helmetConfig));
app.use(cors(corsOptions));
app.use(
  express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(cookieParser());
app.use(
  csurf({
    cookie: true,
    value: (req) => req.headers['x-csrf-token'] || req.body?._csrf || req.query?._csrf,
  })
);
app.use(csrfMiddleware);

// Silence Chrome DevTools probe that can show up as a 404 + CSP warning in console.
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(204).end();
});

// Block direct browser access to /api/* (public surface is /app/*).
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  const secFetchSite = req.headers['sec-fetch-site'];
  const secFetchMode = req.headers['sec-fetch-mode'];
  const internal = req.headers['x-internal-request'] === '1';
  if (internal || (!origin && !secFetchSite && !secFetchMode)) {
    return next();
  }
  return res.status(403).json({ error: 'Direct browser access blocked. Use /app/*.' });
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_GLOBAL_MAX || 600),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

const pageLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PAGES_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
});

const userDir = path.join(__dirname, 'frontend', 'user');
const adminDir = path.join(__dirname, 'frontend', 'admin');

app.use('/', express.static(userDir));
app.use('/admin', express.static(adminDir));

if (!isProd) {
  app.get('/dev-status', (req, res) => {
    res.json({ dbReady, dbCheckedAt, dbError });
  });
}

const userPages = [
  'splash',
  'login',
  'register',
  'dashboard',
  'wallet',
  'send',
  'receive',
  'bills',
  'transactions',
  'transactions/history',
  'kyc',
  'kyc-status',
  'settings',
  'security-center',
  'security/dashboard',
  'security/password',
  'security/activity',
  'security/sessions',
  'security/biometric',
  'auth/setup-2fa',
  'settings/devices',
  'account/closure',
  'account/closure/cancel',
  'account/data-export',
  'verify-device',
  'forgot-password',
  'reset-password',
  'terms',
  'privacy',
  'support',
  'faq',
  'compliance',
  'disputes',
  'maintenance',
  'offline',
  'error/400',
  'error/403',
  'error/404',
  'error/500',
];

userPages.forEach((page) => {
  app.get(`/${page}`, pageLimiter, (req, res) => {
    res.sendFile(path.join(userDir, `${page}.html`));
  });
});

// Dynamic user routes
app.get('/transactions/:id', pageLimiter, (req, res) => {
  res.sendFile(path.join(userDir, 'transactions.html'));
});
app.get('/transactions/:id/receipt', pageLimiter, (req, res) => {
  res.sendFile(path.join(userDir, 'transactions.html'));
});
app.get('/transaction/:id', pageLimiter, (req, res) => {
  res.sendFile(path.join(userDir, 'transactions.html'));
});

app.get('/', pageLimiter, (req, res) => res.redirect('/splash'));
app.get('/admin', pageLimiter, (req, res) => res.redirect('/admin/splash'));

const adminPages = [
  'splash',
  'login',
  'forgot-password',
  'reset-password',
  'dashboard',
  'finance',
  'users',
  'admins',
  'bills',
  'pricing',
  'transactions',
  'settings',
  'audit',
  'security-events',
  'anomalies',
  'compliance',
  'review',
  'vtpass',
];

adminPages.forEach((page) => {
  app.get(`/admin/${page}`, pageLimiter, (req, res) => {
    res.sendFile(path.join(adminDir, `${page}.html`));
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/banks', banksRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/cards', cardsRoutes);

app.use('/api/admin/auth', adminAuthLimiter, adminAuthRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/bills', adminBillsRoutes);
app.use('/api/admin/transactions', adminTransactionsRoutes);
app.use('/api/admin/manage', adminManagementRoutes);
app.use('/api/admin/audit', adminAuditRoutes);
app.use('/api/admin/security-events', adminSecurityEventsRoutes);
app.use('/api/admin/anomalies', adminAnomaliesRoutes);
app.use('/api/admin/compliance', adminComplianceRoutes);
app.use('/api/admin/finance', adminFinanceRoutes);
app.use('/api/admin/notifications', adminNotificationsRoutes);
app.use('/api/admin/conversations', adminConversationsRoutes);
app.use('/api/admin/vtpass', adminVtpassRoutes);
app.use('/api/admin/flutterwave', adminFlutterwaveRoutes);
app.use('/api/flutterwave/webhook', webhookLimiter, flutterwaveWebhookRoutes);
app.use('/api/vtpass/webhook', webhookLimiter, vtpassWebhookRoutes);

// Backend-only proxy layer for frontend calls
app.use('/app/api/auth', authLimiter, authRoutes);
app.use('/app/api/user', userRoutes);
app.use('/app/api/wallet', walletRoutes);
app.use('/app/api/bills', billsRoutes);
app.use('/app/api/transactions', transactionsRoutes);
app.use('/app/api/banks', banksRoutes);
app.use('/app/api/notifications', notificationsRoutes);
app.use('/app/api/conversations', conversationsRoutes);
app.use('/app/api/cards', cardsRoutes);

app.use('/app/admin/api/auth', adminAuthLimiter, adminAuthRoutes);
app.use('/app/admin/api/users', adminUsersRoutes);
app.use('/app/admin/api/bills', adminBillsRoutes);
app.use('/app/admin/api/transactions', adminTransactionsRoutes);
app.use('/app/admin/api/manage', adminManagementRoutes);
app.use('/app/admin/api/audit', adminAuditRoutes);
app.use('/app/admin/api/security-events', adminSecurityEventsRoutes);
app.use('/app/admin/api/anomalies', adminAnomaliesRoutes);
app.use('/app/admin/api/compliance', adminComplianceRoutes);
app.use('/app/admin/api/finance', adminFinanceRoutes);
app.use('/app/admin/api/notifications', adminNotificationsRoutes);
app.use('/app/admin/api/conversations', adminConversationsRoutes);
app.use('/app/admin/api/vtpass', adminVtpassRoutes);
app.use('/app/admin/api/flutterwave', adminFlutterwaveRoutes);
app.use('/app/api/flutterwave/webhook', webhookLimiter, flutterwaveWebhookRoutes);
app.use('/app/api/vtpass/webhook', webhookLimiter, vtpassWebhookRoutes);

const enableSwagger = process.env.ENABLE_SWAGGER !== 'false';
async function setupSwaggerDocs(appInstance) {
  if (!enableSwagger) return;
  const swaggerPath = path.join(__dirname, 'backend', 'docs', 'swagger-output.json');
  let swaggerDocument = null;

  try {
    const raw = fs.readFileSync(swaggerPath, 'utf-8');
    swaggerDocument = JSON.parse(raw);
  } catch (_) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('Swagger file missing. Run `npm run swagger` to generate it.');
      return;
    }
    try {
      const { generateSwagger } = await import('./backend/docs/swagger.js');
      await generateSwagger();
      const raw = fs.readFileSync(swaggerPath, 'utf-8');
      swaggerDocument = JSON.parse(raw);
    } catch (genErr) {
      logger.warn('Swagger generation failed:', genErr.message);
      return;
    }
  }

  appInstance.use('/api-docs', (req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' 'unsafe-inline' https: http: data:; img-src 'self' data: https: http:; script-src 'self' 'unsafe-inline' https: http:; style-src 'self' 'unsafe-inline' https: http:; font-src 'self' data: https: http:; connect-src 'self' https: http:;"
    );
    next();
  });
  appInstance.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }));
  appInstance.get('/api-docs.json', (req, res) => res.json(swaggerDocument));
}

const swaggerReady = setupSwaggerDocs(app);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS blocked' });
  }
  return globalErrorHandler(err, req, res, next);
});

const PORT = Number(process.env.PORT || 3000);
const server = http.createServer(app);
attachRealtime(server);

async function startServer() {
  // Validate all required secrets before any other operations
  try {
    SecretValidator.validateSecrets();
  } catch (err) {
    logger.error('Secret validation failed', { error: logger.format(err) });
    process.exit(1);
  }

  try {
    await initDatabase();
    dbReady = true;
    dbCheckedAt = new Date().toISOString();
    dbError = null;
    
    // Initialize token cleanup jobs after successful database connection
    TokenCleanupManager.initializeCleanupJobs();
  } catch (err) {
    dbReady = false;
    dbCheckedAt = new Date().toISOString();
    dbError = err?.message || String(err);
    if (isProd) {
      logger.error('Database init failed', { error: logger.format(err) });
      process.exit(1);
    }
    logger.warn('Database init failed (dev mode). Running UI without DB.');
  }

  await swaggerReady;
  server.listen(PORT, () => {
    console.log(`GLY VTU API running on http://localhost:${PORT}`);
  });

  if (!dbReady) return;

  const banksRefreshInterval = Number(process.env.BANKS_REFRESH_INTERVAL_MS || 21600000);
  setInterval(() => {
    refreshBankCache().catch((err) =>
      logger.warn('Bank cache refresh failed', { error: logger.format(err) })
    );
  }, banksRefreshInterval);
  refreshBankCache().catch((err) =>
    logger.warn('Bank cache initial refresh failed', { error: logger.format(err) })
  );

  const retentionInterval = 24 * 60 * 60 * 1000;
  setInterval(() => {
    pruneWebhookEvents().catch((err) =>
      logger.warn('Webhook retention prune failed', { error: logger.format(err) })
    );
    pruneAuditLogs().catch((err) =>
      logger.warn('Audit retention prune failed', { error: logger.format(err) })
    );
    pruneSecurityEvents().catch((err) =>
      logger.warn('Security retention prune failed', { error: logger.format(err) })
    );
  }, retentionInterval);
  pruneWebhookEvents().catch((err) =>
    logger.warn('Webhook retention initial prune failed', { error: logger.format(err) })
  );
  pruneAuditLogs().catch((err) =>
    logger.warn('Audit retention initial prune failed', { error: logger.format(err) })
  );
  pruneSecurityEvents().catch((err) =>
    logger.warn('Security retention initial prune failed', { error: logger.format(err) })
  );

  // VTpass and Flutterwave webhooks handle async updates
}

startServer();

