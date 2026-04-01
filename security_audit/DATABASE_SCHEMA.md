# Database Schema Documentation

**Last Updated**: March 31, 2026  
**Database**: MySQL 8.0+  
**Connection Pool**: 10 max connections, promise-based pool via mysql2

## Overview

The GLY-VTU fintech application uses a relational MySQL database to store user data, financial transactions, authentication tokens, and audit logs. All sensitive Personal Identifiable Information (PII) is encrypted at rest using AES-256-GCM encryption.

---

## Core Tables

### 1. `users`
**Purpose**: Central user account table  
**Partition Strategy**: None (single table, indexed by user_id)

| Column | Type | Constraints | Encryption | Notes |
|--------|------|-----------|-----------|-------|
| `id` | CHAR(36) | PRIMARY KEY, NOT NULL | - | UUID v4 |
| `full_name_encrypted` | VARCHAR(255) | NOT NULL | AES-256-GCM | Encrypted full name (PBKDF2 key derivation) |
| `full_name` | VARCHAR(255) | - | - | **DEPRECATED** - use full_name_encrypted |
| `email_encrypted` | VARCHAR(255) | NOT NULL | AES-256-GCM | Encrypted email address |
| `email` | VARCHAR(255) | - | - | **DEPRECATED** - use email_encrypted |
| `email_hash` | VARCHAR(64) | UNIQUE, NOT NULL | - | SHA-256 hash of email (for lookups without decryption) |
| `phone_encrypted` | VARCHAR(255) | - | AES-256-GCM | Encrypted phone number |
| `phone` | VARCHAR(20) | - | - | **DEPRECATED** - use phone_encrypted |
| `phone_hash` | VARCHAR(64) | UNIQUE, INDEX | - | SHA-256 hash of phone (for lookups) |
| `password_hash` | VARCHAR(60) | NOT NULL | - | BCrypt hash (12 rounds), never stored plaintext |
| `kyc_level` | TINYINT | DEFAULT 1 | - | 1=None, 2=Tier1, 3=Tier2, 4=Tier3 |
| `kyc_status` | ENUM | DEFAULT 'pending' | - | pending, verified, rejected, suspended |
| `kyc_payload_encrypted` | LONGTEXT | - | AES-256-GCM | JSON encrypted: {verified_data, documents, timestamps} |
| `kyc_payload` | LONGTEXT | - | - | **DEPRECATED** - use kyc_payload_encrypted |
| `kycLevel` | TINYINT | - | - | **DEPRECATED** - use kyc_level |
| `date_of_birth` | DATE | - | - | User DOB for age verification |
| `security_question` | VARCHAR(500) | - | - | Security question for account recovery |
| `security_question_enabled` | BOOLEAN | DEFAULT FALSE | - | Flag if security question is set |
| `security_answer_hash` | VARCHAR(255) | - | - | Bcrypt hashed answer (if security_question_enabled=true) |
| `pin_hash` | VARCHAR(60) | - | - | BCrypt hashed 6-digit transaction PIN (12 rounds) |
| `pin_created_at` | TIMESTAMP | - | - | When PIN was last set |
| `pin_attempts` | INT | DEFAULT 0 | - | Failed PIN attempts counter (resets after 15 min lock) |
| `pin_locked_until` | TIMESTAMP | - | - | Account lockout until timestamp after 5 failed attempts |
| `backup_codes_encrypted` | LONGTEXT | - | AES-256-GCM | JSON array of hashed backup codes for TOTP |
| `totp_secret_encrypted` | VARCHAR(255) | - | AES-256-GCM | Base32-encoded TOTP secret (if 2FA enabled) |
| `totp_enabled` | BOOLEAN | DEFAULT FALSE | - | Flag if TOTP 2FA is active |
| `device_count` | INT | DEFAULT 0 | - | Number of active devices (filled by anomaly detection) |
| `last_login` | TIMESTAMP | NULL | - | Last successful login timestamp |
| `last_login_ip` | VARCHAR(45) | - | - | IPv4 or IPv6 address of last login |
| `last_login_device_id` | VARCHAR(36) | - | - | Device ID of last login |
| `last_login_failed_at` | TIMESTAMP | NULL | - | Timestamp of last failed login attempt |
| `login_failed_attempts` | INT | DEFAULT 0 | - | Count of failed login attempts in current window |
| `login_locked_until` | TIMESTAMP | NULL | - | Account locked until timestamp after N failed attempts |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | - | Account creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | - | Last profile update timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_email_hash ON users(email_hash);
CREATE UNIQUE INDEX idx_phone_hash ON users(phone_hash);
CREATE INDEX idx_kyc_level ON users(kyc_level);
CREATE INDEX idx_kyc_status ON users(kyc_status);
CREATE INDEX idx_created_at ON users(created_at);
```

**Encryption Usage**:
- All PII decrypted via `applyUserPII(row)` utility on retrieval
- Encryption key derived from user's UUID + env var `PII_ENCRYPTION_KEY` using PBKDF2

---

### 2. `wallets`
**Purpose**: User wallet balances and transactions ledger  
**Partition Strategy**: None (single table, indexed by user_id)

| Column | Type | Constraints | Notes |
|--------|------|-----------|-------|
| `id` | CHAR(36) | PRIMARY KEY | UUID v4 |
| `user_id` | CHAR(36) | FOREIGN KEY users(id), NOT NULL, INDEX | User who owns wallet |
| `balance` | DECIMAL(16,2) | DEFAULT 0.00 | Available balance in NGN |
| `ledger_balance` | DECIMAL(16,2) | DEFAULT 0.00 | Balance including pending transactions |
| `currency` | CHAR(3) | DEFAULT 'NGN' | ISO currency code (NGN only for now) |
| `locked_amount` | DECIMAL(16,2) | DEFAULT 0.00 | Amount locked by pending transactions |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Wallet creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last balance update |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_user_wallet ON wallets(user_id);
CREATE INDEX idx_balance ON wallets(balance);
```

**Critical Rules**:
- Balance always >= 0 (no negative balances)
- Debits and credits tracked separately in transaction table
- Used `FOR UPDATE` locking on withdrawal to prevent race conditions

---

### 3. `transactions`
**Purpose**: Immutable ledger of all financial transactions  
**Partition Strategy**: Consider monthly partitioning for large scale

| Column | Type | Constraints | Notes |
|--------|------|-----------|-------|
| `id` | CHAR(36) | PRIMARY KEY | UUID v4 |
| `user_id` | CHAR(36) | FOREIGN KEY users(id), NOT NULL, INDEX | Transaction initiator |
| `type` | ENUM | NOT NULL | 'transfer', 'send_bank', 'bill_payment', 'airtime', 'data', 'electricity', 'tv', 'topup', 'payroll', 'card_charge', 'withdrawal', 'deposit_flutterwave', 'deposit_bank' |
| `status` | ENUM | DEFAULT 'pending' | 'pending', 'processing', 'completed', 'failed', 'reversed' |
| `amount` | DECIMAL(16,2) | NOT NULL | Transaction amount in NGN |
| `fee` | DECIMAL(10,2) | DEFAULT 0 | Transaction fee applied |
| `currency` | CHAR(3) | DEFAULT 'NGN' | ISO currency code |
| `description` | VARCHAR(500) | - | Human-readable description |
| `metadata` | LONGTEXT | - | JSON: {accountNumber, bankName, provider, phone, etc.} |
| `provider` | VARCHAR(50) | INDEX | Payment provider (flutterwave, vtpass, internal, bank) |
| `provider_reference` | VARCHAR(100) | UNIQUE, INDEX | External provider's transaction reference |
| `idempotency_key` | VARCHAR(36) | INDEX | UUID for deduplication across retries |
| `recipient_user_id` | CHAR(36) | - | If transfer to internal user, their ID |
| `recipient_account` | VARCHAR(100) | - | If transfer to bank, account number |
| `recipient_bank_code` | VARCHAR(10) | - | If transfer to bank, bank code |
| `recipient_name` | VARCHAR(100) | - | Recipient name (if using email/phone lookup) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Transaction initiation timestamp |
| `processed_at` | TIMESTAMP | NULL | When transaction was processed by provider |
| `completed_at` | TIMESTAMP | NULL | When transaction reached final status |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last status update |

**Indexes**:
```sql
CREATE INDEX idx_user_id ON transactions(user_id);
CREATE INDEX idx_type ON transactions(type);
CREATE INDEX idx_status ON transactions(status);
CREATE INDEX idx_created_at ON transactions(created_at);
CREATE UNIQUE INDEX idx_provider_reference ON transactions(provider_reference);
CREATE INDEX idx_idempotency_key ON transactions(idempotency_key);
```

**Idempotency**: 
- Requests with same idempotency_key within 24 hours return cached response instead of reprocessing
- Prevents duplicate charges on retry scenarios

---

###4. `refresh_tokens`
**Purpose**: OAuth-style refresh token family tracking for session management  
**TTL**: Automated cleanup (tokens older than 30 days pruned)

| Column | Type | Constraints | Notes |
|--------|------|-----------|-------|
| `id` | CHAR(36) | PRIMARY KEY | UUID v4 |
| `user_id` | CHAR(36) | FOREIGN KEY users(id), INDEX | User who owns token (NULL if admin) |
| `admin_id` | CHAR(36) | FOREIGN KEY admin_users(id), INDEX | Admin who owns token (NULL if user) |
| `refresh_family_id` | CHAR(36) | NOT NULL, INDEX | Family ID for token chain tracking |
| `device_id` | VARCHAR(36) | NOT NULL | Device UUID that token is bound to |
| `ip_address` | VARCHAR(45) | - | IPv4 or IPv6 address that token was issued to |
| `user_agent` | VARCHAR(500) | - | User-Agent string for additional tracking |
| `token_hash` | VARCHAR(64) | UNIQUE, INDEX | SHA-256 hash of raw token (never store raw token) |
| `revoked_at` | TIMESTAMP | NULL | Timestamp when token was revoked/rotated |
| `expires_at` | TIMESTAMP | NOT NULL, INDEX | Token expiration timestamp (default 14 days) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Token issuance timestamp |

**Indexes**:
```sql
CREATE INDEX idx_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_admin_id ON refresh_tokens(admin_id);
CREATE INDEX idx_family_id ON refresh_tokens(refresh_family_id);
CREATE UNIQUE INDEX idx_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_expires_at ON refresh_tokens(expires_at);
```

**Token Rotation Logic**:
- On each `/auth/refresh` call, current token is revoked and new one issued
- All tokens in same family_id chain maintain same device_id + ip_address + user_agent
- Breach detection: if family_id token used with different device/IP, entire family revoked

---

### 5. `admin_users`
**Purpose**: Admin account management with role-based access control  

| Column | Type | Constraints | Notes |
|--------|------|-----------|-------|
| `id` | CHAR(36) | PRIMARY KEY | UUID v4 |
| `name` | VARCHAR(100) | NOT NULL | Admin full name |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | Admin email (unique) |
| `password_hash` | VARCHAR(60) | NOT NULL | BCrypt hash (12 rounds) |
| `role` | ENUM | DEFAULT 'support' | 'superadmin', 'operations', 'support', 'finance', 'compliance' |
| `totp_secret_encrypted` | VARCHAR(255) | NOT NULL | Base32 TOTP secret (AES-256-GCM) - mandatory for all admins |
| `totp_enabled` | BOOLEAN | DEFAULT TRUE | TOTP required for login (always TRUE) |
| `ip_whitelist` | JSON | - | **Optional**: Array of allowed IP addresses |
| `ip_whitelist_enabled` | BOOLEAN | DEFAULT FALSE | Whether IP whitelist is enforced |
| `last_login` | TIMESTAMP | NULL | Last successful admin login |
| `last_login_ip` | VARCHAR(45) | - | IP address of last login |
| `login_failed_attempts` | INT | DEFAULT 0 | Failed login attempts (resets after successful login) |
| `login_locked_until` | TIMESTAMP | NULL | Admin locked until timestamp (after 5 failed attempts in 15 min) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_email ON admin_users(email);
CREATE INDEX idx_role ON admin_users(role);
```

**Access Control**:
- All admin routes require BOTH `requireAdmin` + `requirePermission('action')` middleware
- See `backend/middleware/permissions.js` for permission matrix

---

### 6. `flutterwave_events`
**Purpose**: Audit trail for all Flutterwave webhook events  
**TTL**: Auto-pruned after 90 days

| Column | Type | Constraints | Notes |
|--------|------|-----------|-------|
| `id` | CHAR(36) | PRIMARY KEY | UUID v4 |
| `event_type` | VARCHAR(100) | NOT NULL, INDEX | Event from Flutterwave (e.g., 'charge.completed', 'charge.failed') |
| `webhook_reference` | VARCHAR(100) | UNIQUE, INDEX | External webhook reference from FLW |
| `transaction_id` | CHAR(36) | INDEX | Related GLY-VTU transaction ID (if applicable) |
| `user_id` | CHAR(36) | INDEX | Related GLY-VTU user ID (if applicable) |
| `raw_webhook` | LONGTEXT | - | Full JSON webhook payload (encrypted) |
| `status_verified` | BOOLEAN | DEFAULT FALSE | Whether signature was verified |
| `ip_verified` | BOOLEAN | DEFAULT FALSE | Whether source IP was whitelisted |
| `processing_status` | ENUM | DEFAULT 'pending' | 'pending', 'processed', 'error', 'ignored' |
| `error_message` | VARCHAR(500) | - | Error if processing failed |
| `processed_at` | TIMESTAMP | NULL | When webhook was processed |
| `received_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When webhook was received |

**Indexes**:
```sql
CREATE INDEX idx_event_type ON flutterwave_events(event_type);
CREATE UNIQUE INDEX idx_webhook_reference ON flutterwave_events(webhook_reference);
CREATE INDEX idx_user_id ON flutterwave_events(user_id);
CREATE INDEX idx_received_at ON flutterwave_events(received_at);
```

**Security Note**: 
- Webhook verification happens BEFORE writing to this table
- Both signature (HMAC) and source IP checked
- Failed verification creates security event (see `security_events` table)

---

### 7. `audit_logs`
**Purpose**: Immutable audit trail of admin and sensitive user actions  
**Retention**: 1 year (auto-pruned)

| Column | Type | Constraints | Notes |
|--------|------|-----------|-------|
| `id` | CHAR(36) | PRIMARY KEY | UUID v4 |
| `actor_type` | ENUM | NOT NULL | 'admin' or 'user' |
| `actor_id` | CHAR(36) | NOT NULL, INDEX | ID of user/admin performing action |
| `action` | VARCHAR(100) | NOT NULL, INDEX | Action code (e.g., 'user.register', 'admin.delete', 'wallet.send') |
| `entity_type` | VARCHAR(50) | - | Resource type affected (e.g., 'user', 'transaction', 'admin') |
| `entity_id` | CHAR(36) | INDEX | Resource ID affected |
| `ip` | VARCHAR(45) | - | IPv4/IPv6 address of action source |
| `user_agent` | VARCHAR(500) | - | User-Agent string |
| `metadata` | LONGTEXT | - | Additional context (JSON): {change_delta, reason, etc.} |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Action timestamp |

**Indexes**:
```sql
CREATE INDEX idx_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX idx_action ON audit_logs(action);
CREATE INDEX idx_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_created_at ON audit_logs(created_at);
```

---

### 8. `security_events`
**Purpose**: Real-time security threat tracking (anomalies, failed auth, webhooks, etc.)  
**TTL**: 30 days (auto-pruned)

| Column | Type | Constraints | Notes |
|--------|------|-----------|-------|
| `id` | CHAR(36) | PRIMARY KEY | UUID v4 |
| `type` | VARCHAR(100) | NOT NULL, INDEX | Event type (e.g., 'anomaly.withdrawal.amount', 'account.locked.failed_login') |
| `severity` | ENUM | DEFAULT 'medium' | 'low', 'medium', 'high', 'critical' |
| `actor_type` | ENUM | NOT NULL | 'user', 'admin', 'system' |
| `actor_id` | CHAR(36) | INDEX | ID of actor involved |
| `ip` | VARCHAR(45) | - | Source IP address |
| `user_agent` | VARCHAR(500) | - | User-Agent header |
| `metadata` | LONGTEXT | - | Event context (JSON): {threshold, value, message} |
| `resolved_at` | TIMESTAMP | NULL | When security team resolved the event (NULL = pending) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Event creation timestamp |

**Event Types**:
- `admin.login.failed` - Failed admin login (triggers after 3 failures, locks after 5)
- `webhook.flutterwave.invalid` - Invalid FLW webhook signature
- `webhook.flutterwave.ip_rejected` - Webhook from non-whitelisted IP
- `anomaly.withdrawal.amount` - Single withdrawal > 500K NGN
- `anomaly.withdrawal.frequency` - 3+ withdrawals in 60 min window
- `anomaly.device.count` - 5+ active devices for user
- `anomaly.login.failed` - Same as admin login failed
- `kyc.insufficient.bank_transfer` - KYC level < 2 attempting bank transfer
- `kyc.unverified.bank_transfer` - Attempting bank transfer without verified KYC

**Indexes**:
```sql
CREATE INDEX idx_type ON security_events(type);
CREATE INDEX idx_severity ON security_events(severity);
CREATE INDEX idx_actor ON security_events(actor_type, actor_id);
CREATE INDEX idx_created_at ON security_events(created_at);
CREATE INDEX idx_resolved ON security_events(resolved_at);
```

---

### 9. `idempotency_keys`
**Purpose**: Track idempotent requests to prevent duplicate processing  
**TTL**: 24 hours (auto-pruned)

| Column | Type | Constraints | Notes |
|--------|------|-----------|-------|
| `id` | CHAR(36) | PRIMARY KEY | UUID v4 |
| `user_id` | CHAR(36) | NOT NULL, INDEX | User who made request |
| `key` | VARCHAR(36) | NOT NULL, INDEX | Idempotency key from request header |
| `route` | VARCHAR(100) | NOT NULL | API route (e.g., 'wallet.send') |
| `request_hash` | VARCHAR(64) | - | Hash of request body for validation |
| `status_code` | INT | - | HTTP response code of original request |
| `response` | LONGTEXT | - | Cached response JSON (returned on retry) |
| `expires_at` | TIMESTAMP | NOT NULL, INDEX | Expiry time (24 hours from creation) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Key creation timestamp |

**Indexes**:
```sql
CREATE INDEX idx_user_key ON idempotency_keys(user_id, key);
CREATE INDEX idx_expires_at ON idempotency_keys(expires_at);
```

**Usage**:
- Frontend includes `X-Idempotency-Key: <UUID>` header on financial requests
- First request processes normally, writes response to cache
- Retry with same key returns cached response immediately (no double processing)

---

## Supporting Tables (Reference)

### `banks`
- List of Nigerian banks for transfers (code, name, slug)

### `bills_categories`, `bills_providers`
- Reference data for Vtpass bill payment categories and providers
- Used for form validation and provider selection

### `reserved_accounts`
- Flutterwave virtual accounts created for users
- Stores account_number, bank_name, bank_code, provider reference

---

## Encryption Key Strategy

**PII Encryption** (`backend/utils/encryption.js`):
```javascript
Algorithm: AES-256-GCM
Key Derivation: PBKDF2 (100,000 iterations)
Key Material: user_id + PII_ENCRYPTION_KEY from env
IV: Random 12-byte generated per encryption
Auth Tag: 16-byte integrity check
```

**Environment Variables Required**:
- `PII_ENCRYPTION_KEY` - 32-byte (256-bit) base64-encoded key used for all PII encryption
- `COOKIE_ENC_SECRET` - For encrypting refresh tokens in cookies
- `JWT_SECRET` - For signing user JWT tokens
- `JWT_ADMIN_SECRET` - For signing admin JWT tokens (can be same as JWT_SECRET)

---

## Query Patterns

### Safe Query (Parameterized):
```javascript
const [rows] = await pool.query(
  'SELECT * FROM users WHERE email_hash = ? AND kyc_status = ?',
  [emailHash, 'verified']
);
```

### UNSAFE - DO NOT USE:
```javascript
// X SQL Injection Risk
const rows = await pool.query(`
  SELECT * FROM users WHERE email = '${email}'
`);
```

### Transactions (For Consistency):
```javascript
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  await conn.query('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [amount, userId]);
  await conn.query('INSERT INTO transactions (...) VALUES (...)', [...]);
  await conn.commit();
} catch (err) {
  await conn.rollback();
  throw err;
} finally {
  conn.release();
}
```

---

## Performance Considerations

**Indexes to Monitor**:
- `idx_created_at` on transactions (for time-range queries)
- `idx_user_id` on all user-facing tables (for user isolation)
- `idx_provider_reference` on transactions (for webhook lookups)

**Partitioning Recommendations** (for scale):
- Partition `transactions` by month (created_at range)
- Partition `security_events` by month (created_at range)
- Partition `audit_logs` by month (created_at range)
- Reduces query scan size for time-range analytics

**Monitoring**:
- Table sizes monthly (trigger alerts at 80% storage)
- Slow query logs enabled
- Connection pool exhaustion monitoring
- Query response times per endpoint

---

## Backup & Recovery

**Backup Strategy**:
- Full backup daily (off-peak hours, e.g., 2 AM UTC+1)
- Incremental backups every 6 hours
- Point-in-time recovery enabled (binary logs retained 30 days)
- Backups encrypted at rest

**Recovery Procedures**:
- Test recovery monthly (restore to staging, validate data integrity)
- RTO target: 4 hours
- RPO target: 1 hour maximum data loss
- Disaster recovery runbook maintained in operations guide

---

## Compliance Notes

**Data Retention**:
- User data: Keep indefinitely (until account deletion request)
- Transaction history: 7 years (per financial regulations)
- Audit logs: 1 year
- Security events: 30 days
- Flutterwave webhook events: 90 days
- TOTP backup codes: Deleted when user disables 2FA

**Encryption Verification**:
- All PII fields use AES-256-GCM (verified via code inspection)
- No plaintext PII stored in logs (verified via logger redaction tests)
- All financial transactions immutable (audit-able)

**Access Control**:
- Database credentials rotated quarterly
- Admin users require TOTP (mandatory)
- All admin queries logged to audit_logs table
- Data access restricted to authenticated session with valid JWT
