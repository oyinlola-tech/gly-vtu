# CRITICAL SECURITY FIXES - Ready-to-Apply Code Patches
**Priority:** IMMEDIATE (Next 24-48 Hours)  
**Total Time Estimate:** 6-8 hours for implementation + testing

---

## PATCH 1: Fix Secret Key Fallback Vulnerabilities

### File: `backend/utils/tokens.js`
**Find and replace lines 16-18:**

```javascript
// BEFORE (VULNERABLE)
const DEFAULT_SECRET = process.env.COOKIE_ENC_SECRET || process.env.JWT_SECRET;

// AFTER (SECURE)
const COOKIE_ENC_SECRET = process.env.COOKIE_ENC_SECRET;
if (!COOKIE_ENC_SECRET) {
  throw new Error(
    'CRITICAL: COOKIE_ENC_SECRET environment variable must be set. ' +
    'It must be different from JWT_SECRET. ' +
    'Generate with: node -e \"console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))\"'
  );
}
if (COOKIE_ENC_SECRET.length < 32) {
  throw new Error('CRITICAL: COOKIE_ENC_SECRET must be at least 32 characters');
}

const DEFAULT_SECRET = COOKIE_ENC_SECRET;
```

---

### File: `backend/utils/encryption.js`  
**Find and replace lines 13-20:**

```javascript
// BEFORE (VULNERABLE)
const masterSecret = process.env.PII_ENCRYPTION_KEY || process.env.JWT_SECRET;

// AFTER (SECURE)
const PII_ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY;
if (!PII_ENCRYPTION_KEY) {
  throw new Error(
    'CRITICAL: PII_ENCRYPTION_KEY environment variable must be set. ' +
    'It must be different from JWT_SECRET. ' +
    'Generate with: node -e \"console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))\"'
  );
}
if (PII_ENCRYPTION_KEY.length < 32) {
  throw new Error('CRITICAL: PII_ENCRYPTION_KEY must be at least 32 characters');
}

const masterSecret = PII_ENCRYPTION_KEY;
```

---

### File: `.env.example`
**Add these lines (NO actual secrets):**

```bash
# ===== AUTHENTICATION SECRETS (Generate unique values) =====
# These MUST all be different and at least 32 characters
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

JWT_SECRET=<GENERATE_NEW_VALUE_32_CHARS_MIN>
JWT_ADMIN_SECRET=<GENERATE_NEW_VALUE_32_CHARS_MIN_DIFFERENT_FROM_JWT_SECRET>
COOKIE_ENC_SECRET=<GENERATE_NEW_VALUE_32_CHARS_MIN_DIFFERENT_FROM_ABOVE>
PII_ENCRYPTION_KEY=<GENERATE_NEW_VALUE_32_CHARS_MIN_DIFFERENT_FROM_ABOVE>

# ===== WEBHOOK SECRETS =====
FLW_WEBHOOK_SECRET=<FROM_FLUTTERWAVE_DASHBOARD>
VTPASS_WEBHOOK_SECRET=<FROM_VTPASS_DASHBOARD>

# ===== WEBHOOK IP WHITELISTS (Required in production) =====
# Get IPs from provider documentation
FLW_WEBHOOK_IPS=192.0.2.1,192.0.2.2,192.0.2.3
VTPASS_WEBHOOK_IPS=203.0.113.1,203.0.113.2

# DO NOT USE WILDCARD (*) IN PRODUCTION
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,https://yourdomain.com
```

---

## PATCH 2: Fix AdminAuthContext - Remove Admin Data from localStorage

### File: `src/contexts/AdminAuthContext.tsx`
**Replace entire file with:**

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface AdminProfile {
  id: string;
  email: string;
  role: 'superadmin' | 'operations' | 'support' | 'finance' | 'compliance';
  permissions: string[];
  createdAt: string;
}

interface AdminAuthContextType {
  admin: AdminProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, totpToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Validate session on app load
  useEffect(() => {
    validateSession();
  }, []);

  const validateSession = async () => {
    try {
      const response = await fetch('/app/admin/api/profile', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.admin);
      } else if (response.status === 401) {
        // Not authenticated - stay on login page
        setAdmin(null);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Session validation failed:', error);
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, totpToken?: string) => {
    try {
      setIsLoading(true);

      const response = await fetch('/app/admin/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password, totpToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Admin profile and token come from backend (token in httpOnly cookie)
      setAdmin(data.admin);

      // Navigate to dashboard
      navigate('/admin/dashboard');
    } catch (error) {
      setAdmin(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await fetch('/app/admin/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAdmin(null);
      setIsLoading(false);
      navigate('/admin/login');
    }
  };

  const refreshProfile = async () => {
    try {
      const response = await fetch('/app/admin/api/profile', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.admin);
      } else {
        setAdmin(null);
      }
    } catch (error) {
      console.error('Profile refresh failed:', error);
      setAdmin(null);
    }
  };

  const value: AdminAuthContextType = {
    admin,
    isLoading,
    isAuthenticated: admin !== null,
    login,
    logout,
    refreshProfile
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
```

---

## PATCH 3: Fix AuthContext - Remove User Data from localStorage

### File: `src/contexts/AuthContext.tsx`
**Replace entire file with:**

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  kycLevel: 0 | 1 | 2 | 3;
  kycStatus: 'pending' | 'verified' | 'rejected';
  hasPin: boolean;
  walletBalance: number;
  createdAt: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (data: any) => Promise<void>;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Validate session on app load
  useEffect(() => {
    validateSession();
  }, []);

  const validateSession = async () => {
    try {
      const response = await fetch('/app/api/user/profile', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else if (response.status === 401) {
        // Not authenticated
        setUser(null);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Session validation failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (registrationData: any) => {
    try {
      setIsLoading(true);

      const response = await fetch('/app/api/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(registrationData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // User profile set by backend
      setUser(data.user);
      navigate('/dashboard');
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, totpCode?: string) => {
    try {
      setIsLoading(true);

      const response = await fetch('/app/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password, totpCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // User profile and token from backend
      setUser(data.user);
      navigate('/dashboard');
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await fetch('/app/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsLoading(false);
      navigate('/login');
    }
  };

  const refreshProfile = async () => {
    try {
      const response = await fetch('/app/api/user/profile', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Profile refresh failed:', error);
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    register,
    login,
    logout,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## PATCH 4: Fix Webhook Race Condition & Add Row Locking

### File: `backend/routes/flutterwaveWebhook.js`
**Replace the entire POST handler (around lines 25-120):**

```javascript
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { webhookLimiter } from '../middleware/rateLimiters.js';
import express from 'express';

const router = express.Router();

// Helper: Timing-safe comparison
function timingSafeEqual(a, b) {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Helper: Validate webhook IP
function isIpAllowed(req) {
  const allowedIpsEnv = process.env.FLW_WEBHOOK_IPS || '';
  const allowedIps = allowedIpsEnv
    .split(',')
    .map(ip => ip.trim())
    .filter(Boolean);

  // FAIL-CLOSED: Production requires explicit IPs
  if (process.env.NODE_ENV === 'production' && allowedIps.length === 0) {
    logger.error('CRITICAL: FLW_WEBHOOK_IPS not configured in production');
    return false;
  }

  // If IPs configured, check against them
  if (allowedIps.length > 0) {
    return allowedIps.includes(req.ip);
  }

  // Only allow in dev if explicitly enabled
  if (process.env.ALLOW_ANY_WEBHOOK_IP === 'true') {
    logger.warn('WARNING: Webhook IP validation disabled (dev only)');
    return true;
  }

  return false;
}

// Webhook handler with transaction isolation and row locking
router.post('/', webhookLimiter, async (req, res) => {
  const conn = await pool.getConnection();

  try {
    // STEP 1: Validate IP first
    if (!isIpAllowed(req)) {
      logger.warn('Webhook IP rejected', {
        ip: req.ip,
        expected: process.env.FLW_WEBHOOK_IPS
      });
      return res.status(403).json({ success: false, error: 'IP not allowed' });
    }

    // STEP 2: Validate webhook signature (before DB operations)
    const secret = process.env.FLW_WEBHOOK_SECRET;
    if (!secret) {
      logger.error('CRITICAL: FLW_WEBHOOK_SECRET not configured');
      return res.status(503).json({ success: false });
    }

    const hash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (!timingSafeEqual(hash, req.headers['verif-hash'] || '')) {
      logger.warn('Invalid webhook signature', { ip: req.ip });
      return res.status(401).json({ success: false });
    }

    // STEP 3: Begin transaction with SERIALIZABLE isolation to prevent race conditions
    await conn.beginTransaction('SERIALIZABLE');

    const { event, data: body } = req.body;

    // STEP 4: Check for duplicate within LOCKED transaction
    // Using FOR UPDATE to lock the row and prevent concurrent modifications
    const [existingTx] = await conn.query(
      'SELECT id, user_id FROM flutterwave_transactions WHERE reference = ? FOR UPDATE',
      [body.reference]
    );

    if (existingTx.length > 0) {
      // Already processed - just commit and return success (idempotent)
      await conn.commit();
      logger.info('Webhook already processed (duplicate)', {
        reference: body.reference,
        userId: existingTx[0].user_id
      });
      return res.json({ success: true, duplicate: true });
    }

    // STEP 5: Validate webhook event type
    if (event !== 'charge.completed' || body.status !== 'successful') {
      await conn.rollback();
      logger.info('Webhook ignored (not completed charge)', { event, status: body.status });
      return res.json({ success: true });
    }

    // STEP 6: Extract and validate transaction data
    const userId = body.meta?.user_id;
    const amount = parseInt(body.amount) / 100; // Convert cents to whole currency
    const currency = body.currency;

    // Input validation
    if (!userId || !amount || amount <= 0 || currency !== 'NGN') {
      await conn.rollback();
      logger.warn('Invalid webhook payload', { body });
      return res.status(400).json({ success: false });
    }

    // STEP 7: Lock wallet row and fetch current balance
    const [[wallet]] = await conn.query(
      'SELECT id, balance FROM wallets WHERE user_id = ? FOR UPDATE',
      [userId]
    );

    if (!wallet) {
      await conn.rollback();
      logger.warn('Wallet not found for webhook', { userId });
      return res.status(404).json({ success: false });
    }

    // STEP 8: Update wallet (guaranteed atomic with row lock)
    const newBalance = wallet.balance + amount;
    await conn.query(
      'UPDATE wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
      [newBalance, wallet.id]
    );

    // STEP 9: Record transaction
    await conn.query(
      `INSERT INTO flutterwave_transactions
       (user_id, reference, amount, currency, status, metadata, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        body.reference,
        amount,
        currency,
        'completed',
        JSON.stringify(body), // Store full webhook payload for audit
        req.ip
      ]
    );

    // STEP 10: Log security event
    await conn.query(
      `INSERT INTO security_events
       (user_id, event_type, severity, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        'wallet.credited_webhook',
        'info',
        JSON.stringify({
          amount,
          reference: body.reference,
          source: 'flutterwave'
        }),
        req.ip,
        req.get('user-agent')
      ]
    );

    // STEP 11: Commit transaction (all succeeded atomically)
    await conn.commit();

    logger.info('Webhook processed successfully', {
      userId,
      amount,
      reference: body.reference,
      newBalance
    });

    return res.json({ success: true });

  } catch (error) {
    try {
      await conn.rollback();
    } catch (rollbackError) {
      logger.error('Rollback failed', { error: rollbackError.message });
    }

    logger.error('Webhook processing failed', {
      error: error.message,
      stack: error.stack
    });

    // Never expose internal errors to webhook sender
    return res.status(500).json({ success: false });

  } finally {
    try {
      conn.release();
    } catch (releaseError) {
      logger.error('Connection release failed', { error: releaseError.message });
    }
  }
});

export default router;
```

---

## PATCH 5: Block CORS Wildcard in Production

### File: `server.js`
**Find and replace CORS section (around lines 75-95):**

```javascript
// BEFORE - VULNERABLE
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed'));
    }
  }
};

// AFTER - SECURE
const corsOptions = {
  origin: function (origin, callback) {
    // CRITICAL SECURITY: Block wildcard CORS in production
    if (origin === '*') {
      const msg = 'Wildcard CORS (*) is not allowed';
      if (process.env.NODE_ENV === 'production') {
        logger.error('SECURITY VIOLATION: Wildcard CORS attempted in production');
        return callback(new Error(msg));
      }
      logger.warn('Dev warning: Wildcard CORS used (not allowed in production)');
    }

    // Check origin against whitelist
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS rejected for origin', { origin, allowed: allowedOrigins });
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  // Security hardening
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Accept'],
  exposedHeaders: ['X-Total-Count'], // For pagination
  maxAge: 3600 // Preflight cache: 1 hour
};
```

---

## PATCH 6: Hash Admin Backup Codes

### File: `backend/utils/passwords.js` (ALREADY EXISTS)
**Add these functions:**

```javascript
import bcrypt from 'bcryptjs';

/**
 * Hash array of backup codes for secure storage
 * @param {string[]} codes - Array of plain backup codes
 * @returns {Promise<string[]>} Array of hashed codes
 */
export async function hashBackupCodes(codes) {
  if (!Array.isArray(codes)) {
    throw new Error('Codes must be an array');
  }

  const hashedCodes = await Promise.all(
    codes.map(code => {
      if (typeof code !== 'string' || code.length < 4) {
        throw new Error('Invalid code format');
      }
      return bcrypt.hash(code, 12);
    })
  );

  return hashedCodes;
}

/**
 * Verify a backup code against hashed codes
 * @param {string} plainCode - The backup code user provided
 * @param {string[]} hashedCodes - Array of hashed codes from database
 * @returns {Promise<number>} Index of matching code, or -1 if no match
 */
export async function verifyBackupCode(plainCode, hashedCodes) {
  if (typeof plainCode !== 'string' || !Array.isArray(hashedCodes)) {
    return -1;
  }

  for (let i = 0; i < hashedCodes.length; i++) {
    try {
      if (await bcrypt.compare(plainCode, hashedCodes[i])) {
        return i; // Return index so we can remove this used code
      }
    } catch (error) {
      // Skip this code if comparison fails
      continue;
    }
  }

  return -1; // No match found
}

/**
 * Generate backup codes
 * @param {number} count - Number of codes to generate
 * @returns {string[]} Array of backup codes
 */
export function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto
      .randomBytes(6)
      .toString('hex')
      .substring(0, 8)
      .toUpperCase();
    codes.push(code);
  }
  return codes;
}
```

---

### File: `backend/routes/adminAuth.js`
**Find TOTP setup endpoint (around line 260) and update:**

```javascript
import { hashBackupCodes, generateBackupCodes, verifyBackupCode } from '../utils/passwords.js';

// When generating new backup codes
router.post('/totp/setup', auth, adminAuth, async (req, res) => {
  try {
    const { secret, token } = req.body;

    // Verify TOTP token is correct
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid TOTP token' });
    }

    // Generate backup codes
    const plainBackupCodes = generateBackupCodes(8);
    const hashedBackupCodes = await hashBackupCodes(plainBackupCodes);

    // Store hashed codes
    await pool.query(
      `UPDATE admin_users 
       SET totp_secret = ?, backup_codes_json = ?, updated_at = NOW()
       WHERE id = ?`,
      [secret, JSON.stringify(hashedBackupCodes), req.admin.id]
    );

    // Log security event
    await pool.query(
      `INSERT INTO security_events 
       (user_id, event_type, severity, details)
       VALUES (?, ?, ?, ?)`,
      [req.admin.id, 'admin.totp_enabled', 'critical', JSON.stringify({ timestamp: new Date() })]
    );

    // Return backup codes ONLY once (user must save them)
    return res.json({
      success: true,
      message: 'TOTP enabled successfully. Save these backup codes in a secure location.',
      backupCodes: plainBackupCodes,
      instructions: 'If you lose access to your authenticator, use these codes to regain access. Each code can only be used once.'
    });

  } catch (error) {
    logger.error('TOTP setup failed', { error: error.message });
    return res.status(500).json({ error: 'Setup failed' });
  }
});

// When using backup code
router.post('/totp/verify-backup', async (req, res) => {
  try {
    const { email, backupCode } = req.body;

    const [rows] = await pool.query(
      'SELECT id, backup_codes_json FROM admin_users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Admin not found' });
    }

    const admin = rows[0];
    let hashedCodes = [];

    try {
      hashedCodes = JSON.parse(admin.backup_codes_json || '[]');
    } catch (error) {
      logger.error('Invalid backup codes format', { adminId: admin.id });
      return res.status(500).json({ error: 'Internal error' });
    }

    // Verify the backup code
    const codeIndex = await verifyBackupCode(backupCode, hashedCodes);

    if (codeIndex === -1) {
      logger.warn('Invalid backup code attempted', { adminId: admin.id, ip: req.ip });
      return res.status(401).json({ error: 'Invalid backup code' });
    }

    // Remove used code
    hashedCodes.splice(codeIndex, 1);

    // Update database (remove used code)
    await pool.query(
      'UPDATE admin_users SET backup_codes_json = ? WHERE id = ?',
      [JSON.stringify(hashedCodes), admin.id]
    );

    // Log security event
    await pool.query(
      `INSERT INTO security_events 
       (user_id, event_type, severity, details)
       VALUES (?, ?, ?, ?)`,
      [admin.id, 'admin.backup_code_used', 'warning', JSON.stringify({ remaining: hashedCodes.length })]
    );

    // Issue new session
    const token = jwt.sign(
      { sub: admin.id, role: 'admin' },
      process.env.JWT_ADMIN_SECRET,
      { expiresIn: '15m' }
    );

    res.cookie('adminAuth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    return res.json({
      success: true,
      message: `Backup code verified. ${hashedCodes.length} codes remaining.`
    });

  } catch (error) {
    logger.error('Backup code verification failed', { error: error.message });
    return res.status(500).json({ error: 'Verification failed' });
  }
});
```

---

## PATCH 7: Fix VTpass Webhook Error Handling

### File: `backend/routes/vtpassWebhook.js`
**Update error handling section (around line 25-35):**

```javascript
// BEFORE (throws error)
const secret = (process.env.VTPASS_WEBHOOK_SECRET || '').trim();
if (!secret) {
  throw new Error('VTPASS_WEBHOOK_SECRET not configured');
}

// AFTER (returns 503)
const secret = (process.env.VTPASS_WEBHOOK_SECRET || '').trim();
if (!secret) {
  logger.error('CRITICAL: VTPASS_WEBHOOK_SECRET not configured');
  return res.status(503).json({
    success: false,
    error: 'Service unavailable - webhook secret not configured'
  });
}

// Also add IP whitelist
const allowedIpsEnv = (process.env.VTPASS_WEBHOOK_IPS || '').trim();
const allowedIps = allowedIpsEnv.split(',').map(ip => ip.trim()).filter(Boolean);

if (process.env.NODE_ENV === 'production' && allowedIps.length === 0) {
  logger.error('CRITICAL: VTPASS_WEBHOOK_IPS not configured in production');
  return res.status(403).json({ success: false });
}

if (allowedIps.length > 0 && !allowedIps.includes(req.ip)) {
  logger.warn('VTpass webhook IP rejected', { ip: req.ip });
  return res.status(403).json({ success: false });
}
```

---

## Implementation Checklist

- [ ] Apply Patch 1 (Secret fallbacks)
  - [ ] Update `backend/utils/tokens.js`
  - [ ] Update `backend/utils/encryption.js`
  - [ ] Update `.env.example`
  - [ ] Generate new secrets for `.env`

- [ ] Apply Patch 2 (AdminAuthContext)
  - [ ] Replace `src/contexts/AdminAuthContext.tsx`
  - [ ] Test admin login flow

- [ ] Apply Patch 3 (AuthContext)
  - [ ] Replace `src/contexts/AuthContext.tsx`
  - [ ] Test user login/register flow

- [ ] Apply Patch 4 (Webhook race condition)
  - [ ] Replace `backend/routes/flutterwaveWebhook.js`
  - [ ] Add database indexes for transactions
  - [ ] Test webhook processing with concurrent requests

- [ ] Apply Patch 5 (CORS wildcard)
  - [ ] Update `server.js` CORS section
  - [ ] Test CORS with wildcard (should fail in production mode)

- [ ] Apply Patch 6 (Backup codes)
  - [ ] Add functions to `backend/utils/passwords.js`
  - [ ] Update `backend/routes/adminAuth.js` TOTP endpoints
  - [ ] Test backup code generation and usage

- [ ] Apply Patch 7 (VTpass error handling)
  - [ ] Update `backend/routes/vtpassWebhook.js`
  - [ ] Test webhook with missing secret

---

## Testing Commands

```bash
# Test secret validation (should fail)
unset JWT_SECRET
unset JWT_ADMIN_SECRET
unset COOKIE_ENC_SECRET
unset PII_ENCRYPTION_KEY
npm run dev
# Expected: Clear error messages about missing secrets

# Test CORS (in production mode)
NODE_ENV=production CORS_ORIGIN='*' npm run dev
# Expected: Fails with "Wildcard CORS not allowed"

# Test with proper secrets
npm run dev
# Expected: Server starts successfully with validation message

# Test admin login (verify no localStorage.admin)
# Open DevTools -> Application -> Local Storage
# Should NOT see 'admin' key

# Test user login (verify no localStorage.user)
# Open DevTools -> Application -> Local Storage  
# Should NOT see 'user' key
```

---

## Next Steps After Patches

1. **Quick Verification** (1-2 hours)
   - Run test suite
   - Manual testing of auth flows
   - Check that secrets are properly enforced

2. **Code Review** (1-2 hours)
   - Have team member review patches
   - Verify no regressions

3. **Deploy to Staging** (30 minutes)
   - Deploy code changes
   - Apply new secrets to .env
   - Run full integration tests

4. **Monitor & Validate** (2-4 hours)
   - Watch logs for errors
   - Verify user sessions work
   - Confirm webhook processing

5. **Production Deployment** (when team confirms)
   - Deploy to production
   - Update production secrets
   - Monitor for issues

Total time estimate: **8-12 hours** for complete implementation + testing
