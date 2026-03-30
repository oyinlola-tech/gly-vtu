# GLY-VTU Security Hardening Implementation Checklist

**Purpose:** Step-by-step guide to implement critical security fixes from the audit report.

---

## Phase 1: CRITICAL (Production Blocking) - Week 1-2

### 1. Secret Management & Validation

- [ ] **Add Secret Validator to Server Startup**
  ```bash
  # File: backend/utils/secretValidator.js (ALREADY CREATED)
  # This file enforces all required secrets on startup
  ```

  ```javascript
  // Add to backend/server.js at the TOP of the file
  import { initializeSecurityValidation } from './utils/secretValidator.js';
  
  // Call BEFORE creating any Express app
  initializeSecurityValidation();
  
  const app = express();
  ```

- [ ] **Generate Production Secrets**
  ```bash
  # Generate new secrets using:
  node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
  node -e "console.log('JWT_ADMIN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
  node -e "console.log('COOKIE_ENC_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
  node -e "console.log('PII_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
  
  # Save these to .env (DO NOT COMMIT)
  ```

- [ ] **Remove All Default Secrets from Code**
  ```bash
  # Search for 'dev_secret_change_me' in codebase
  grep -r "dev_secret_change_me" backend/
  # Delete these lines - they will be caught by secretValidator
  ```

- [ ] **Verify .env is in .gitignore**
  ```bash
  cat .gitignore | grep -E "^\.env"
  # If not present, add:
  # .env
  # .env.local
  # .env.*.local
  ```

- [ ] **Update .env.example (NO secrets)**
  ```bash
  # Remove all actual secret values from .env.example
  # See SECURITY_AUDIT_REPORT.md Section 2.2 for template
  ```

- [ ] **Test Secret Validation**
  ```bash
  # Without .env, server should fail to start with clear error
  npm run dev
  # Should see: "❌ SECURITY VALIDATION FAILED"
  
  # With .env set correctly, should start successfully
  # Should see: "✅ Security validation passed"
  ```

---

### 2. Encrypt PII in Database

- [ ] **Add Encryption Utilities**
  ```bash
  # File: backend/utils/encryption.js (ALREADY CREATED)
  # This provides encryptPII, decryptPII functions
  ```

- [ ] **Create Database Migration**
  ```sql
  -- file: backend/docs/migrations/2026-03-30_pii_encryption.sql
  
  -- Add encrypted field versions
  ALTER TABLE users ADD COLUMN email_encrypted VARCHAR(500);
  ALTER TABLE users ADD COLUMN phone_encrypted VARCHAR(500);
  ALTER TABLE users ADD COLUMN full_name_encrypted VARCHAR(500);
  
  ALTER TABLE users ADD COLUMN address_encrypted VARCHAR(500);
  ALTER TABLE users ADD COLUMN kyc_payload_encrypted LONGTEXT;
  
  -- Migration script to encrypt existing data
  -- See SECURITY_AUDIT_REPORT.md for full migration details
  ```

- [ ] **Update Registration Endpoint**
  ```javascript
  // backend/routes/auth.js - Register endpoint
  import { encryptPII, encryptMultiplePII } from '../utils/encryption.js';
  
  router.post('/register', validateRequest(registrationSchema), async (req, res) => {
    const { email, phone, fullName, password } = req.validated;
    
    // Encrypt PII
    const encrypted = encryptMultiplePII({
      email: email.toLowerCase(),
      phone,
      fullName
    }, req.ip); // Use IP as context
    
    // Store hashed password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Insert with encrypted fields
    await pool.query(
      `INSERT INTO users (id, email_encrypted, phone_encrypted, full_name_encrypted, password_hash)
       VALUES (UUID(), ?, ?, ?, ?)`,
      [encrypted.email_encrypted, encrypted.phone_encrypted, encrypted.fullName_encrypted, hashedPassword]
    );
    
    // ... rest of handler
  });
  ```

- [ ] **Test PII Encryption**
  ```bash
  npm run test -- tests/security/encryption.test.js
  ```

---

### 3. Webhook Security - IP Whitelist & Idempotency

- [ ] **Enforce Webhook IP Whitelist**
  ```javascript
  // backend/routes/flutterwaveWebhook.js - Line ~25
  
  function isIpAllowed(req) {
    const allowedIps = (process.env.FLW_WEBHOOK_IPS || '').split(',').map(ip => ip.trim()).filter(Boolean);
    
    // PRODUCTION REQUIREMENT
    if (process.env.NODE_ENV === 'production' && allowedIps.length === 0) {
      logger.error('CRITICAL: FLW_WEBHOOK_IPS not configured in production');
      return false; // ✅ DENY by default
    }
    
    return allowedIps.includes(req.ip);
  }
  ```

- [ ] **Configure Flutterwave IPs in .env**
  ```bash
  # Get Flutterwave webhook IPs from: https://developer.flutterwave.com
  # Add to .env.production:
  FLW_WEBHOOK_IPS=192.xxx.xxx.xxx,192.yyy.yyy.yyy
  VTPASS_WEBHOOK_IPS=203.xxx.xxx.xxx,203.yyy.yyy.yyy
  ```

- [ ] **Implement Idempotency with Database Locking**
  ```javascript
  // backend/routes/flutterwaveWebhook.js - Process webhook
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();
    
    // Lock for reading/writing
    const [existing] = await conn.query(
      'SELECT id FROM transactions WHERE reference = ? FOR UPDATE SKIP LOCKED',
      [reference]
    );
    
    if (existing.length > 0) {
      await conn.commit();
      return res.json({ message: 'Already processed' });
    }
    
    // Insert transaction atomically
    await conn.query('INSERT INTO transactions (...) VALUES (...)');
    
    // Update wallet in same transaction
    await conn.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?');
    
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  ```

- [ ] **Test Webhook Idempotency**
  ```bash
  # Send same webhook twice - should only create one transaction
  npm run test -- tests/security/webhook-idempotency.test.js
  ```

---

### 4. Admin Login Rate Limiting

- [ ] **Update Rate Limiters**
  ```javascript
  // backend/middleware/rateLimiters.js
  
  export const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts maximum
    message: 'Too many admin login attempts. Try again after 15 minutes.',
  });
  
  export const adminLoginPerEmailLimiter = (req, res, next) => {
    const email = req.body.email?.toLowerCase();
    const key = `admin_login:${email}:${getClientIp(req)}`;
    
    redisClient.incr(key, (err, attempts) => {
      if (attempts === 1) redisClient.expire(key, 30 * 60); // 30 minutes
      if (attempts > 3) { // 3 attempts max per email
        return res.status(429).json({ error: 'Admin account temporarily locked' });
      }
      next();
    });
  };
  ```

- [ ] **Apply to Admin Login Route**
  ```javascript
  // backend/routes/adminAuth.js
  import { adminLoginLimiter, adminLoginPerEmailLimiter } from '../middleware/rateLimiters.js';
  
  router.post('/login', adminLoginPerEmailLimiter, adminLoginLimiter, async (req, res) => {
    // ... login logic
  });
  ```

- [ ] **Test Admin Rate Limiting**
  ```bash
  npm run test -- tests/security/rate-limiting.test.js
  ```

---

### 5. Add Validation Middleware to All Routes

- [ ] **Install Joi if not present**
  ```bash
  npm install joi
  ```

- [ ] **Use Request Validation Middleware**
  ```javascript
  // File: backend/middleware/requestValidation.js (ALREADY CREATED)
  import { validateRequest, registrationSchema, billPaymentSchema } from '../middleware/requestValidation.js';
  
  // Apply to routes
  router.post('/register', validateRequest(registrationSchema), registrationHandler);
  router.post('/bills/pay', validateRequest(billPaymentSchema), billPaymentHandler);
  ```

- [ ] **Import and use validation schemas in all routes**
  - [ ] backend/routes/auth.js
  - [ ] backend/routes/wallet.js
  - [ ] backend/routes/bills.js
  - [ ] backend/routes/cards.js
  - [ ] backend/routes/user.js

- [ ] **Run validation tests**
  ```bash
  npm run test -- tests/security/validation.test.js
  ```

---

## Phase 2: HIGH Priority - Week 2-4

### 6. CSRF Token Configuration

- [ ] **Update CSRF Middleware to use 'strict' SameSite**
  ```javascript
  // backend/middleware/csrf.js
  
  res.cookie('csrf_token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // Changed from 'lax'
    maxAge: 1000 * 60 * 60,
  });
  ```

- [ ] **Implement Per-Request Token Rotation for Money Transfers**
  ```javascript
  // backend/routes/wallet.js
  router.post('/transfer', csrfMiddleware, async (req, res) => {
    // Process transfer...
    
    // Rotate CSRF token for next request
    const newToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf_token', newToken, { /* ... */ });
    
    res.json({
      success: true,
      data: transferResult,
      csrfToken: newToken // Send to client
    });
  });
  ```

- [ ] **Test CSRF Protection**
  ```bash
  npm run test -- tests/security/csrf.test.js
  ```

---

### 7. Enhanced Logging & Error Handling

- [ ] **Update Logger Redaction**
  ```javascript
  // backend/utils/logger.js - Update redact() function
  // See SECURITY_AUDIT_REPORT.md Section 8.2 for complete function
  
  const sensitivePatterns = {
    'secret': /.+/,
    'token': /.+/,
    'password': /.+/,
    'email': /.+/,
    'phone': /.+/,
    'account_number': /.+/,
    'card_number': /.+/,
    'cvv': /.+/,
    'pin': /.+/,
    'otp': /.+/,
    'bvn': /.+/,
    // ... etc
  };
  ```

- [ ] **Replace all console.error with logger**
  ```bash
  # Find all console.error calls
  grep -r "console\.error" backend/
  
  # Replace with logger.error
  # Example:
  sendEmail({...}).catch(err => {
    logger.error('Email send failed', { error: err.message });
  });
  ```

- [ ] **Add Error Boundary Middleware**
  ```javascript
  // backend/middleware/errorHandler.js
  export function globalErrorHandler(err, req, res, next) {
    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method
    });
    
    res.status(500).json({
      error: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
  
  // In server.js, add at END of all routes:
  app.use(globalErrorHandler);
  ```

---

### 8. Token Cleanup Jobs

- [ ] **Initialize Token Cleanup on Server Start**
  ```javascript
  // backend/server.js
  import { TokenCleanupManager } from './utils/tokenCleanup.js';
  
  app.listen(PORT, () => {
    TokenCleanupManager.initializeCleanupJobs();
    logger.info(`Server listening on port ${PORT}`);
  });
  ```

- [ ] **Test Cleanup Job**
  ```bash
  npm run test -- tests/utils/token-cleanup.test.js
  ```

---

### 9. Payment Gateway API Key Management

- [ ] **Choose Secrets Management Strategy**
  - [ ] Option 1: AWS Secrets Manager (Production recommended)
  - [ ] Option 2: HashiCorp Vault
  - [ ] Option 3: Local encrypted .env (not recommended for production)

- [ ] **If using AWS Secrets Manager:**
  ```bash
  npm install @aws-sdk/client-secrets-manager
  ```

  ```javascript
  // backend/utils/secretsManager.js (See SECURITY_AUDIT_REPORT.md)
  import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
  
  export async function getSecret(secretName) {
    // Returns secret with caching
  }
  ```

  ```javascript
  // backend/utils/flutterwave.js - Updated
  import { getSecret } from './secretsManager.js';
  
  export async function chargeCard(cardData) {
    const key = await getSecret('flutterwave-secret-key');
    // Use key for API call
  }
  ```

- [ ] **Store Secrets in AWS Secrets Manager**
  ```bash
  aws secretsmanager create-secret \
    --name "gly-vtu/flutterwave-secret-key" \
    --secret-string "sk_live_xxxxxxxxxxxx"
  
  aws secretsmanager create-secret \
    --name "gly-vtu/vtpass-api-key" \
    --secret-string "your-vtpass-key"
  ```

---

## Phase 3: MEDIUM Priority - Month 1

### 10. Database Query Whitelisting

- [ ] **Add Whitelist for User Update Fields**
  ```javascript
  // backend/routes/user.js
  const ALLOWED_UPDATE_FIELDS = {
    'fullName': 'full_name',
    'email': 'email',
    'phone': 'phone',
    'address': 'address',
    'city': 'city',
    'state': 'state'
  };
  
  // Only allow updates to whitelisted fields
  for (const [field, dbCol] of Object.entries(ALLOWED_UPDATE_FIELDS)) {
    if (req.body[field]) {
      updates.push(`${dbCol} = ?`);
      values.push(req.body[field]);
    }
  }
  ```

---

### 11. KYC Payload Validation

- [ ] **Add KYC Validation Schema**
  ```javascript
  // backend/middleware/requestValidation.js
  // kycSchema is already defined - see SECURITY_AUDIT_REPORT.md
  
  export const kycSchema = Joi.object({
    bvn: Joi.string().required().length(11).pattern(/^\d+$/),
    // ... other fields
  });
  ```

- [ ] **Apply to KYC Endpoint**
  ```javascript
  // backend/routes/user.js
  router.post('/kyc/submit', 
    requireUser, 
    validateRequest(kycSchema), 
    async (req, res) => {
      // KYC data is now validated
      const { validated } = req;
    }
  );
  ```

---

### 12. Enable HTTP Security Headers

- [ ] **Install Helmet**
  ```bash
  npm install helmet helmet-csp
  ```

- [ ] **Apply Security Headers**
  ```javascript
  // backend/server.js
  import helmet from 'helmet';
  import csp from 'helmet-csp';
  
  app.use(helmet({
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
  
  app.use(csp({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'https:'],
    }
  }));
  ```

---

### 13. Account Lockout Mechanism

- [ ] **Add Database Columns**
  ```sql
  ALTER TABLE users ADD COLUMN failed_login_count INT DEFAULT 0;
  ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL;
  ALTER TABLE users ADD COLUMN last_login_attempt TIMESTAMP NULL;
  
  ALTER TABLE admins ADD COLUMN failed_login_count INT DEFAULT 0;
  ALTER TABLE admins ADD COLUMN locked_until TIMESTAMP NULL;
  ```

- [ ] **Update Login Endpoint**
  ```javascript
  // backend/routes/auth.js
  
  // Check if account is locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(403).json({ error: 'Account is locked. Try again later.' });
  }
  
  // On failed login, increment counter
  if (password mismatch) {
    count++;
    if (count >= 5) {
      lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 mins
    }
    await pool.query('UPDATE users SET failed_login_count = ?, locked_until = ?', [count, lockedUntil]);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // On successful login, clear counter
  await pool.query('UPDATE users SET failed_login_count = 0, locked_until = NULL');
  ```

---

## Phase 4: UI/UX Features (Ongoing)

### 14. Create New Security-Focused Pages

- [ ] **Security Dashboard** (`/dashboard/security`)
  - [ ] Display device ID and active sessions
  - [ ] Login history with IP addresses
  - [ ] Option to logout from other devices
  - [ ] Two-factor authentication status

- [ ] **Change Password Page** (`/settings/password`)
  - [ ] Current password verification
  - [ ] Password strength indicator
  - [ ] Confirmation requirement

- [ ] **Two-Factor Authentication Setup** (`/settings/2fa`)
  - [ ] QR code for authenticator app
  - [ ] Backup codes generation
  - [ ] Recovery options

- [ ] **KYC Verification Flow** (`/verification/kyc`)
  - [ ] Step-by-step form with validation
  - [ ] Status tracker
  - [ ] Rejection reason display

- [ ] **Transaction History with Filters** (`/transactions`)
  - [ ] Date range filtering
  - [ ] Amount range filtering
  - [ ] Export to CSV/PDF

- [ ] **Card Management** (`/settings/cards`)
  - [ ] Add/remove/update cards
  - [ ] Lock card temporarily
  - [ ] View activity log

---

## Testing & Validation

### Run Security Tests
```bash
# Run all security tests
npm run test -- tests/security/

# Individual tests
npm run test -- tests/security/jwt-secrets.test.js
npm run test -- tests/security/csrf.test.js
npm run test -- tests/security/validation.test.js
npm run test -- tests/security/rate-limiting.test.js
npm run test -- tests/security/encryption.test.js
npm run test -- tests/security/webhook-idempotency.test.js
npm run test -- tests/security/sql-injection.test.js
```

### Manual Testing
```bash
# 1. Test secret validation (without .env)
npm run dev
# Should fail with clear error message

# 2. Test rate limiting
for i in {1..6}; do curl -X POST http://localhost:3000/api/admin/login; done
# 6th request should be rate limited

# 3. Test CSRF protection
curl -X POST http://localhost:3000/api/wallet/transfer -d '{"amount": 1000}'
# Should fail: CSRF token missing

# 4. Test SQL injection
curl -X GET 'http://localhost:3000/api/user/profile?id=1" OR "1"="1'
# Should be rejected by validation

# 5. Test input validation
curl -X POST http://localhost:3000/api/bills/pay \
  -H "Content-Type: application/json" \
  -d '{"amount": -100}'
# Should fail: amount validation
```

---

## Troubleshooting

### Issue: Secret Validation Fails in Development
**Solution:** Create .env file with required secrets (see Phase 1 step 1)

### Issue: PII Encryption Breaks Existing Queries
**Solution:** 
1. Use database migration to copy data to encrypted fields
2. Update all READ queries to use encrypted fields
3. Gradually sunset old plaintext fields

### Issue: Webhook Tests Fail with Idempotency Locking
**Solution:** 
1. Use separate database connection for each test
2. Ensure `FOR UPDATE SKIP LOCKED` is working
3. Check that transactions are committing properly

### Issue: Rate Limiting Not Working
**Solution:**
1. Verify Redis is running: `redis-cli ping`
2. Check that RedisStore is configured correctly
3. Clear Redis cache: `redis-cli FLUSHDB`

---

## Metrics to Monitor

After implementing these fixes, monitor:

1. **Authentication Security**
   - Failed login attempts (should spike if under attack)
   - Account lockouts (normal: <5/day)
   - Admin access patterns

2. **Database Health**
   - Expired token cleanup: Should remove 1000+ tokens daily
   - Query performance: Monitor for injection attempts

3. **Payment Processing**
   - Duplicate webhook processing: Should be 0
   - Payment success rate: Should remain 99%+
   - Webhook delivery time: Should be <1 second

4. **Encryption Overhead**
   - PII encryption/decryption latency: Should be <10ms
   - Database size: Encrypted fields are ~30% larger

---

## Sign-Off Checklist

- [ ] All Phase 1 items completed and tested
- [ ] All Phase 2 items completed and tested
- [ ] Security audit findings resolved
- [ ] No hardcoded secrets in code
- [ ] All sensitive data encrypted
- [ ] All endpoints validated
- [ ] Rate limiting configured
- [ ] Error messages don't leak sensitive info
- [ ] HTTPS enabled in production
- [ ] HSTS headers configured
- [ ] CSP headers configured
- [ ] Webhook security enabled
- [ ] Admin accounts require TOTP

**Completion Date:** _______________
**Reviewed By:** _______________
**Deployed To Production:** _______________
