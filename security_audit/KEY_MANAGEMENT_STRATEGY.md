# Key Management Strategy & Encryption Operations

**Last Updated**: March 31, 2026  
**Classification**: Internal - Operational Security  
**Owner**: Infrastructure & Security Team

---

## Overview

This document details how cryptographic keys are generated, stored, rotated, backed up, and recovered in the GLY-VTU fintech application. Proper key management is critical to maintaining the security and integrity of all encrypted data.

---

## 1. Encryption Keys Inventory

### 1.1 PII Encryption Key
**Purpose**: AES-256-GCM encryption of Personal Identifiable Information (email, phone, BVN, NIN)  
**Algorithm**: AES-256-GCM with PBKDF2 key derivation  
**Key Length**: 256 bits (32 bytes)  
**Storage**: Environment variable `PII_ENCRYPTION_KEY`  
**Rotation Frequency**: Quarterly (every 90 days)  
**Scope**: All encrypted user data in database

**Key Derivation**:
```javascript
// Input: base key (32 bytes) + user_id (UUID)
// Process: PBKDF2(password=base_key, salt=user_id, iterations=100000, hash=sha256)
// Output: 32-byte derived key per user
```

### 1.2 Cookie Encryption Secret
**Purpose**: AES-256-GCM encryption of refresh tokens stored in httpOnly cookies  
**Algorithm**: AES-256-GCM  
**Key Length**: 256 bits (32 bytes)  
**Storage**: Environment variable `COOKIE_ENC_SECRET`  
**Rotation Frequency**: Monthly (every 30 days) with graceful degradation  
**Scope**: Refresh tokens in cookies only

### 1.3 JWT Secrets (Access Token Signing Keys)
**Purpose**: Signing and verifying JWT access tokens (user and admin)  
**Algorithm**: HMAC with SHA-256 (HS256)  
**Key Length**: 256 bits (32 bytes)  
**Storage**: Environment variables `JWT_SECRET` and `JWT_ADMIN_SECRET`  
**Rotation Frequency**: Semi-annually (every 180 days)  
**Scope**: All JWT token signing/verification

**Important Note**: If JWTs signed with old key, must accept old key until token expiry to avoid user logouts. Keep old key accessible for 30 days after rotation during transition period.

### 1.4 Payment Gateway Secrets
**Purpose**: Authenticate with Flutterwave and Vtpass APIs  
**Keys**:
- `FLUTTERWAVE_SECRET_KEY` - Bearer token for Flutterwave API
- `FLUTTERWAVE_WEBHOOK_SECRET` - HMAC secret for webhook verification
- `VTPASS_API_KEY` - API key for Vtpass
- `VTPASS_API_SECRET` - Secret key for Vtpass

**Rotation Frequency**: When provider rotates (as directed by vendor)  
**Scope**: Payment integration API calls and webhook verification

---

## 2. Key Generation Process

### 2.1 Generating New Encryption Keys

**Using OpenSSL** (secure command-line method):
```bash
# Generate 32 random bytes and base64-encode
openssl rand -base64 32

# Example output: 
# aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890aBcD+8=

# Save to environment variable
export PII_ENCRYPTION_KEY="aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890aBcD+8="
```

**Using Node.js** (for automation scripts):
```javascript
const crypto = require('crypto');
const key = crypto.randomBytes(32).toString('base64');
console.log('New key:', key);
// Save to secrets management system
```

### 2.2 Key Validation On Startup

The application validates all required keys on startup via `SecretValidator`:
```javascript
// backend/utils/secretValidator.js
const requiredSecrets = [
  'JWT_SECRET',
  'JWT_ADMIN_SECRET',
  'PII_ENCRYPTION_KEY',
  'COOKIE_ENC_SECRET',
];

const invalidSecrets = requiredSecrets.filter(secret => {
  const value = process.env[secret];
  return !value || value === 'dev_secret_change_me';
});

if (invalidSecrets.length > 0) {
  throw new Error(`Missing or invalid secrets: ${invalidSecrets.join(', ')}`);
}
```

In production, the application will NOT start if any secret is missing or uses a dev default value.

---

## 3. Key Storage

### 3.1 Development Environment
- **Location**: `.env.local` file (gitignored)
- **Access**: Developer laptop only
- **Rotation**: Quarterly (optional for dev)
- **Example**:
```
JWT_SECRET=dev_secret_only_for_local
PII_ENCRYPTION_KEY=dev_key_never_use_in_production
```

### 3.2 Staging Environment
- **Location**: Secrets Manager (AWS Secrets Manager, HashiCorp Vault, or similar)
- **Access**: CI/CD pipeline + staging infrastructure only
- **Rotation**: Every 90 days
- **Retrieval**: Environment variables injected at container runtime
```bash
# In deploy script
AWS_REGION=us-east-1 ./fetch-secrets-staging.sh > .env.staging
docker run --env-file .env.staging gly-vtu:latest
```

### 3.3 Production Environment
- **Location**: **Hardware Security Module (HSM)** or high-security secrets manager
  - Option 1: AWS Secrets Manager (with rotation automation)
  - Option 2: HashiCorp Vault (on-premise)
  - Option 3: CloudHSM (if available)
- **Access**: Only production infrastructure (read-only)
- **Rotation**: Automated quarterly with zero downtime
- **Audit**: All key access logged and monitored
- **Encryption at rest**: Secrets service encrypts keys with master key

**Production Deployment**:
```bash
# At container startup
export PII_ENCRYPTION_KEY=$(aws secretsmanager get-secret-value \
  --secret-id gly-vtu/prod/pii-encryption-key \
  --query SecretString \
  --output text)
node server.js  # App reads from env var
```

---

## 4. Key Rotation Procedures

### 4.1 PII Encryption Key Rotation (Quarterly)

**Goal**: Rotate the base key used for PII encryption, re-encrypt all user data with new key

**Timeline**: 4 weeks notice before rotation

**Steps**:

1. **Week 1: Planning**
   - [ ] Generate new PII encryption key: `openssl rand -base64 32`
   - [ ] Document rotation in KEY_ROTATION_LOG.md
   - [ ] Notify ops team and schedule maintenance window (low-traffic time, 2-4 AM)
   - [ ] Prepare backup of current database
   - [ ] Create migration script

2. **Week 2-3: Testing**
   - [ ] Run re-encryption script on staging database
     ```sql
     -- Pseudo-code, actual script more complex
     UPDATE users SET email_encrypted = ENCRYPT(DECRYPT(email_encrypted, 'OLD_KEY'), 'NEW_KEY');
     UPDATE users SET phone_encrypted = ENCRYPT(DECRYPT(phone_encrypted, 'OLD_KEY'), 'NEW_KEY');
     ```
   - [ ] Verify all PII still decrypts correctly
   - [ ] Test data integrity: Random sample check 100 user records

3. **Week 4: Deployment**
   - [ ] Final database backup
   - [ ] Deploy with new key in environment
   - [ ] Run re-encryption during maintenance window (expected: 1-2 hours for millions of records)
   - [ ] Verify all decryption operations work
   - [ ] Spot-check user data (10 random users)
   - [ ] Monitor error logs for 24 hours

4. **Post-Rotation**:
   - [ ] Document completion date
   - [ ] Archive old key in secure backup (for audit trail)
   - [ ] Update KEY_ROTATION_LOG.md with date/status
   - [ ] Notify security team

**Key Point**: Old key must be retained for audit purposes (7 years) in secure backup, even after rotation.

### 4.2 JWT Secret Rotation (Semi-Annual)

**Goal**: Rotate JWT signing keys used for access tokens, re-sign active sessions

**Steps**:

1. **Prepare New Key**:
   - [ ] Generate new `JWT_SECRET` and `JWT_ADMIN_SECRET`
   - [ ] Add new keys to secrets manager (alongside old keys during transition period)

2. **Deploy with Both Keys**:
   - [ ] Update application to accept old and new keys for VERIFICATION
   - [ ] But sign ALL NEW TOKENS with new key
   - Code change:
   ```javascript
   const JWT_KEYS = {
     current: process.env.JWT_SECRET,
     legacy: process.env.JWT_SECRET_LEGACY, // Old key, read-only
   };

   // Sign with current key
   function signAccessToken(payload) {
     return jwt.sign(payload, JWT_KEYS.current, { expiresIn: '15m' });
   }

   // Accept both current and legacy for verification
   function verifyToken(token) {
     try {
       return jwt.verify(token, JWT_KEYS.current);
     } catch (err) {
       return jwt.verify(token, JWT_KEYS.legacy);
     }
   }
   ```

3. **Transition Period** (30 days):
   - [ ] All users will get new tokens automatically on next refresh
   - [ ] Users with old tokens can still access system until token expires (15 min)
   - [ ] No forced logout needed

4. **Complete Rotation** (Day 31):
   - [ ] Remove legacy key from secrets manager
   - [ ] Deploy without legacy key
   - [ ] All users have new tokens by now (old ones expired)

### 4.3 Cookie Encryption Secret Rotation (Monthly)

**Goal**: Rotate the secret used to encrypt refresh tokens in cookies

**Process**:
1. [ ] Generate new `COOKIE_ENC_SECRET`
2. [ ] Deploy with both old and new secrets
3. [ ] New refresh tokens encrypted with new secret
4. [ ] Old refresh tokens still decrypt with old secret (graceful fallback)
5. [ ] After 30 days (cookie expiry window), retire old secret

---

## 5. Key Backup & Recovery

### 5.1 Backup Strategy

**Backup Location**: Cold storage (offline, encrypted vault)
- [ ] Primary backup: Encrypted ledger in secure office safe
- [ ] Secondary backup: Encrypted cloud vault (separate from Secrets Manager)
- [ ] Tertiary backup: Second office safe (geographic redundancy)

**Backup Frequency**:
- [ ] PII Encryption Key: Backed up after generation and with each rotation
- [ ] JWT Secrets: Backed up after generation and with each rotation
- [ ] Backup verified annually (test decryption with backed-up key)

**Backup Format**:
```
# File: gly_vtu_key_backup_2026_04.txt
# Generated: 2026-03-31
# Key Type: PII_ENCRYPTION_KEY
# Valid From: 2026-03-31
# Rotation Date: 2026-06-30
# ====== START ======
aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890aBcD+8=
# ====== END ======
# HMAC Signature: <signed hash to prevent tampering>
```

**Access Control**:
- [ ] Encrypted with hardware security best practices
- [ ] Multi-signature required (2 of 3 key custodians) to retrieve backup
- [ ] Access logged: Who, When, For what purpose
- [ ] Annual rotation of backup custodians

### 5.2 Key Recovery Procedure

**Scenario**: Secrets Manager compromised, need to recover keys from backup

**Steps**:

1. **Declare Key Compromise Emergency** (security incident)
   - [ ] Page security team
   - [ ] Alert management
   - [ ] Prepare customer communication

2. **Retrieve Backup Key**:
   - [ ] Contact 2 of 3 key custodians
   - [ ] Verify identity and authorization
   - [ ] Retrieve backup from secure vault
   - [ ] Log retrieval: Date, time, purpose

3. **Validate Key**:
   - [ ] Verify HMAC signature on backup
   - [ ] Test decryption of sample user data with key
   - [ ] Confirm key matches expected timestamp

4. **Deploy to New Secrets Manager**:
   - [ ] Provision new Secrets Manager instance (if old compromised)
   - [ ] Upload recovered key
   - [ ] Deploy application with new reference

5. **Post-Recovery**:
   - [ ] Rotate new key after stabilization
   - [ ] Investigate root cause of compromise
   - [ ] Document incident in security log

**Recovery RTO**: 2-4 hours (depends on secrets infrastructure setup time)

---

## 6. Key Rotation Automation

### 6.1 AWS Secrets Manager Rotation (Recommended)

If using AWS Secrets Manager, create automated rotation Lambda:

```python
# lambda/rotate_pii_key.py
import boto3
import json
import base64
import os
import subprocess

secretsmanager = boto3.client('secretsmanager')

def lambda_handler(event, context):
    secret_id = event['ClientRequestToken']
    
    # Step 1: Generate new key
    new_key = base64.b64encode(os.urandom(32)).decode()
    
    # Step 2: Get current key
    current = secretsmanager.get_secret_value(
        SecretId=secret_id,
        VersionId=event['ClientRequestToken'],
        VersionStage='AWSCURRENT'
    )
    current_key = json.loads(current['SecretString'])['key']
    
    # Step 3: Trigger re-encryption in database
    # (Run migration script to re-encrypt all PII with new key)
    subprocess.run([
        'python', '/opt/Database_Migration.py',
        '--old-key', current_key,
        '--new-key', new_key
    ])
    
    # Step 4: Store new key as pending
    secretsmanager.put_secret_value(
        SecretId=secret_id,
        ClientRequestToken=event['ClientRequestToken'],
        Secret= json.dumps({'key': new_key}),
        VersionStages=['AWSPENDING']
    )
    
    # Step 5: Finalize
    secretsmanager.update_secret_version_stage(
        SecretId=secret_id,
        VersionStage='AWSCURRENT',
        MoveToVersionId=event['ClientRequestToken'],
        RemoveFromVersionId=event['ServerRequestToken']
    )
    
    print(f"✅ Key rotation complete for {secret_id}")
```

**Configuration**:
- [ ] Rotation enabled every 90 days
- [ ] Lambda has DB access and IAM permissions
- [ ] Rotation tested monthly in staging

---

## 7. Key Monitoring & Auditing

### 7.1 Key Usage Monitoring

All key usage logged:
- [ ] Every PII decryption operation logged (not plaintext, just metadata)
- [ ] Every JWT signing operation logged
- [ ] Every secrets manager access logged
- [ ] Anomalies trigger security alerts

**Example Log Entry**:
```json
{
  "timestamp": "2026-03-31T10:15:22Z",
  "operation": "pii.decrypt",
  "key_id": "pii_encryption_key_v2",
  "user_id": "user123",
  "success": true,
  "source_ip": "10.0.1.5"
}
```

### 7.2 Key Audit Trail

Maintain immutable log of all key operations:
- [ ] Generation date and time
- [ ] Who generated (if manual)
- [ ] Rotation history with dates
- [ ] Recovery events (if any)
- [ ] Retirement/archival

```
KEY_ROTATION_LOG.md:
---
2026-03-31: PII_ENCRYPTION_KEY_v1 generated by [infra team]
2026-06-30: Rotated to PII_ENCRYPTION_KEY_v2 in production (14 hour maintenance window, 2.3M users re-encrypted)
2026-09-30: Rotated to PII_ENCRYPTION_KEY_v3 (9 hour maintenance window, 2.8M users re-encrypted)
2026-12-20: Emergency rotation to PII_ENCRYPTION_KEY_v4 due to suspected compromise (4 hour incident, all services restored)
---
```

---

## 8. Disaster Recovery for Keys

### 8.1 Lost Key Scenario

**If PII encryption key is lost permanently**:
- [ ] CRITICAL: PII data becomes unrecoverable
- [ ] Trigger incident: All users notified
- [ ] Option 1: Restore from backup (if backup exists)
  - Requires full database restore to point-in-time backup
  - Data loss up to last backup
- [ ] Option 2: Re-collect PII from users
  - Users re-verify email/phone/identity
  - New encryption with recovered key
  - Significant customer friction

**Prevention**:
- [ ] Keys backed up immediately after generation
- [ ] Backup verified quarterly
- [ ] Backup stored in geographically separate locations
- [ ] Rotation documented meticulously

### 8.2 Secrets Manager Compromise

**If Secrets Manager account compromised**:
- [ ] All keys exposed (assume worst case)
- [ ] Immediately rotate ALL keys (within 2 hours)
- [ ] Deploy new keys from backup
- [ ] Force user logouts (get new access tokens with new JWT secret)
- [ ] Re-encrypt PII with new encryption key
- [ ] Migrate to new Secrets Manager instance
- [ ] Audit compromised keys: What data could be accessed with old keys

---

## 9. Key Management Checklist

### Quarterly
- [ ] Review key rotation schedule
- [ ] Verify all keys present in Secrets Manager
- [ ] Test key backup recovery in staging
- [ ] Rotate PII encryption key

### Semi-Annually
- [ ] Rotate JWT secrets
- [ ] Audit key access logs
- [ ] Review key management procedures
- [ ] Test disaster recovery (full key recovery from backup)

### Annually
- [ ] Third-party security audit of key management
- [ ] Penetration test of secrets infrastructure
- [ ] Update procedures based on lessons learned
- [ ] Verify backup key integrity (test decryption)

---

## 10. Key Lifecycle Diagram

```
┌─────────────────────────────────────────────────────┐
│ Key Generated (Random 32 bytes, base64-encoded)      │
├─────────────────────────────────────────────────────┤
│ ↓                                                    │
│ Key Backed Up (Secure vault, multi-sig)              │
├─────────────────────────────────────────────────────┤
│ ↓                                                    │
│ Key Deployed (Secrets Manager → App via env vars)   │
├─────────────────────────────────────────────────────┤
│ ↓                                                    │
│ Active Use (Encryption/signing operations)          │
├─────────────────────────────────────────────────────┤
│ ↓ (Quarterly/Semi-Annual)                          │
│ Key Rotation Scheduled                              │
├─────────────────────────────────────────────────────┤
│ ↓                                                    │
│ New Key Generated & Deployed (With transition)      │
├─────────────────────────────────────────────────────┤
│ ↓ (30-90 day grace period)                         │
│ Old Key Still Accepted (For old data)               │
├─────────────────────────────────────────────────────┤
│ ↓                                                    │
│ Old Key Retired (Moved to archive backup)           │
├─────────────────────────────────────────────────────┤
│ ↓ (7 year retention)                               │
│ Archived in Cold Storage (Audit compliance)          │
└─────────────────────────────────────────────────────┘
```

---

## Summary

Proper key management is foundational to security. The GLY-VTU fintech application implements:
- ✅ Strong key generation (256-bit cryptographic random)
- ✅ Secure storage (environment variables + Secrets Manager)
- ✅ Regular rotation (quarterly for encryption, semi-annual for JWT)
- ✅ Backup & recovery (cold storage with multi-signature)
- ✅ Audit logging (all key operations tracked)
- ✅ Disaster recovery (procedures documented and tested)

Review this document quarterly and update as security practices evolve.