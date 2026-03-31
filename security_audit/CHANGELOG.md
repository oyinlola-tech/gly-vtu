# Changelog

## Confidentiality and Authorized Access
The Software is proprietary and confidential. You may not disclose, share, or make any part of the codebase available to third parties without prior written authorization from the owner. Use is permitted only to individuals or entities expressly granted access by the owner.

All notable changes to this project will be documented in this file.

## [Unreleased - Phase 1-4 Security Hardening] - 2026-03-31

### 🔴 CRITICAL Security Enhancements

#### Secret Key Isolation & Production Validation (Phase 1.1)
- Implemented 4-secret architecture: JWT_SECRET, JWT_ADMIN_SECRET, PII_ENCRYPTION_KEY, COOKIE_ENC_SECRET
- Added production startup validation ensuring all secrets are ≥32 chars, non-default, and unique
- Modified `backend/utils/encryption.js` - Removed JWT_SECRET fallback, requires PII_ENCRYPTION_KEY
- Modified `backend/utils/secureCookie.js` - Removed JWT_SECRET fallback, requires COOKIE_ENC_SECRET
- **Impact**: Single secret compromise no longer cascades to all systems

#### Webhook IP Whitelist & Event Deduplication (Phase 1.2)
- Implemented mandatory IP validation in `backend/routes/flutterwaveWebhook.js`
- Added event ID deduplication with 5-minute processing window
- Requires FLW_WEBHOOK_IPS environment variable in production
- **Impact**: Forged webhooks blocked, double-crediting prevented

#### localStorage XSS Exposure Prevention (Phase 1.3)
- Migrated sensitive user data from localStorage to sessionStorage in `src/contexts/AuthContext.tsx`
- Migrated admin data in `src/contexts/AdminAuthContext.tsx`
- Migrated device ID in `src/services/api.ts`
- **Impact**: XSS attack window reduced from indefinite to session duration

#### CORS Wildcard Enforcement (Phase 1.4)
- Added production validation rejecting wildcard CORS origins
- Requires explicit CORS_ORIGIN configuration in production
- Added HTTP-to-HTTPS migration warnings
- **Impact**: Only specified origins can access API

### 🟠 HIGH Priority Security Enhancements

#### Session Revocation Endpoint (Phase 2.1)
- Added `POST /api/auth/logout-all` endpoint in `backend/routes/auth.js`
- Requires password confirmation for security
- Revokes all user refresh tokens atomically
- **Impact**: Users can force logout from all devices

#### KYC Provider Response Validation (Phase 2.2)
- Added sanitization functions in `backend/utils/kycProvider.js`
- Prevents SQL injection and data corruption via KYC data
- String length limits and character filtering
- **Impact**: Safe handling of third-party identity verification data

#### Rate Limiter Failure Handling (Phase 2.3)
- Added Redis connection monitoring in `backend/middleware/rateLimiters.js`
- Graceful degradation when Redis unavailable (with production warnings)
- **Impact**: Rate limiting resilient to component failures

#### Audit Log Retention Enforcement (Phase 2.4)
- Implemented minimum retention periods in `backend/utils/retention.js`
- Audit logs: 365 days minimum
- Security events: 180 days minimum
- Webhook events: 90 days minimum
- **Impact**: Regulatory compliance and forensic availability

#### Device ID Exposure Prevention (Phase 2.5)
- Moved device fingerprinting to sessionStorage (was localStorage)
- **Impact**: Device fingerprint not accessible to persistent XSS

### 🟡 MEDIUM Priority Security Enhancements

#### Token Family Max Lifetime (Phase 3.1)
- Added MAX_REFRESH_LIFETIME_DAYS enforcement in `backend/utils/tokens.js`
- Default 90 days maximum per token family
- Rejects rotation requests for expired families
- **Impact**: No indefinite session extension even with sliding window

### 🟢 Frontend Security Hardening

#### Content Security Policy Enforcement (Phase 4.1)
- Removed 'unsafe-inline' from scriptSrc in server.js
- Added strict object-src, base-src, frame-src, form-action, worker-src directives
- Verified index.html has no inline scripts
- **Impact**: Inline script XSS attacks blocked

### 📝 Configuration Updates
- Updated `.env.example` with comprehensive secret documentation
- Added environment variable requirements for webhook IPs
- Added data retention policy configuration

### 🏗️ Build Status
- ✅ All 2184 modules transformed successfully
- ✅ Zero compilation errors
- ✅ Production build generated cleanly

## [Unreleased - Phase 1 Security Hardening] - 2026-03-31
### Security Enhancements (Critical Fixes)
- **Enhanced JWT Validation**: Upgraded `backend/middleware/auth.js` and `adminAuth.js` with explicit token expiration checks, algorithm validation, and improved error handling
- **CSRF Token Rotation**: Implemented automatic token rotation after successful CSRF validation in `backend/middleware/csrf.js`
- **JWT Expiration Validation**: Added double-checks for token `exp` claim and explicit timing validation beyond `jwt.verify()`
- **Admin Auth Hardening**: Enhanced admin middleware with robust JWT validation and security event logging
- **CSRF Logging**: Added comprehensive logging for CSRF violations to track potential attack attempts

### Bug Fixes
- Fixed JWT algorithm specification to explicitly require HS256 (prevents algorithm confusion attacks)
- Improved error messages for token validation failures without leaking sensitive information

### Code Quality
- Added detailed comments in auth middlewares explaining security validations
- Enhanced logging with structured format for security investigations

## [0.0.1] - 2026-03-30
- Initial project structure
- Comprehensive security audit documentation
- API framework setup with Express and MySQL2
- Frontend architecture with React and TypeScript
- Payment integrations (Flutterwave, Vtpass)
- Authentication system with JWT and TOTP support
