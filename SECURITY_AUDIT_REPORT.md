# GLY-VTU Fintech Application - Comprehensive Security Audit Report
**Date:** March 30, 2026  
**Scope:** Complete fintech MFB platform with bill payments, remittances, and wallet transactions  
**Risk Level:** HIGH - Multiple critical vulnerabilities requiring immediate remediation

---

## Executive Summary

GLY-VTU is a sophisticated fintech platform handling sensitive Nigerian financial transactions ($0-∞ USD values daily). The application implements **strong foundational security** (JWT auth, TOTP, webhook signatures) but contains **multiple critical vulnerabilities** affecting:

- **Authentication & Authorization** (token forgery risk, weak rate limiting)
- **API Key Management** (plaintext credentials, no rotation)
- **CSRF Protection** (weak sameSite config, weak token rotation)
- **Data Encryption** (PII & financial data stored plaintext)
- **Payment Integration** (webhook bypass risks, race conditions)

---

## Vulnerability Summary Matrix

| Severity | Issue | Category | Impact |
|----------|-------|----------|--------|
| **CRITICAL** | Default hardcoded JWT secrets | Auth | Token forgery, account takeover |
| **CRITICAL** | Plaintext payment gateway credentials | API Keys | Wallet hijacking, fund theft |
| **CRITICAL** | Optional webhook IP whitelist | Payment Integration | Fraudulent transaction injection |
| **HIGH** | No encryption for PII/financial data | Data Protection | GDPR violation, data breach exposure |
| **HIGH** | Idempotency race condition in webhooks | Payment Integration | Double-charging users |
| **HIGH** | Insufficient input validation | Injection Risks | Data corruption, fraud |
| **MEDIUM** | Weak CSRF token management | CSRF | Cross-site attacks on money transfers |
| **MEDIUM** | Expired token cleanup missing | Token Management | Database bloat, performance degradation |
| **MEDIUM** | Console.error bypasses logger | Logging | Sensitive data exposure in logs |
| **MEDIUM** | Account lockout bypass via window reset | Auth | Brute-force attacks possible |

---

## SECTION 1: AUTHENTICATION & AUTHORIZATION VULNERABILITIES

### 1.1 CRITICAL: Default Hardcoded JWT Secrets

**Files Affected:**
- `server.js`
- `backend/routes/auth.js`
- `backend/routes/adminAuth.js`
- `backend/utils/secureCookie.js`

**Current Code Problem:**
```javascript
// server.js
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET || 'dev_secret_change_me';

// secureCookie.js
const DEFAULT_SECRET = process.env.COOKIE_ENC_SECRET || process.env.JWT_SECRET || 'dev_secret_change_me';
```

**Attack Scenario:**
1. Attacker discovers the hardcoded secret is 'dev_secret_change_me' (published in repo examples)
2. Uses any JWT library to forge tokens: `jwt.sign({id: targetUserId, role: 'admin'}, 'dev_secret_change_me')`
3. Gains access to victim's account or admin panel

**Impact:** CRITICAL - Complete authentication bypass, full account takeover

**Remediation - Step 1: Remove All Defaults**
```javascript
// server.js - BEFORE
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// server.js - AFTER
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required and must be at least 32 characters');
}

if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters for security');
}

const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET;
if (!JWT_ADMIN_SECRET) {
  throw new Error('JWT_ADMIN_SECRET environment variable is required and must be unique from JWT_SECRET');
}

if (JWT_ADMIN_SECRET === JWT_SECRET) {
  throw new Error('JWT_ADMIN_SECRET must be different from JWT_SECRET');
}

if (JWT_ADMIN_SECRET.length < 32) {
  throw new Error('JWT_ADMIN_SECRET must be at least 32 characters for security');
}
```

**Remediation - Step 2: Generate Cryptographically Secure Secrets**

Add this to your `.env.production`:
```bash
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
JWT_ADMIN_SECRET=z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4z3y2x1w0v9u8t7
COOKIE_ENC_SECRET=5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5

# Generate unique secrets for TOTP, OTP, refresh tokens
TOTP_WINDOW_SECRET=your_unique_totp_secret_32_chars_min
```

**Implementation Steps:**
1. Update `server.js` to throw errors on missing secrets
2. Do the same for `backend/utils/secureCookie.js`
3. Update all environment variable checks to be mandatory in production
4. Add a startup validation script

**Test:** Restart the application without setting secrets - it should fail immediately with clear error messages.

---

### 1.2 HIGH: Missing Login Rate Limiting for Admin Accounts

**Current Code:**
```javascript
// backend/routes/adminAuth.js - Line 45
router.post('/login', otpLimiter, async (req, res) => {
  // Uses generic otpLimiter (10 requests/10 min)
  // Should use stricter limit for admin accounts
```

**Problem:** Admin accounts handle critical operations (fund transfers, KYC approvals, user management). Using generic 10 requests/10 min allows 1,440 login attempts per day.

**Fix:**

```javascript
// backend/middleware/rateLimiters.js - ADD THIS

export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many admin login attempts. Try again after 15 minutes.',
  standardHeaders: true,
  skip: (req) => {
    // Only apply to admin login, not user login
    return req.path !== '/api/admin/login';
  }
});

// More aggressive: per-IP per-admin-email
export const adminLoginPerEmailLimiter = (req, res, next) => {
  const email = req.body.email?.toLowerCase();
  if (!email) return next();
  
  const key = `admin_login:${email}:${getClientIp(req)}`;
  const limit = 3; // 3 attempts per email per IP
  const windowMs = 30 * 60 * 1000; // 30 minutes
  
  redisClient.incr(key, (err, attempts) => {
    if (attempts === 1) redisClient.expire(key, Math.ceil(windowMs / 1000));
    if (attempts > limit) {
      return res.status(429).json({
        error: 'Admin account locked. Contact support@gly-vtu.com',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    next();
  });
};
```

**Update Route:**
```javascript
// backend/routes/adminAuth.js
import { adminLoginLimiter, adminLoginPerEmailLimiter } from '../middleware/rateLimiters.js';

router.post('/login', adminLoginPerEmailLimiter, adminLoginLimiter, async (req, res) => {
  // ... existing code
  // On failed attempt:
  const [user] = await pool.query('SELECT id FROM admins WHERE email = ?', [email]);
  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    // Count failed attempts
    const key = `admin_login_failed:${email}`;
    const attempts = await redisClient.incr(key);
    if (attempts === 1) await redisClient.expire(key, 30 * 60); // 30 min window
    
    if (attempts >= 3) {
      // Lock account
      await pool.query('UPDATE admins SET locked_until = ? WHERE email = ?', 
        [new Date(Date.now() + 30 * 60 * 1000), email]);
    }
    
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Clear failed attempts on success
  await redisClient.del(`admin_login_failed:${email}`);
});
```

---

### 1.3 MEDIUM: Account Lockout Bypass via Sliding Window

**Current Code:**
```javascript
// backend/routes/auth.js - Lines 156-165
const LOGIN_LOCK_WINDOW_MINUTES = Number(process.env.LOGIN_LOCK_WINDOW_MINUTES || 15);
if (withinWindow) {
  nextAttempts = lockCount + 1;
} else {
  nextAttempts = 1; // ❌ RESET on new window - allows bypass
}
```

**Attack:** Attacker can space login attempts 15 minutes apart, making 4 attempts per hour (96 per day).

**Fix 1: Use Absolute Time Lockout**
```javascript
// backend/utils/validation.js - ADD

export async function enforceLoginLockout(email) {
  const key = `login_lock:${email}`;
  const [user] = await pool.query(
    'SELECT locked_until FROM users WHERE email = ?', [email]
  );
  
  if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new Error(`Account locked until ${user.locked_until.toISOString()}`);
  }
  
  return true;
}

export async function recordLoginFailure(email) {
  const [user] = await pool.query(
    'SELECT failed_login_count, last_login_attempt FROM users WHERE email = ?', [email]
  );
  
  if (!user) return;
  
  let count = user.failed_login_count || 0;
  let now = new Date();
  let lastAttempt = user.last_login_attempt ? new Date(user.last_login_attempt) : null;
  
  // Reset counter if outside 15-minute window
  if (lastAttempt && (now - lastAttempt) > 15 * 60 * 1000) {
    count = 1;
  } else {
    count++;
  }
  
  // Lock account for 30 minutes after 5 failed attempts
  let lockedUntil = null;
  if (count >= 5) {
    lockedUntil = new Date(now.getTime() + 30 * 60 * 1000);
  }
  
  await pool.query(
    `UPDATE users SET failed_login_count = ?, last_login_attempt = ?, locked_until = ? WHERE email = ?`,
    [count, now, lockedUntil, email]
  );
  
  return { count, lockedUntil };
}
```

**Use in Login Route:**
```javascript
// backend/routes/auth.js
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  
  // Check if account is locked
  try {
    await enforceLoginLockout(email);
  } catch (err) {
    return res.status(403).json({ error: err.message });
  }
  
  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  
  if (!users.length || !await bcrypt.compare(password, users[0].password_hash)) {
    const result = await recordLoginFailure(email);
    return res.status(401).json({
      error: 'Invalid credentials',
      attemptsRemaining: Math.max(0, 5 - result.count)
    });
  }
  
  // Success: clear failed attempts
  await pool.query(
    'UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?',
    [users[0].id]
  );
  
  // ... continue with login
});
```

---

### 1.4 MEDIUM: Unclear Admin TOTP Enforcement

**Current Code:**
```javascript
// backend/routes/adminAuth.js
if (!admin.totp_secret || !admin.totp_enabled) {
  // Returns 403 but unclear if grace period exists
  return res.status(403).json({ error: 'Two-Factor Authentication (TOTP) is required...' });
}
```

**Issue:** No database constraint enforces `totp_enabled` on all admin accounts.

**Fix: Database-Level Enforcement**

```sql
-- Add database constraint (Run migration)
ALTER TABLE admins ADD CONSTRAINT admin_totp_required CHECK (
  (@require_totp := (SELECT value FROM settings WHERE key = 'require_admin_totp') = '1')
  AND (
    CASE 
      WHEN @require_totp THEN totp_enabled = true AND totp_secret IS NOT NULL
      ELSE 1=1
    END
  )
);

-- Simpler: Create trigger
CREATE TRIGGER enforce_admin_totp_before_update
BEFORE UPDATE ON admins
FOR EACH ROW
BEGIN
  IF NEW.totp_enabled = true AND NEW.totp_secret IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TOTP must be configured before enabling';
  END IF;
  
  IF (SELECT value FROM settings WHERE key = 'require_admin_totp') = '1' 
     AND NEW.totp_enabled = false 
     AND NEW.id = CURRENT_ADMIN_ID() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TOTP is mandatory for all admins';
  END IF;
END;
```

**Code-Level Fix:**
```javascript
// backend/routes/adminAuth.js - STEP 1: Enforce on login
router.post('/login', adminLoginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const [admins] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
  
  if (!admins.length || !await bcrypt.compare(password, admins[0].password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const admin = admins[0];
  
  // MANDATORY: Require TOTP for all admins
  if (!admin.totp_secret || !admin.totp_enabled) {
    // Force admin through TOTP setup flow - DO NOT ALLOW BYPASS
    return res.status(403).json({
      error: 'Two-Factor Authentication must be configured',
      requiresSetup: true,
      nextUrl: '/api/admin/setup-totp',
      adminId: admin.id // Pass securely to TOTP setup endpoint
    });
  }
  
  // Request TOTP code
  return res.status(200).json({
    message: 'Enter your TOTP code',
    requiresTOTP: true,
    sessionToken: jwt.sign({
      adminId: admin.id,
      purpose: 'totp_verification',
      exp: Date.now() + 5 * 60 * 1000 // 5 minutes
    }, JWT_ADMIN_SECRET)
  });
});

// STEP 2: Verify TOTP
router.post('/verify-totp', async (req, res) => {
  const { sessionToken, totpCode } = req.body;
  
  let decoded;
  try {
    decoded = jwt.verify(sessionToken, JWT_ADMIN_SECRET);
  } catch {
    return res.status(401).json({ error: 'Session expired. Login again.' });
  }
  
  if (decoded.purpose !== 'totp_verification') {
    return res.status(401).json({ error: 'Invalid session' });
  }
  
  const [admins] = await pool.query(
    'SELECT totp_secret FROM admins WHERE id = ?',
    [decoded.adminId]
  );
  
  if (!admins.length) {
    return res.status(401).json({ error: 'Admin not found' });
  }
  
  const isValid = speakeasy.totp.verify({
    secret: admins[0].totp_secret,
    encoding: 'base32',
    token: totpCode,
    window: 1 // Allow ±1 time step
  });
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid TOTP code' });
  }
  
  // Issue full auth token
  const adminToken = jwt.sign({
    id: decoded.adminId,
    role: 'admin'
  }, JWT_ADMIN_SECRET, { expiresIn: '15m' });
  
  res.json({ token: adminToken });
});
```

---

## SECTION 2: API KEY & SENSITIVE DATA HANDLING

### 2.1 CRITICAL: Plaintext Payment Gateway Credentials

**Affected Files:**
- `backend/utils/flutterwave.js`
- `backend/utils/vtpass.js`
- `.env` (if committed)

**Current Code:**
```javascript
// backend/utils/flutterwave.js
const SECRET_KEY = (process.env.FLW_SECRET_KEY || '').trim();

export async function chargeCard(cardData) {
  const response = await axios.post(
    `${BASE_URL}/v3/charges?type=card`,
    cardData,
    {
      headers: {
        'Authorization': `Bearer ${SECRET_KEY}` // ❌ Plaintext in memory
      }
    }
  );
}

// backend/utils/vtpass.js
const API_KEY = (process.env.VTPASS_API_KEY || '').trim();
const SECRET_KEY = (process.env.VTPASS_SECRET_KEY || '').trim();
```

**Attack Scenarios:**

1. **Memory Dump Attack:**
   - Attacker gains temporary access to server memory (e.g., ConoHa cloud breach)
   - Extracts plaintext API keys
   - Uses keys to charge cards, transfer funds on behalf of users

2. **Log Leakage:**
   - If error/debug logs print environment variables
   - Keys exposed in server logs or third-party log aggregation services

3. **Process Inspection:**
   - Remote attacker exploits Node.js vulnerability
   - Reads process environment via `/proc/self/environ` on Linux

**Impact:** CRITICAL - Full Flutterwave & VTpass account compromise, ability to:
- Charge any card registered with the account
- Transfer funds
- Create fake transactions
- Drain merchant account

**Remediation Strategy 1: Use Secrets Manager (AWS/GCP)**

Install dependencies:
```bash
npm install @aws-sdk/client-secrets-manager
```

Create `backend/utils/secretsManager.js`:
```javascript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

const secretCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getSecret(secretName) {
  // Check cache first
  if (secretCache.has(secretName)) {
    const { value, timestamp } = secretCache.get(secretName);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return value;
    }
  }
  
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);
    
    let secretValue;
    if (response.SecretString) {
      try {
        secretValue = JSON.parse(response.SecretString);
      } catch {
        secretValue = response.SecretString;
      }
    } else {
      secretValue = Buffer.from(response.SecretBinary, 'base64').toString('ascii');
    }
    
    // Cache the secret
    secretCache.set(secretName, { value: secretValue, timestamp: Date.now() });
    
    return secretValue;
  } catch (err) {
    logger.error('Failed to retrieve secret', { secretName, error: err.message });
    throw new Error(`Could not retrieve secret: ${secretName}`);
  }
}

// Periodic cache invalidation
setInterval(() => {
  secretCache.clear();
}, 60 * 1000); // Clear every minute for auto-rotation
```

Update `backend/utils/flutterwave.js`:
```javascript
import axios from 'axios';
import { getSecret } from './secretsManager.js';

const BASE_URL = process.env.FLW_BASE_URL || 'https://api.flutterwave.com/v3';
let SECRET_KEY = null;

// Load secret on startup
async function loadSecrets() {
  try {
    const secrets = await getSecret('flutterwave-credentials');
    SECRET_KEY = secrets.SECRET_KEY || secrets;
  } catch (err) {
    logger.error('Failed to load Flutterwave credentials', err);
    process.exit(1);
  }
}

export async function chargeCard(cardData) {
  // Never store in memory permanently - fetch per-request in production
  const key = await getSecret('flutterwave-secret-key');
  
  const response = await axios.post(
    `${BASE_URL}/charges?type=card`,
    cardData,
    {
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      // Add security headers
      timeout: 5000
    }
  );
  
  // Explicitly clear sensitive data from memory
  key = null;
  
  return response.data;
}

loadSecrets().catch(err => {
  console.error('Fatal: Cannot start without Flutterwave credentials');
  process.exit(1);
});
```

**Remediation Strategy 2: Environment-Based Local Deployment (Without AWS)**

If you can't use AWS Secrets Manager yet:

```javascript
// backend/utils/keyManagement.js
import crypto from 'crypto';

// Use strong environment variables - NEVER fallback defaults
const FLW_SECRET = process.env.FLW_SECRET_KEY;
const VTPASS_SECRET = process.env.VTPASS_SECRET_KEY;

if (!FLW_SECRET || !VTPASS_SECRET) {
  throw new Error('Payment gateway secrets must be set in environment variables');
}

// Encrypt secrets when storing temporarily
export class SecretManager {
  static #encryptionKey = crypto.scryptSync(process.env.SECRET_ENCRYPTION_PASS || '', 'salt', 32);
  
  static encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.#encryptionKey, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted + ':' + cipher.getAuthTag().toString('hex');
  }
  
  static decrypt(data) {
    const [iv, encrypted, tag] = data.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.#encryptionKey, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

// Never expose secrets in logs
export function sanitizeSecret(secret) {
  if (!secret || secret.length < 4) return '[HIDDEN]';
  return secret.substring(0, 4) + '*'.repeat(secret.length - 4);
}
```

**Best Practice: Key Rotation**

```javascript
// backend/utils/flutterwave.js - Add rotation mechanism
class FlutterwaveKeyRotation {
  constructor() {
    this.currentKey = null;
    this.previousKey = null;
    this.rotationDate = null;
  }
  
  async rotateKey(newKey) {
    this.previousKey = this.currentKey;
    this.currentKey = newKey;
    this.rotationDate = new Date();
    
    // Log rotation (without exposing actual key)
    logger.info('Flutterwave API key rotated', {
      rotationTime: this.rotationDate,
      newKeyPrefix: newKey.substring(0, 4) + '...'
    });
    
    // Optional: Invalidate old key with Flutterwave API
    // await flutterwaveAPI.revokeKey(this.previousKey);
  }
  
  async getKey() {
    // Check if key needs rotation (e.g., every 90 days)
    if (this.rotationDate && (Date.now() - this.rotationDate) > 90 * 24 * 60 * 60 * 1000) {
      logger.warn('API key approaching rotation deadline');
      // Trigger key rotation alert
    }
    return this.currentKey;
  }
}

const keyRotation = new FlutterwaveKeyRotation();
```

---

### 2.2 HIGH: Environment Variables Leak Risk

**Problem:**

```bash
# .env.example (visible in repo)
FLW_SECRET_KEY=flw_test_xxxx           # Structure visible
VTPASS_API_KEY=your_vtpass_api_key     # Format visible
JWT_SECRET=change_this_secret           # Suggests weak default
```

**Fix:**

```bash
# .env.example - UPDATED (NO ACTUAL SECRETS)
# Payment Gateway Credentials (obtain from respective platforms)
FLW_BASE_URL=https://api.flutterwave.com/v3
FLW_SECRET_KEY=                  # Set in production environment only
VTPASS_BASE_URL=https://api-sandbox.vtpass.com
VTPASS_API_KEY=                  # Set in production environment only
VTPASS_PUBLIC_KEY=               # Set in production environment only

# Authentication Secrets (generate with: node -e "console.log(crypto.randomBytes(32).toString('hex'))")
JWT_SECRET=                      # Required: min 32 chars
JWT_ADMIN_SECRET=                # Required: min 32 chars, must differ from JWT_SECRET
COOKIE_ENC_SECRET=               # Required: min 32 chars

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=                     # Set in production only
DB_NAME=gly_vtu

# TOTP & OTP
TOTP_WINDOW=1
OTP_EXPIRY_MINUTES=10

# Email
EMAIL_PROVIDER=sendgrid          # or smtp
SENDGRID_API_KEY=                # Set in production only

# Rate Limiting
REDIS_URL=redis://localhost:6379

# Encryption
SECRET_ENCRYPTION_PASS=          # For additional key encryption
AES_KEY=                         # For AES-256-GCM
```

**Add `.gitignore` check:**

```bash
# Create .gitignore validation script
# gitignore-check.js
const fs = require('fs');
const path = require('path');

const gitignore = fs.readFileSync('.gitignore', 'utf8');
const requiredPatterns = [
  '.env',
  '.env.local',
  'node_modules/',
  '.DS_Store',
  '*.log',
];

const missing = requiredPatterns.filter(pattern => !gitignore.includes(pattern));

if (missing.length > 0) {
  console.error('❌ Missing patterns in .gitignore:', missing);
  process.exit(1);
}

console.log('✅ .gitignore is properly configured');

// Pre-commit hook
// .husky/pre-commit
#!/bin/sh
node gitignore-check.js
```

---

### 2.3 MEDIUM: Cookie Encryption Key Derivation

**Current Code:**
```javascript
// backend/utils/secureCookie.js
function getKey() {
  return crypto.createHash('sha256').update(String(DEFAULT_SECRET)).digest();
}
```

**Problem:** SHA256 is fast but designed for hashing, not key derivation. Should use PBKDF2 or Argon2.

**Fix:**

```javascript
// backend/utils/secureCookie.js - UPDATED
import crypto from 'crypto';

const ENCRYPTION_SALT = 'gly-vtu-cookie-encryption'; // Can be stored plaintext
const ITERATIONS = 100000; // NIST recommends minimum 100,000

function getEncryptionKey() {
  if (!process.env.COOKIE_ENC_SECRET) {
    throw new Error('COOKIE_ENC_SECRET not configured');
  }
  
  const key = crypto.pbkdf2Sync(
    process.env.COOKIE_ENC_SECRET,
    ENCRYPTION_SALT,
    ITERATIONS,
    32, // 32 bytes for AES-256
    'sha256'
  );
  
  return key;
}

export function encryptCookie(data) {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:encrypted:authTag
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

export function decryptCookie(encrypted) {
  try {
    const [ivHex, encryptedData, tagHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const key = getEncryptionKey();
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (err) {
    logger.warn('Cookie decryption failed', { error: err.message });
    return null;
  }
}

// Use securely in routes
setCookie('session', encryptCookie({ userId, role }), {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000 // 15 minutes
});
```

---

## SECTION 3: CSRF PROTECTION

### 3.1 MEDIUM: Weak CSRF Token Configuration

**Current Issues:**

```javascript
// backend/middleware/csrf.js
sameSite: 'lax', // Allows some cross-site POSTs
// Token doesn't rotate per-request
```

**Fix 1: Enforce Strict SameSite**

```javascript
// backend/middleware/csrf.js - UPDATED
export function csrfMiddleware(req, res, next) {
  // Check if exemption applies
  const csrfExemptPaths = [
    '/api/flutterwave/webhook',
    '/api/vtpass/webhook',
    // Remove: /api/auth/login and /api/auth/register from here
  ];
  
  const isExempt = csrfExemptPaths.some(path => req.path.startsWith(path));
  if (isExempt) return next();
  
  // Enforce CSRF for all state-changing requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next(); // Safe methods don't need CSRF
  }
  
  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.headers['x-csrf-token'];
  
  if (!csrfCookie || !csrfHeader) {
    return res.status(403).json({
      error: 'CSRF token missing',
      code: 'CSRF_TOKEN_MISSING'
    });
  }
  
  // Use timing-safe comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(csrfCookie),
    Buffer.from(csrfHeader)
  ).catch(() => false);
  
  if (!isValid) {
    logger.warn('CSRF token mismatch', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    return res.status(403).json({
      error: 'CSRF validation failed',
      code: 'CSRF_INVALID'
    });
  }
  
  next();
}

export function csrfTokenMiddleware(req, res, next) {
  // Ensure CSRF token cookie is set
  if (!req.cookies?.csrf_token) {
    const newToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf_token', newToken, {
      httpOnly: true, // ❌ Cannot be read by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // ✅ Strict - not 'lax'
      maxAge: 1000 * 60 * 60, // 1 hour
      path: '/'
    });
    req.csrfToken = newToken;
  } else {
    req.csrfToken = req.cookies.csrf_token;
  }
  
  next();
}

// For API responses, include CSRF token in body (NOT cookie)
export function getCsrfTokenForResponse(req) {
  return req.csrfToken;
}
```

**Fix 2: Per-Request Rotation for Sensitive Operations**

```javascript
// backend/routes/wallet.js - For sensitive money transfer
router.post('/transfer', csrfMiddleware, requireUser, async (req, res) => {
  const { recipientId, amount, pin } = req.body;
  
  // Rotate CSRF token after each sensitive operation
  const newToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf_token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60,
  });
  
  // Process transfer
  try {
    const result = await processWalletTransfer(req.user.id, recipientId, amount, pin);
    return res.json({
      success: true,
      data: result,
      // Include new CSRF token in response for subsequent requests
      csrfToken: newToken
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});
```

**Fix 3: Remove Auth Endpoints from CSRF Exemption**

```javascript
// backend/middleware/csrf.js - CORRECTED
const csrfExemptPaths = [
  '/api/flutterwave/webhook',  // ✅ External webhooks - use signature verification
  '/api/vtpass/webhook',       // ✅ External webhooks - use signature verification
  // ❌ Remove /api/auth/login, /api/auth/register
  // ❌ Remove any user-facing endpoints
];

// For login/register, require CSRF token OR device fingerprint
export function csrfOrDeviceFingerprintMiddleware(req, res, next) {
  // Option 1: CSRF token
  const csrfValid = req.cookies?.csrf_token === req.headers['x-csrf-token'];
  
  // Option 2: Device fingerprint + rate limiting
  const deviceFingerprint = req.headers['x-device-fingerprint'];
  const deviceValid = deviceFingerprint && validateDeviceFingerprint(deviceFingerprint);
  
  if (!csrfValid && !deviceValid) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  
  next();
}
```

---

## SECTION 4: DATABASE SECURITY & INJECTION RISKS

### 4.1 MEDIUM: Potential SQL Injection via Dynamic Column Names

**Problem Code:**
```javascript
// backend/routes/user.js
const updates = [];
const values = [];
if (fullName) {
  updates.push('full_name = ?'); // Column name embedded
  values.push(fullName);
}
await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
```

**Attack:** If column names come from user input, attacker could inject SQL:
```
fieldName: "password_hash = 'hacked', "
→ UPDATE users SET password_hash = 'hacked', email = ? WHERE id = ?
```

**Fix:**

```javascript
// backend/middleware/validation.js - ADD whitelist middleware
const ALLOWED_UPDATE_FIELDS = {
  'fullName': 'full_name',
  'email': 'email',
  'phone': 'phone',
  'address': 'address',
  'city': 'city',
  'state': 'state'
};

export function validateUpdateFields(allowedFields) {
  return (req, res, next) => {
    const requestFields = Object.keys(req.body);
    const invalidFields = requestFields.filter(f => !allowedFields[f]);
    
    if (invalidFields.length > 0) {
      return res.status(400).json({
        error: 'Invalid fields',
        invalidFields
      });
    }
    
    req.validatedFields = allowedFields;
    next();
  };
}

// backend/routes/user.js - UPDATED
import { validateUpdateFields, ALLOWED_UPDATE_FIELDS } from '../middleware/validation.js';

router.put('/profile', requireUser, validateUpdateFields(ALLOWED_UPDATE_FIELDS), async (req, res) => {
  const updates = [];
  const values = [];
  
  for (const [bodyField, dbColumn] of Object.entries(ALLOWED_UPDATE_FIELDS)) {
    if (req.body[bodyField]) {
      updates.push(`${dbColumn} = ?`); // Column name from whitelist, not user input
      values.push(req.body[bodyField]);
    }
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  
  values.push(req.user.id);
  
  try {
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    logger.error('Profile update failed', { userId: req.user.id, error: err.message });
    res.status(500).json({ error: 'Failed to update profile' });
  }
});
```

---

### 4.2 MEDIUM: Inconsistent Input Validation

**Current Issues:**

Some routes validate, others don't:
```javascript
// backend/routes/bills.js - Line 45
// Some routes call isValidAmount(), others don't
```

**Fix: Centralized Validation Middleware**

```javascript
// backend/middleware/requestValidation.js - CREATE
import Joi from 'joi';
import { logger } from '../utils/logger.js';

// Define schemas for each operation
export const billPaymentSchema = Joi.object({
  serviceId: Joi.string()
    .required()
    .pattern(/^[a-z0-9-]+$/i)
    .max(50),
  amount: Joi.number()
    .required()
    .min(100) // Minimum ₦100
    .max(1000000) // Maximum ₦1,000,000
    .integer(),
  pin: Joi.string()
    .required()
    .length(4)
    .pattern(/^\d+$/),
  phone: Joi.string()
    .required()
    .pattern(/^(\+234|0)[789][0-9]{9}$/),
  metadata: Joi.object().optional()
});

export const walletTransferSchema = Joi.object({
  recipientId: Joi.string()
    .required()
    .uuid(),
  amount: Joi.number()
    .required()
    .min(100)
    .max(10000000),
  pin: Joi.string()
    .required()
    .length(4)
    .pattern(/^\d+$/),
  description: Joi.string()
    .max(500)
    .optional()
});

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      logger.warn('Validation failed', {
        path: req.path,
        errors: error.details.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
      
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    
    req.validatedBody = value;
    next();
  };
};

// backend/routes/bills.js - UPDATED
import { validateRequest, billPaymentSchema } from '../middleware/requestValidation.js';

router.post('/pay', requireUser, validateRequest(billPaymentSchema), async (req, res) => {
  const { serviceId, amount, pin, phone } = req.validatedBody; // Already validated
  
  try {
    const result = await processBillPayment(req.user.id, {
      serviceId, amount, pin, phone
    });
    res.json(result);
  } catch (err) {
    logger.error('Bill payment failed', { error: err.message });
    res.status(500).json({ error: 'Payment processing failed' });
  }
});
```

---

## SECTION 5: TOKEN MANAGEMENT

### 5.1 MEDIUM: Expired Token Cleanup Missing

**Problem:**
```javascript
// backend/utils/tokens.js
// No cleanup of expired refresh tokens
```

**Risk:** Database bloat, potential enumeration attacks

**Fix: Implement Cleanup Job**

```javascript
// backend/utils/tokenCleanup.js - CREATE
import cron from 'node-cron';
import { pool } from '../config/db.js';
import { logger } from './logger.js';

// Run cleanup every day at 2 AM
export function scheduleTokenCleanup() {
  cron.schedule('0 2 * * *', async () => {
    try {
      const result = await pool.query(
        `DELETE FROM refresh_tokens 
         WHERE expires_at < NOW() - INTERVAL 30 DAY
         OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL 7 DAY)`
      );
      
      logger.info('Token cleanup completed', {
        deletedTokens: result.affectedRows
      });
    } catch (err) {
      logger.error('Token cleanup failed', { error: err.message });
    }
  });
}

// Also implement per-user cleanup
export async function cleanupUserTokens(userId) {
  await pool.query(
    `DELETE FROM refresh_tokens 
     WHERE user_id = ? AND expires_at < NOW()`,
    [userId]
  );
}

// backend/server.js - ADD
import { scheduleTokenCleanup } from './backend/utils/tokenCleanup.js';

app.listen(PORT, () => {
  scheduleTokenCleanup();
  logger.info(`Server running on port ${PORT}`);
});
```

---

### 5.2 MEDIUM: Device ID Stored in LocalStorage

**Current Code:**
```typescript
// src/services/api.ts
localStorage.setItem(DEVICE_ID_KEY, deviceId); // XSS vulnerability
```

**Fix:**

```typescript
// src/services/api.ts - UPDATED
import { getDeviceIdSecurely, validateDeviceId } from '../utils/deviceSecurity';

function getDeviceId() {
  // Check if device ID is in secure httpOnly cookie (set by server)
  const deviceIdFromServer = document.cookie
    .split('; ')
    .find(row => row.startsWith('device_id='))
    ?.split('=')[1];
  
  if (deviceIdFromServer && validateDeviceId(deviceIdFromServer)) {
    return deviceIdFromServer;
  }
  
  // If not in cookie, request from server (which sets httpOnly cookie)
  return fetchDeviceIdFromServer();
}

async function fetchDeviceIdFromServer() {
  const response = await fetch('/api/auth/device-id', {
    method: 'GET',
    credentials: 'include'
  });
  
  const { deviceId } = await response.json();
  // Server automatically sets httpOnly cookie - don't store locally
  return deviceId;
}

// backend/routes/auth.js - ADD NEW ENDPOINT
router.get('/device-id', async (req, res) => {
  // Generate or retrieve device ID
  const deviceId = crypto.randomUUID();
  
  res.cookie('device_id', deviceId, {
    httpOnly: true, // Cannot be accessed by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
  });
  
  res.json({ deviceId }); // Send to client for reference only
});
```

**Add CSP Headers:**

```javascript
// backend/server.js
import csp from 'helmet-csp';

app.use(csp({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'nonce-{randomValue}'"], // Inline scripts require nonce
    styleSrc: ["'self'", "'nonce-{randomValue}'"],
    imgSrc: ["'self'", 'https:'],
    connectSrc: ["'self'", 'https://api.flutterwave.com', 'https://api.vtpass.com'],
    fontSrc: ["'self'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    baseSrc: ["'self'"]
  },
  reportUri: '/api/security/csp-report'
}));
```

---

## SECTION 6: INPUT VALIDATION IMPROVEMENTS

### 6.1 MEDIUM: Phone Number Validation Too Permissive

**Current Code:**
```javascript
return digits.length >= 10 && digits.length <= 15;
```

**Fix: Validate Nigerian Format Specifically**

```javascript
// backend/utils/validation.js - UPDATED
export function isValidNigerianPhone(value) {
  if (!isNonEmptyString(value, 20)) return false;
  
  // Remove common formatting
  const cleaned = value.replace(/[\s\-().+]/g, '');
  
  // Nigerian phone: +234XXXXXXXXXX or 0XXXXXXXXXX (11 digits) or 234XXXXXXXXXX
  const patterns = [
    /^\+234[789]\d{9}$/,        // +234 format: +2347012345678
    /^0[789]\d{9}$/,            // 0 format: 07012345678
    /^234[789]\d{9}$/           // 234 format: 2347012345678
  ];
  
  const isValid = patterns.some(pattern => pattern.test(cleaned));
  
  if (!isValid) {
    return false;
  }
  
  // Verify it's not a known invalid range
  const invalidPrefixes = ['0000', '9999'];
  const prefix = cleaned.substring(0, 4);
  if (invalidPrefixes.includes(prefix)) {
    return false;
  }
  
  return true;
}

// Test cases
console.assert(isValidNigerianPhone('+2347012345678') === true);
console.assert(isValidNigerianPhone('07012345678') === true);
console.assert(isValidNigerianPhone('2347012345678') === true);
console.assert(isValidNigerianPhone('07012345') === false); // Too short
console.assert(isValidNigerianPhone('+123456789') === false); // Wrong country
```

---

## SECTION 7: PAYMENT INTEGRATION SECURITY

### 7.1 CRITICAL: Webhook IP Whitelist Optional in Production

**Current Code:**
```javascript
if (!list.length) {
  return process.env.NODE_ENV !== 'production'; // ❌ Defaults to ALLOW
}
```

**Attack:** Any IP can trigger fake webhook notifications (charging users, transferring funds)

**Fix:**

```javascript
// backend/routes/flutterwaveWebhook.js - UPDATED
import { logger } from '../utils/logger.js';

function isIpAllowed(req) {
  const allowedIps = (process.env.FLW_WEBHOOK_IPS || '')
    .split(',')
    .map(ip => ip.trim())
    .filter(Boolean);
  
  // MANDATORY IP whitelist in production
  if (process.env.NODE_ENV === 'production' && allowedIps.length === 0) {
    logger.error('CRITICAL: FLW_WEBHOOK_IPS not configured in production', {
      ip: req.ip
    });
    return false; // ✅ DENY by default
  }
  
  if (allowedIps.length === 0) {
    logger.warn('WARNING: Webhook IP verification disabled (development only)', {
      ip: req.ip
    });
    return true;
  }
  
  return allowedIps.includes(req.ip);
}

export async function handleFlutterwaveWebhook(req, res) {
  const clientIp = req.ip;
  
  logger.info('Webhook received', { ip: clientIp });
  
  // Check IP whitelist
  if (!isIpAllowed(req)) {
    logger.warn('Webhook rejected: IP not whitelisted', { ip: clientIp });
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Verify signature
  if (!verifyFlutterwaveWebhook(req)) {
    logger.warn('Webhook rejected: Invalid signature', { ip: clientIp });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Verify timestamp (prevent replay attacks)
  const webhookTime = new Date(req.body.timestamp);
  const now = new Date();
  if (Math.abs(now - webhookTime) > 60 * 1000) { // 60 second window
    logger.warn('Webhook rejected: Timestamp too old', { ip: clientIp });
    return res.status(400).json({ error: 'Invalid timestamp' });
  }
  
  // Process webhook...
  res.json({ success: true });
}

// .env.production
FLW_WEBHOOK_IPS=192.x.x.x,192.y.y.y
```

**Get Current Flutterwave IPs:**
```javascript
// Create endpoint to verify Flutterwave webhook IPs
// https://developer.flutterwave.com/reference#get-webhook-signature

// Store as cron job to update IPs periodically
import cron from 'node-cron';

const updateFlutterwaveIps = async () => {
  try {
    const response = await axios.get('https://api.flutterwave.com/v3/webhooks/ips');
    const ips = response.data.data.ips; // Get current IP range
    
    logger.info('Updated Flutterwave IPs', { ips });
    // Store in Redis or database for quick lookup
  } catch (err) {
    logger.error('Failed to fetch Flutterwave IPs', err);
  }
};

cron.schedule('0 3 * * *', updateFlutterwaveIps); // Daily at 3 AM
```

---

### 7.2 HIGH: Idempotency Race Condition

**Problem:**
```javascript
const [existing] = await pool.query('SELECT id FROM transactions WHERE reference = ?');
if (existing.length) return res.json({ message: 'Already processed' });
// ❌ Two simultaneous requests see empty, both create transaction
```

**Fix: Database-Level Locking**

```javascript
// backend/routes/flutterwaveWebhook.js - UPDATED
import mysql from 'mysql2/promise';

async function handleFlutterwaveWebhook(req, res) {
  const { event, data } = req.body;
  const reference = `FLW-${data.flw_ref || data.id}`;
  
  // Get connection with transaction support
  const conn = await pool.getConnection();
  
  try {
    // Start transaction
    await conn.beginTransaction();
    
    // Lock the transaction for reading/writing
    const [existing] = await conn.query(
      'SELECT id FROM transactions WHERE reference = ? FOR UPDATE SKIP LOCKED',
      [reference]
    );
    
    if (existing.length > 0) {
      await conn.commit();
      logger.info('Webhook already processed', { reference });
      return res.json({ message: 'Already processed' });
    }
    
    // All good - process the transaction
    const amount = data.amount;
    const status = data.status === 'successful' ? 'success' : 'failed';
    
    const [result] = await conn.query(
      `INSERT INTO transactions (
        id, user_id, type, amount, fee, total, status, reference, flw_ref, metadata, created_at
      ) VALUES (UUID(), ?, 'deposit', ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        data.customer_id,
        amount,
        amount * 0.01, // 1% fee
        amount * 1.01,
        status,
        reference,
        data.flw_ref,
        JSON.stringify(data)
      ]
    );
    
    if (status === 'success') {
      // Update wallet atomically within same transaction
      const [walletResult] = await conn.query(
        'UPDATE wallets SET balance = balance + ? WHERE user_id = ?',
        [amount, data.customer_id]
      );
      
      if (walletResult.affectedRows === 0) {
        throw new Error('Wallet not found');
      }
    }
    
    await conn.commit();
    logger.info('Transaction processed successfully', { reference, amount });
    res.json({ success: true, transactionId: result.insertId });
    
  } catch (err) {
    await conn.rollback();
    logger.error('Transaction processing failed', { reference, error: err.message });
    res.status(500).json({ error: 'Failed to process transaction' });
  } finally {
    conn.release();
  }
}
```

**Alternative: Unique Constraint + Upsert**

```sql
-- Add unique constraint in migration
ALTER TABLE transactions ADD UNIQUE KEY uk_reference (reference);

-- Then use INSERT ... ON DUPLICATE KEY UPDATE
INSERT INTO transactions (
  id, user_id, type, amount, fee, total, status, reference, flw_ref, metadata, created_at
) VALUES (
  UUID(), ?, 'deposit', ?, ?, ?, ?, ?, ?, ?, NOW()
) ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  updated_at = NOW();
```

---

## SECTION 8: ERROR HANDLING & LOGGING

### 8.1 MEDIUM: Console.error Bypasses Logger

**Fix:**

```javascript
// backend/routes/auth.js - FIND & REPLACE ALL INSTANCES
// ❌ OLD:
sendWelcomeEmail({...}).catch(console.error);

// ✅ NEW:
sendWelcomeEmail({...}).catch(err => {
  logger.error('Failed to send welcome email', {
    userId: user.id,
    email: user.email,
    error: err.message,
    stack: err.stack
  });
  // Don't throw - email is non-critical
});
```

**Rationale:** Ensures:
1. Sensitive data is redacted by logger
2. All errors are aggregated in logging system
3. Errors can be monitored/alerted on
4. Stack traces are captured for debugging

**Create wrapper function:**

```javascript
// backend/utils/errors.js
export function reportError(context, error, isCritical = false) {
  const errorData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date(),
    context
  };
  
  if (isCritical) {
    logger.error('CRITICAL ERROR', errorData);
    // Send alert to ops team
    alertOps(errorData);
  } else {
    logger.warn('Non-critical error', errorData);
  }
}

// Usage:
sendWelcomeEmail({...}).catch(err => {
  reportError({ userId: user.id, action: 'welcome_email' }, err, false);
});
```

---

### 8.2 MEDIUM: Incomplete Logger Redaction

**Current Code:**
```javascript
function redact(obj) {
  const keys = ['secret', 'token', 'password', 'api_key'];
  // Missing: email, phone, account_number, pin, cvv, otp
}
```

**Fix:**

```javascript
// backend/utils/logger.js - UPDATED
function redact(obj) {
  if (!obj) return obj;
  
  const clone = JSON.parse(JSON.stringify(obj));
  
  // Sensitive field patterns
  const sensitivePatterns = {
    // Authentication
    'secret': /^.+$/,
    'token': /^.+$/,
    'password': /^.+$/,
    'password_hash': /^.+$/,
    'api_key': /^.+$/,
    'apiKey': /^.+$/,
    'authorization': /^.+$/,
    
    // Personal Information
    'email': /^.+$/,
    'phone': /^.+$/,
    'full_name': /^.+$/,
    'fullName': /^.+$/,
    
    // Financial
    'account_number': /^.+$/,
    'accountNumber': /^.+$/,
    'card_number': /^.+$/,
    'cardNumber': /^.+$/,
    'cvv': /^.+$/,
    'pin': /^.+$/,
    
    // OTP/Verification
    'otp': /^.+$/,
    'code': /^.+$/, // Might be too broad
    'totp_secret': /^.+$/,
    
    // KYC/BVN
    'bvn': /^.+$/,
    'nin': /^.+$/,
    'ssn': /^.+$/,
    'kyc_payload': /^.+$/,
    
    // Webhook data
    'raw_body': /^.+$/,
    'rawData': /^.+$/
  };
  
  function redactRecursive(obj, depth = 0) {
    if (depth > 10) return '[MAX_DEPTH]'; // Prevent infinite recursion
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => redactRecursive(item, depth + 1));
    }
    
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key matches any sensitive pattern
      const isSensitive = Object.entries(sensitivePatterns).some(([pattern, regex]) => {
        return lowerKey.includes(pattern) || lowerKey === pattern;
      });
      
      if (isSensitive) {
        // Redact but hint at type if possible
        if (typeof value === 'string' && value.length > 0) {
          result[key] = `[REDACTED_${value.length}_CHARS]`;
        } else if (typeof value === 'number') {
          result[key] = '[REDACTED_NUMBER]';
        } else {
          result[key] = '[REDACTED]';
        }
      } else if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) {
        result[key] = redactRecursive(value, depth + 1);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
  
  return redactRecursive(clone);
}

// Usage in logger
export function logRequest(req, res, next) {
  logger.info('HTTP Request', {
    method: req.method,
    path: req.path,
    query: redact(req.query),
    body: redact(req.body),
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type']
      // Notably, 'authorization' is redacted
    },
    ip: req.ip
  });
  next();
}
```

---

## SECTION 9: DATA ENCRYPTION

### 9.1 HIGH: No Encryption for PII in Database

**Strategy: Field-Level Encryption at Application Level**

Install package:
```bash
npm install crypto-js
```

```javascript
// backend/utils/encryption.js - CREATE
import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = crypto.pbkdf2Sync(
  process.env.PII_ENCRYPTION_KEY || process.env.JWT_SECRET,
  'pii-encryption-salt',
  100000,
  32,
  'sha256'
);

export function encryptField(plaintext) {
  if (!plaintext) return null;
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:encrypted:authTag
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

export function decryptField(encrypted) {
  if (!encrypted) return null;
  
  try {
    const [ivHex, encryptedData, tagHex] = encrypted.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    logger.error('Decryption failed', { error: err.message });
    return null;
  }
}
```

**Use in User Model:**

```javascript
// backend/routes/auth.js - Updated registration
import { encryptField, decryptField } from '../utils/encryption.js';

router.post('/register', async (req, res) => {
  const { email, phone, fullName, password } = req.body;
  
  // Encrypt PII fields
  const encryptedEmail = encryptField(email.toLowerCase());
  const encryptedPhone = encryptField(phone);
  const encryptedFullName = encryptField(fullName);
  
  const hashedPassword = await bcrypt.hash(password, 12);
  
  const [result] = await pool.query(
    `INSERT INTO users (
      id, email_encrypted, phone_encrypted, full_name_encrypted, password_hash, 
      created_at
    ) VALUES (UUID(), ?, ?, ?, ?, NOW())`,
    [encryptedEmail, encryptedPhone, encryptedFullName, hashedPassword]
  );
  
  res.json({ userId: result.insertId, message: 'Registration successful' });
});

// When retrieving user data
router.get('/profile', requireUser, async (req, res) => {
  const [users] = await pool.query(
    'SELECT id, email_encrypted, phone_encrypted, full_name_encrypted FROM users WHERE id = ?',
    [req.user.id]
  );
  
  if (!users.length) return res.status(404).json({ error: 'User not found' });
  
  const user = users[0];
  
  res.json({
    id: user.id,
    email: decryptField(user.email_encrypted),
    phone: decryptField(user.phone_encrypted),
    fullName: decryptField(user.full_name_encrypted)
  });
});
```

**Encrypt Financial Data:**

```javascript
// backend/routes/transactions.js - Updated transaction creation
import { encryptField } from '../utils/encryption.js';

router.post('/create-transaction', requireUser, async (req, res) => {
  const { recipientId, amount, pin } = req.body;
  
  // Validate PIN
  const [users] = await pool.query('SELECT pin_hash FROM users WHERE id = ?', [req.user.id]);
  if (!await bcrypt.compare(pin, users[0].pin_hash)) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  
  // Encrypt sensitive transaction data
  const encryptedAmount = encryptField(amount.toString());
  const encryptedRecipientId = encryptField(recipientId);
  
  const [result] = await pool.query(
    `INSERT INTO transactions (
      id, user_id, recipient_id_encrypted, amount_encrypted,
      type, status, reference, created_at
    ) VALUES (UUID(), ?, ?, ?, 'transfer', 'pending', ?, NOW())`,
    [req.user.id, encryptedRecipientId, encryptedAmount, generateReference()]
  );
  
  res.json({ transactionId: result.insertId });
});
```

---

### 9.2 MEDIUM: OTP Hashing Uses SHA256 (Not bcrypt)

**Fix:**

```javascript
// backend/utils/otp.js - UPDATED
import bcrypt from 'bcryptjs';

function hashOtpCode(code) {
  // Use bcrypt instead of SHA256
  return bcrypt.hashSync(code, 12);
}

export async function generateAndStoreOtp(userId, email, purpose) {
  const code = Math.random().toString().slice(2, 8); // 6-digit code
  const codeHash = hashOtpCode(code);
  
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  await pool.query(
    'INSERT INTO email_otps (id, user_id, email, purpose, code_hash, expires_at, created_at) VALUES (UUID(), ?, ?, ?, ?, ?, NOW())',
    [userId, email, purpose, codeHash, expiresAt]
  );
  
  // Send code via email (not in response for security)
  sendOtpEmail(email, code);
  
  return { message: 'OTP sent to email' };
}

export async function verifyOtpCode(userId, email, code) {
  const [otps] = await pool.query(
    'SELECT code_hash, expires_at FROM email_otps WHERE user_id = ? AND email = ? ORDER BY created_at DESC LIMIT 1',
    [userId, email]
  );
  
  if (!otps.length) {
    throw new Error('No OTP found');
  }
  
  const otp = otps[0];
  
  // Check expiration
  if (new Date(otp.expires_at) < new Date()) {
    throw new Error('OTP expired');
  }
  
  // Verify code using bcrypt comparison
  const isValid = await bcrypt.compare(code, otp.code_hash);
  
  if (!isValid) {
    throw new Error('Invalid OTP code');
  }
  
  // Invalidate OTP after use
  await pool.query('DELETE FROM email_otps WHERE user_id = ? AND email = ?', [userId, email]);
  
  return { success: true };
}
```

---

## SECTION 10: COMPLIANCE & KYC

### 10.1 MEDIUM: KYC Payload Not Validated

**Fix:**

```javascript
// backend/middleware/kycValidation.js - CREATE
import Joi from 'joi';

export const kycSchema = Joi.object({
  bvn: Joi.string()
    .required()
    .length(11)
    .pattern(/^\d+$/),
  
  nin: Joi.string()
    .optional()
    .length(11)
    .pattern(/^\d+$/),
  
  fullName: Joi.string()
    .required()
    .min(5)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/),
  
  dateOfBirth: Joi.date()
    .required()
    .max('now')
    .min('1930-01-01'),
  
  gender: Joi.string()
    .required()
    .valid('M', 'F', 'Other'),
  
  address: Joi.string()
    .required()
    .min(10)
    .max(500),
  
  city: Joi.string()
    .required()
    .min(2)
    .max(50),
  
  state: Joi.string()
    .required()
    .min(2)
    .max(50),
  
  idType: Joi.string()
    .required()
    .valid('passport', 'drivers_license', 'national_id'),
  
  idNumber: Joi.string()
    .required()
    .min(5)
    .max(50),
  
  idExpiryDate: Joi.date()
    .required()
    .min(Joi.ref('now')), // Must not be expired
  
  phone: Joi.string()
    .required()
    .pattern(/^(\+234|0)[789][0-9]{9}$/),
  
  email: Joi.string()
    .required()
    .email()
});

export const validateKycPayload = (req, res, next) => {
  const { error, value } = kycSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    return res.status(400).json({
      error: 'KYC validation failed',
      details: error.details
    });
  }
  
  req.validatedKYC = value;
  next();
};

// backend/routes/user.js - Updated KYC submission
import { validateKycPayload, encryptField } from '../utils/encryption.js';

router.post('/kyc/submit', requireUser, validateKycPayload, async (req, res) => {
  const { validatedKYC: kyc } = req;
  
  // Encrypt sensitive KYC data before storage
  const encryptedPayload = {
    bvn: encryptField(kyc.bvn),
    nin: kyc.nin ? encryptField(kyc.nin) : null,
    fullName: encryptField(kyc.fullName),
    dateOfBirth: encryptField(kyc.dateOfBirth),
    address: encryptField(kyc.address),
    idNumber: encryptField(kyc.idNumber),
    // Non-sensitive fields
    idType: kyc.idType,
    gender: kyc.gender,
    state: kyc.state
  };
  
  const [result] = await pool.query(
    `UPDATE users SET 
      kyc_status = 'pending',
      kyc_level = 2,
      kyc_payload = ?,
      kyc_submitted_at = NOW()
     WHERE id = ?`,
    [JSON.stringify(encryptedPayload), req.user.id]
  );
  
  res.json({ message: 'KYC submitted successfully' });
});
```

---

### 10.2 MEDIUM: Transaction Amounts Count Pending Transactions Toward Limits

**Fix:**

```javascript
// backend/utils/kycLimits.js - UPDATED
export async function enforceKycLimits({ userId, level, amount, types = ['transfer'] }) {
  if (!level || level < 1 || level > 3) {
    throw new Error('Invalid KYC level');
  }
  
  // Define limits per KYC level (in Nigerian Naira)
  const limits = {
    1: { daily: 50_000, monthly: 200_000 },      // Basic
    2: { daily: 500_000, monthly: 5_000_000 },   // Verified
    3: { daily: 10_000_000, monthly: 100_000_000 } // Full KYC
  };
  
  const limit = limits[level];
  
  // COUNT ONLY SUCCESSFUL TRANSACTIONS, NOT PENDING
  const [dailyResult] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE user_id = ?
     AND type IN (${types.map(() => '?').join(',')})
     AND status = 'success'
     AND DATE(created_at) = CURDATE()`,
    [userId, ...types]
  );
  
  const dailyUsed = dailyResult[0].total;
  const dailyRemaining = limit.daily - dailyUsed;
  
  if (amount > dailyRemaining) {
    throw new Error(
      `Daily limit exceeded. Used: ₦${dailyUsed}, Limit: ₦${limit.daily}, Requested: ₦${amount}`
    );
  }
  
  // Similarly for monthly
  const [monthlyResult] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE user_id = ?
     AND type IN (${types.map(() => '?').join(',')})
     AND status = 'success'
     AND MONTH(created_at) = MONTH(NOW())
     AND YEAR(created_at) = YEAR(NOW())`,
    [userId, ...types]
  );
  
  const monthlyUsed = monthlyResult[0].total;
  const monthlyRemaining = limit.monthly - monthlyUsed;
  
  if (amount > monthlyRemaining) {
    throw new Error(
      `Monthly limit exceeded. Used: ₦${monthlyUsed}, Limit: ₦${limit.monthly}`
    );
  }
  
  return {
    allowed: true,
    daily: { used: dailyUsed, limit: limit.daily, remaining: dailyRemaining },
    monthly: { used: monthlyUsed, limit: limit.monthly, remaining: monthlyRemaining }
  };
}
```

---

## SECTION 11: ADDITIONAL SECURITY HARDENING

### 11.1 SQL Injection Prevention - Prepared Statements Validation

```javascript
// backend/middleware/dbSecurityAudit.js - CREATE
// Add request-time validation that queries use parameters
export function validatePreparedStatements(req, res, next) {
  // Log ALL database queries in development
  if (process.env.NODE_ENV !== 'production') {
    const originalQuery = pool.query.bind(pool);
    pool.query = function(sql, values, ...args) {
      // Check if SQL has ? placeholders for all user inputs
      const paramCount = (sql.match(/\?/g) || []).length;
      const valueCount = Array.isArray(values) ? values.length : 0;
      
      if (paramCount !== valueCount) {
        console.warn('⚠️ Query parameter mismatch!', { sql, valueCount, paramCount });
      }
      
      return originalQuery(sql, values, ...args);
    };
  }
  
  next();
}
```

---

### 11.2 HTTP Security Headers

```javascript
// backend/server.js - ADD ALL SECURITY HEADERS
import helmet from 'helmet';

// Apply comprehensive security headers
app.use(helmet({
  // Prevent clickjacking
  frameguard: {
    action: 'deny'
  },
  // Prevent MIME-type sniffing
  noSniff: true,
  // Enable XSS protection in older browsers
  xssFilter: true,
  // Control referrer information
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Certificate transparency policy
  expectCt: { maxAge: 86400 },
  // Propagate HTTPS usage
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  // Permissions policy
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
      payment: ["'self'"],
      usb: ["'none'"]
    }
  }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'nonce-{random}'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=(self)');
  next();
});
```

---

### 11.3 Account Lockout Mechanism

```sql
-- Add database columns for lockout
ALTER TABLE users ADD COLUMN failed_login_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN last_login_attempt TIMESTAMP NULL;

ALTER TABLE admins ADD COLUMN failed_login_count INT DEFAULT 0;
ALTER TABLE admins ADD COLUMN locked_until TIMESTAMP NULL;
ALTER TABLE admins ADD COLUMN last_login_attempt TIMESTAMP NULL;
```

---

## SECTION 12: UI/UX IMPROVEMENTS AND NEW PAGES

Based on security audit and best practices, recommend the following UI improvements and new pages:

### 12.1 NEW PAGES TO ADD

#### 1. **Security Dashboard Page** (`/dashboard/security`)
   - Display device ID and associated devices
   - Show login history with timestamps, IPs, device types
   - Option to logout from other devices
   - Active sessions management
   - Two-factor authentication status
   - Security alerts/notifications

#### 2. **Change Password Page** (`/settings/change-password`)
   - Current password verification
   - New password with strength indicator
   - Password confirmation
   - Show requirements (uppercase, lowercase, numbers, special chars)
   - Logout after password change for security

#### 3. **Security Questions Setup Page** (`/settings/security-questions`)
   - Select 3-5 security questions
   - Answer validation
   - Option to change answers periodically

#### 4. **Two-Factor Authentication Setup** (`/settings/2fa`)
   - Authenticator app (TOTP) setup with QR code
   - Backup codes generation
   - Recovery options
   - Disable 2FA with verification

#### 5. **KYC Verification Page** (`/verification/kyc`)
   - Step-by-step KYC process
   - BVN verification
   - Document upload (ID, proof of address)
   - Verification status tracker
   - Rejection reason display
   - Resubmission option

#### 6. **Transaction History with Filters** (`/transactions`)
   - Advanced filtering (date range, amount, type, status)
   - Export to CSV/PDF
   - Transaction details modal
   - Dispute/report transaction button

#### 7. **Card Management Page** (`/settings/cards`)
   - Add/remove cards
   - Set default card
   - View card details (last 4 digits only)
   - Card activity log
   - Lock/unlock card temporarily

#### 8. **Beneficiary Management** (`/wallet/beneficiaries`)
   - Add new beneficiary with validation
   - Edit beneficiary details
   - Delete beneficiary with confirmation
   - Quick action buttons for frequent transfers

#### 9. **Account Closure/Suspension Page** (`/settings/account`)
   - Option to close account permanently
   - Confirmation steps
   - Data export before closure
   - Reason for closure survey

#### 10. **Security Alert Page** (`/alerts`)
   - Login from new device alerts
   - Password change notifications
   - Failed login attempts
   - KYC status changes
   - Transaction dispute alerts

### 12.2 UI COMPONENT IMPROVEMENTS

#### 1. **Password Strength Indicator**
```tsx
// src/components/PasswordStrengthIndicator.tsx
import { useState } from 'react';
import zxcvbn from 'zxcvbn';

export function PasswordStrengthIndicator({ password }: { password: string }) {
  const [strength, setStrength] = useState(0);

  const handlePasswordChange = (pwd: string) => {
    if (!pwd) {
      setStrength(0);
      return;
    }
    const result = zxcvbn(pwd);
    setStrength(result.score);
  };

  const colors = ['#dc2626', '#f97316', '#eab308', '#84cc16', '#22c55e'];
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="space-y-2">
      <div className="flex h-2 gap-1">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="flex-1 h-full rounded transition-colors"
            style={{
              backgroundColor: i < strength ? colors[strength - 1] : '#e5e7eb'
            }}
          />
        ))}
      </div>
      <p className="text-sm font-medium">{labels[strength] || 'No password'}</p>
    </div>
  );
}
```

#### 2. **Transaction Status Badge**
```tsx
// src/components/TransactionStatusBadge.tsx
export function TransactionStatusBadge({ status }: { status: string }) {
  const statusStyles = {
    success: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    disputed: 'bg-orange-100 text-orange-800'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
```

#### 3. **Device Trust Indication**
```tsx
// src/components/DeviceTrustIndicator.tsx
export function DeviceTrustIndicator({ isTrusted, lastSeen }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${isTrusted ? 'bg-green-500' : 'bg-gray-300'}`} />
      <span className="text-sm">{isTrusted ? 'Trusted' : 'New Device'}</span>
      <span className="text-xs text-gray-500">{lastSeen}</span>
    </div>
  );
}
```

#### 4. **Enhanced Login Page with Device Fingerprinting**
```tsx
// src/pages/Login.tsx - UPDATED
import { useEffect, useState } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export function LoginPage() {
  const [deviceFingerprint, setDeviceFingerprint] = useState('');

  useEffect(() => {
    FingerprintJS.load().then(fp => {
      fp.get().then(result => {
        setDeviceFingerprint(result.visitorId);
      });
    });
  }, []);

  const handleLogin = async (email: string, password: string, totp?: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Fingerprint': deviceFingerprint,
        'X-Device-ID': getDeviceId()
      },
      body: JSON.stringify({ email, password, totp })
    });

    // Handle response...
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      {/* Login form JSX */}
    </div>
  );
}
```

#### 5. **Admin Security Dashboard**
```tsx
// src/pages/admin/SecurityDashboard.tsx
export function AdminSecurityDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Failed Logins This Hour */}
        <Card title="Failed Logins" subtitle="24 this hour" />
        
        {/* Suspicious Activities */}
        <Card title="Alerts" subtitle="3 pending review" />
        
        {/* System Health */}
        <Card title="System Health" subtitle="100% uptime" />
      </div>

      {/* Recent Security Events */}
      <Card title="Recent Security Events">
        <SecurityEventsList events={events} />
      </Card>

      {/* KYC Verification Queue */}
      <Card title="Pending KYC Reviews">
        <KYCReviewQueue items={pendingKYC} />
      </Card>
    </div>
  );
}
```

### 12.3 RECOMMENDED DESIGN UPDATES

1. **Add visual lock icons** next to sensitive information
2. **Implement progressive disclosure** for sensitive data (show last 4 digits only)
3. **Add loading skeletons** for API calls to prevent data flashing
4. **Implement error boundaries** with user-friendly error messages
5. **Add toast notifications** for security-relevant events
6. **Display security warnings** when logging in from new devices
7. **Add visual confirmation** for sensitive operations (e.g., transfers)
8. **Implement timeout warnings** for idle sessions

---

## SECTION 13: IMPLEMENTATION TIMELINE & PRIORITY

### Phase 1: CRITICAL (1-2 weeks) - Production Blocking
1. Remove hardcoded JWT secrets
2. Add mandatory environment variable validation
3. Add webhook IP whitelist enforcement
4. Implement idempotency locking for webhooks
5. Enforce admin TOTP globally

### Phase 2: HIGH (2-4 weeks)
1. Encrypt PII and financial data in database
2. Implement secrets management (AWS Secrets Manager)
3. Add request validation middleware
4. Update CSRF token configuration
5. Implement proper error logging

### Phase 3: MEDIUM (1-2 months)
1. Add rate limiting per-email for admin
2. Implement token cleanup job
3. Add field-level validation in database
4. Implement enhanced logging/redaction
5. Add security headers

### Phase 4: UI/FEATURES (Ongoing)
1. Security dashboard
2. Device management
3. Transaction history improvements
4. KYC verification flow
5. Account security settings

---

## SECTION 14: TESTING & VERIFICATION

### Security Testing Checklist

```bash
# 1. Test JWT Secret Validation
npm test -- tests/security/jwt-secrets.test.js

# 2. Test CSRF Protection
npm test -- tests/security/csrf.test.js

# 3. Test Input Validation
npm test -- tests/security/validation.test.js

# 4. Test Rate Limiting
npm test -- tests/security/rate-limiting.test.js

# 5. Test Database Queries (Injection)
npm test -- tests/security/sql-injection.test.js

# 6. Test Encryption/Decryption
npm test -- tests/security/encryption.test.js

# 7. Test Webhook Idempotency
npm test -- tests/security/webhook-idempotency.test.js

# 8. Test Auth Flows
npm test -- tests/security/auth-flows.test.js

# Run all security tests
npm test -- tests/security/
```

### Penetration Testing Commands

```bash
# Check for exposed secrets
git log --all --oneline --decorate --graph | grep -i secret

# Check environment variables in memory
ps aux | grep node

# Test CSRF protection
curl -X POST http://localhost:3000/api/wallet/transfer \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}' \
  # Should fail without CSRF token

# Test SQL Injection
curl -X GET 'http://localhost:3000/api/user?id=1" OR "1"="1'

# Test XSS
curl -X POST http://localhost:3000/api/auth/register \
  -d 'email=<script>alert(1)</script>@example.com'
```

---

## SECTION 15: MONITORING & INCIDENT RESPONSE

### Setup Monitoring

```javascript
// backend/monitoring/security-monitor.js - CREATE
import { logger } from '../utils/logger.js';

export class SecurityMonitor {
  static trackFailedLogin(email, ip) {
    logger.warn('SECURITY: Failed login attempt', {
      email: sanitizeEmail(email),
      ip,
      timestamp: new Date()
    });
    
    // Alert if > 10 attempts from same IP in last hour
    checkBruteForcePattern(ip);
  }
  
  static trackUnauthorizedAccess(userId, resource) {
    logger.error('SECURITY: Unauthorized access attempt', {
      userId,
      resource,
      timestamp: new Date()
    });
    
    // Notify security team
    alertSecurityTeam({
      severity: 'high',
      message: `Unauthorized access attempt by user ${userId} to ${resource}`
    });
  }
  
  static trackWeakPassword(email) {
    logger.warn('SECURITY: Weak password created', {
      email: sanitizeEmail(email)
    });
  }
  
  static trackTokenExpiry(userId) {
    logger.info('Token expired', { userId });
    // Could trigger re-authentication
  }
}

// Setup alerts
const alertRules = [
  { event: 'CRITICAL_ERROR', action: 'page_ops_team' },
  { event: 'SQL_INJECTION_ATTEMPT', action: 'block_ip_and_notify' },
  { event: 'BRUTE_FORCE_DETECTED', action: 'lock_account_and_notify' },
  { event: 'UNAUTHORIZED_ACCESS', action: 'log_and_notify' }
];
```

---

## CONCLUSION

This audit reveals **strong foundational security practices** but requires **immediate remediation** of:

1. **CRITICAL:** Hardcoded secrets and plaintext API keys
2. **HIGH:** Missing PII encryption, webhook vulnerabilities
3. **MEDIUM:** CSRF config, logging/redaction, rate limiting

Following this guide will significantly harden your application against attacks, improve data protection, and ensure compliance with financial regulations.

**Next Steps:**
1. Review all findings with your team
2. Prioritize Phase 1 items (production blocking)
3. Implement fixes using provided code snippets
4. Run security tests to validate changes
5. Schedule Phase 2 implementation timeline

For questions or clarifications on any vulnerability, refer to the detailed explanations and code samples throughout this document.
