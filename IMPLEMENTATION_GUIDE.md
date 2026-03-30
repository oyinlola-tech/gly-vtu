# 📋 IMPLEMENTATION GUIDE - GLY-VTU SECURITY IMPROVEMENTS

**Date**: March 30, 2026  
**Status**: READY FOR IMPLEMENTATION  
**Total Issues**: 20 (5 Critical, 8 High, 7 Medium)  

---

## QUICK REFERENCE

### Critical Fixes (This Week - 1 Hour Each)
1. **VTpass Webhook Signature** - Prevent spoofed payments
2. **PIN Entropy** - Increase from 4-6 digits to 6 digits minimum
3. **Token Storage** - Move from localStorage to httpOnly cookies
4. **Admin MFA** - Implement TOTP authentication
5. **Rate Limiting** - Add Redis for distributed rate limiting

---

## PHASE 1: CRITICAL SECURITY FIXES (Days 1-7)

### Day 1: VTpass Webhook Signature Verification (2 hours)

**File Changes**:
- `backend/routes/vtpassWebhook.js` - Implement HMAC verification
- `server.js` - Add raw body parser

**Testing**:
```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/app/api/webhooks/vtpass \
  -H "Content-Type: application/json" \
  -H "X-VTpass-Signature: invalid_sig" \
  -d '{"type":"transaction-update","data":{}}'
# Should return 401
```

**Verification**: 
- [ ] VTpass webhook fails with invalid signature
- [ ] Valid signature processes correctly
- [ ] Security event logged for failed attempts

---

### Day 2: PIN Entropy Increase (1 hour)

**File Changes**:
- `backend/utils/pin.js` - Change regex from `\d{4,6}` to `\d{6}`, add complexity check

**Database Migration**:
```sql
-- No schema change needed, just validation update
-- Old PINs still work but new ones must be 6 digits
```

**Testing**:
```bash
# Should fail
curl -X POST http://localhost:3000/app/api/user/pin \
  -H "Authorization: Bearer <token>" \
  -d '{"pin":"1234"}'  # Too short

# Should succeed
curl -X POST http://localhost:3000/app/api/user/pin \
  -H "Authorization: Bearer <token>" \
  -d '{"pin":"123456"}'
```

**Verification**:
- [ ] 4-5 digit PINs rejected
- [ ] 6 digit PIN accepted
- [ ] Sequential patterns rejected

---

### Day 3: Token Storage Migration to httpOnly Cookies (4 hours)

**Files to Change**:
- `src/services/api.ts` - Remove localStorage, use cookies only
- `backend/utils/tokens.js` - Add cookie setting function
- `backend/middleware/csrf.js` - Update CSRF validation
- `server.js` - Configure cookie settings

**Step-by-Step**:
1. Backup current api.ts
2. Implement `setTokenCookies()` in tokens.js
3. Update all token references in api.ts
4. Test on dev
5. Deploy with backwards compatibility (accept both for 2 weeks)

**Testing**:
```bash
# Login and verify cookie is set
curl -c cookies.txt -X POST http://localhost:3000/app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Check cookie
cat cookies.txt | grep _auth

# Use stored cookie for next request
curl -b cookies.txt http://localhost:3000/app/api/user/profile
```

**Verification**:
- [ ] Cookie marked as httpOnly
- [ ] Cookie marked as secure (HTTPS only in prod)
- [ ] Cookie includes samesite attribute
- [ ] Token not in localStorage
- [ ] XSS cannot steal token

---

### Day 4: Admin TOTP Implementation (6 hours)

**Files to Create/Change**:
- `backend/utils/totp.js` (NEW)
- `backend/routes/adminAuth.js` - Modify login flow
- `backend/middleware/adminAuth.js` - Add session validation
- Database: Add admin_sessions, admin_audit_events tables

**Step-by-Step**:
1. Create TOTP utility
2. Update database schema
3. Modify admin auth routes
4. Test TOTP setup and login

**Testing**:
```bash
# 1. Admin login - should return requiresTOTP
curl -X POST http://localhost:3000/app/admin/api/auth/login \
  -d '{"email":"admin@example.com","password":"password"}'

# 2. Setup TOTP
curl -X GET http://localhost:3000/app/admin/api/auth/setup-totp \
  -H "Authorization: Bearer <admin_token>"

# 3. Confirm TOTP with code from authenticator
curl -X POST http://localhost:3000/app/admin/api/auth/confirm-totp \
  -d '{"secret":"...", "totpToken":"123456", "backupCodes":[...]}'
```

**Verification**:
- [ ] Admin cannot login without TOTP
- [ ] QR code generated correctly
- [ ] Backup codes downloadable
- [ ] Session tracked in database
- [ ] Logout revokes session

---

### Day 5: Redis Rate Limiting Integration (4 hours)

**Files to Create/Change**:
- `backend/utils/redisClient.js` (NEW)
- `backend/utils/redisRateLimitStore.js` (NEW)
- `backend/middleware/rateLimiters.js` - Use Redis store
- `server.js` - Connect Redis on startup
- `.env` - Add REDIS_URL

**Step-by-Step**:
1. Install Redis dependencies (`npm install redis rate-limit-redis`)
2. Create Redis utilities
3. Update rate limiters to use Redis
4. Test with multiple requests

**Testing**:
```bash
# Install Redis locally
docker run -d -p 6379:6379 redis:7-alpine

# Test rate limiting
for i in {1..40}; do
  curl -X POST http://localhost:3000/app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}'
done
# After 30 requests, should get 429 Too Many Requests
```

**Verification**:
- [ ] Redis connection successful
- [ ] Rate limits enforced across multiple instances
- [ ] Fallback to memory store if Redis unavailable
- [ ] Graceful shutdown closes Redis connection

---

## PHASE 2: HIGH-PRIORITY SECURITY (Days 8-20)

### Device Verification System (6 hours)

**Files to Create/Change**:
- `backend/utils/deviceVerification.js` (NEW)
- `backend/routes/auth.js` - Add device endpoints
- Database: Add user_devices, device_sessions tables
- `src/services/deviceDetection.ts` (NEW)
- Frontend: Add device verification flow

**Testing**:
```bash
# Register new device
curl -X POST http://localhost:3000/app/api/auth/register-device \
  -H "Authorization: Bearer <token>" \
  -d '{"deviceId":"...", "deviceInfo":{...}}'

# Verify device via email token
curl -X POST http://localhost:3000/app/api/auth/verify-device \
  -d '{"token":"..."}'
```

---

### Field-Level Encryption for PII (8 hours)

**Files to Create/Change**:
- `backend/utils/encryption.js` (NEW)
- `backend/routes/user.js` - Encrypt KYC data
- Database: Migrate kyc_payload to encrypted field

**Migration Script**:
```javascript
// Script to encrypt existing PII
const { encryptField } = require('./backend/utils/encryption');
const { pool } = require('./backend/config/db');

async function migrateKycData() {
  const [users] = await pool.query(
    'SELECT id, kyc_payload FROM users WHERE kyc_payload IS NOT NULL'
  );

  for (const user of users) {
    const encrypted = encryptField(JSON.parse(user.kyc_payload));
    await pool.query(
      'UPDATE users SET kyc_payload = ? WHERE id = ?',
      [encrypted, user.id]
    );
    console.log(`Encrypted KYC for user ${user.id}`);
  }
}

migrateKycData().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

---

### Enhanced UI - Security Center (8 hours)

**Files to Create**:
- `src/pages/SecurityCenter.tsx` - Main security dashboard
- `src/pages/DeviceManagement.tsx` - Device list and management
- `src/pages/TwoFactorSetup.tsx` - 2FA setup wizard
- `src/pages/DeviceVerification.tsx` - Email verification page

**Routing**:
```typescript
// src/app/App.tsx
<Route path="/security-center" element={<SecurityCenter />} />
<Route path="/settings/devices" element={<DeviceManagement />} />
<Route path="/auth/setup-2fa" element={<TwoFactorSetup />} />
<Route path="/auth/verify-device" element={<DeviceVerification />} />
```

---

## PHASE 3: MEDIUM-PRIORITY (Days 21-45)

### 1. Security Questions Bank Expansion (2 hours)
### 2. Admin Approval Workflow (8 hours)
### 3. Idempotency Key TTL (1 hour)
### 4. Audit Logging Enhancement (4 hours)
### 5. Data Export & Analytics (6 hours)

---

## ENVIRONMENT SETUP

### Create `.env` file with all required variables:

```env
# Security Keys (GENERATE NEW FOR PRODUCTION)
JWT_SECRET=your_strong_random_32_char_key_here_12345678
JWT_ADMIN_SECRET=your_strong_random_32_char_key_here_87654321
ENCRYPTION_KEY=your_32_byte_hex_key_here_from_crypto_randomBytes

# Redis Configuration
REDIS_URL=redis://localhost:6379
# OR for cloud: redis://user:password@redis.cloud.com:19850

# Webhook Secrets
VTPASS_WEBHOOK_SECRET=your_secret_from_vtpass_dashboard
VTPASS_WEBHOOK_IPS=102.89.1.100,102.89.1.101

# Cookie Configuration
COOKIE_DOMAIN=localhost
# Production: COOKIE_DOMAIN=.gly-vtu.com

# Application
APP_URL=http://localhost:3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=gly_vtu

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Flutterwave
FLW_SECRET_KEY=FLWSECK_TEST_xxxx
FLW_PUBLIC_KEY=FLWPUBK_TEST_xxxx

# VTpass
VTPASS_API_KEY=your_api_key
VTPASS_PUBLIC_KEY=your_public_key
VTPASS_SECRET_KEY=your_secret_key
VTPASS_ENV=sandbox  # or production
```

---

## TESTING PLAN

### Unit Tests
```bash
npm test -- backend/utils/pin.js
npm test -- backend/utils/encryption.js
npm test -- backend/utils/totp.js
```

### Integration Tests
```bash
npm test:integration -- webhook-security
npm test:integration -- token-management
npm test:integration -- rate-limiting
```

### Security Tests
```bash
npm run test:security
# - XSS injection tests
# - SQL injection tests
# - PIN brute force tests
# - Rate limit bypass attempts
# - CSRF token validation
```

### Load Tests
```bash
# Test rate limiting under load
npm run test:load -- --rps 1000 --duration 60
```

---

## DEPLOYMENT CHECKLIST

Before deploying to production:

```
SECURITY
[ ] All JWT secrets changed from defaults
[ ] ENCRYPTION_KEY generated and secured
[ ] VTPASS_WEBHOOK_SECRET set correctly
[ ] Redis URL configured
[ ] HTTPS/TLS enabled
[ ] Helmet middleware enabled
[ ] CORS properly restricted
[ ] Cookie flags: httpOnly, secure, sameSite

DATABASE
[ ] All migrations run
[ ] PII fields encrypted
[ ] Indexes created for performance
[ ] Backup procedures tested
[ ] Database access restricted

MONITORING
[ ] Error logging configured
[ ] Security event tracking enabled
[ ] Rate limiting alerts set
[ ] Failed login monitoring
[ ] Webhook error alerts

DEPENDENCIES
[ ] npm audit passes (no high/critical)
[ ] zxcvbn, bcryptjs, jsonwebtoken versions pinned
[ ] Redis client version tested
[ ] speakeasy, qrcode versions verified

DOCUMENTATION
[ ] README updated with new pages
[ ] API documentation updated
[ ] Admin onboarding guide created
[ ] Disaster recovery plan documented
[ ] Incident response procedures defined
```

---

## ROLLBACK PLAN

Each phase has a rollback strategy:

**Phase 1 Rollback** (Token Storage):
- Tokens temporarily accepted from both localStorage and httpOnly cookies
- If issues arise within 2 weeks, revert to localStorage
- Monitor error logs for incompatibilities

**Phase 2 Rollback** (Device Verification):
- Device verification optional for first 2 weeks
- Can be disabled via feature flag: `REQUIRE_DEVICE_VERIFICATION=false`

**Phase 3 Rollback**:
- All schema changes backward compatible
- Encryption can be disabled per-field if needed

---

## SUCCESS METRICS

After completing all fixes:
- ✅ Zero critical vulnerabilities in security audit
- ✅ All webhook signatures verified
- ✅ 100% of admin accounts use TOTP
- ✅ All PII encrypted at rest
- ✅ Device verification working for new logins
- ✅ Distributed rate limiting active
- ✅ No XSS vulnerabilities in OWASP testing
- ✅ Penetration test with 0 critical findings

---

## SUPPORT & QUESTIONS

For implementation help:
1. First, review the corresponding section in SECURITY_AUDIT.md
2. Check code snippets provided
3. Run provided test commands
4. Consult library documentation if needed
5. Contact senior engineer if critical blockers

---

## TIMELINE SUMMARY

| Phase | Duration | Priority | Effort |
|-------|----------|----------|--------|
| Phase 1: Critical Fixes | 5-7 days | CRITICAL | 20 hours |
| Phase 2: High Priority | 2 weeks | HIGH | 40 hours |
| Phase 3: Medium Priority | 3-4 weeks | MEDIUM | 30 hours |
| **TOTAL** | **6-8 weeks** | - | **~90 hours** |

**Recommended Start**: Immediately - today  
**Target Completion**: May 14, 2026 (45 days)  
**Production Deployment**: Staged rollout throughout May

---

**Document Version**: 1.0  
**Last Updated**: March 30, 2026  
**Approved By**: Senior Security Engineer  
**Status**: READY TO IMPLEMENT
