import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import crypto from 'crypto';
import argon2 from 'argon2';
import { ensureAdminTotpColumns } from '../docs/migrations/2026-03-30_admin_totp.js';
import { ensureAccountLockoutColumns } from '../docs/migrations/2026-04-01_account_lockout.js';
import { ensureAdminDisableColumns } from '../docs/migrations/2026-04-02_admin_disable.js';
import {
  ensurePiiEncryptionColumns,
  ensurePiiEncryptionIndexes,
} from '../docs/migrations/2026-04-01_pii_encryption.js';
import {
  encryptPII,
  encryptJson,
  hashEmail,
  hashPhone,
} from '../utils/encryption.js';
import { buildTransactionMetadata } from '../utils/transactionMetadata.js';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
export const DB_NAME = process.env.DB_NAME || 'gly_vtu';

export const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  multipleStatements: false,
});

// SECURITY: Enforce strict SQL modes and UTC timezone for every new connection.
// This helps prevent silent truncation and inconsistent date handling.
pool.on('connection', (conn) => {
  conn.query(
    "SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'"
  );
  conn.query("SET SESSION time_zone = '+00:00'");
});

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function seedDefaults(conn) {
  const [rows] = await conn.query('SELECT seeded FROM schema_meta WHERE id = 1');
  if (rows.length && rows[0].seeded === 1) return;

  await conn.query(
    `INSERT IGNORE INTO bill_categories (code, name, description, active) VALUES
      ('airtime', 'Airtime', 'Top up mobile airtime for Nigerian networks', 1),
      ('data', 'Data Bundles', 'Buy data plans for Nigerian networks', 1),
      ('tv', 'Cable TV', 'Pay for DStv, GOtv, StarTimes and more', 1),
      ('electricity', 'Electricity', 'Pay prepaid and postpaid electricity', 1),
      ('education', 'Education', 'School fees and exam payments', 1),
      ('betting', 'Betting', 'Fund betting wallets and wagers', 1),
      ('internet', 'Internet', 'Pay ISP and fibre subscriptions', 1)`
  );

  await conn.query(
    `INSERT IGNORE INTO bill_providers (category_id, name, code, logo_url, active)
     SELECT id, 'MTN', 'mtn', 'https://logo.clearbit.com/mtn.ng', 1 FROM bill_categories WHERE code='airtime'
     UNION ALL SELECT id, 'Airtel', 'airtel', 'https://logo.clearbit.com/airtel.com.ng', 1 FROM bill_categories WHERE code='airtime'
     UNION ALL SELECT id, 'Glo', 'glo', 'https://logo.clearbit.com/gloworld.com', 1 FROM bill_categories WHERE code='airtime'
     UNION ALL SELECT id, '9mobile', '9mobile', 'https://logo.clearbit.com/9mobile.com.ng', 1 FROM bill_categories WHERE code='airtime'
     UNION ALL SELECT id, 'MTN Data', 'mtn-data', 'https://logo.clearbit.com/mtn.ng', 1 FROM bill_categories WHERE code='data'
     UNION ALL SELECT id, 'Airtel Data', 'airtel-data', 'https://logo.clearbit.com/airtel.com.ng', 1 FROM bill_categories WHERE code='data'
     UNION ALL SELECT id, 'Glo Data', 'glo-data', 'https://logo.clearbit.com/gloworld.com', 1 FROM bill_categories WHERE code='data'
     UNION ALL SELECT id, '9mobile Data', '9mobile-data', 'https://logo.clearbit.com/9mobile.com.ng', 1 FROM bill_categories WHERE code='data'
     UNION ALL SELECT id, 'DStv', 'dstv', 'https://logo.clearbit.com/dstv.com', 1 FROM bill_categories WHERE code='tv'
     UNION ALL SELECT id, 'GOtv', 'gotv', 'https://logo.clearbit.com/gotvafrica.com', 1 FROM bill_categories WHERE code='tv'
     UNION ALL SELECT id, 'StarTimes', 'startimes', 'https://logo.clearbit.com/startimestv.com', 1 FROM bill_categories WHERE code='tv'
     UNION ALL SELECT id, 'IKEDC', 'ikedc', 'https://logo.clearbit.com/ikedc.com', 1 FROM bill_categories WHERE code='electricity'
     UNION ALL SELECT id, 'EKEDC', 'ekedc', 'https://logo.clearbit.com/ekedp.com', 1 FROM bill_categories WHERE code='electricity'
     UNION ALL SELECT id, 'AEDC', 'aedc', 'https://logo.clearbit.com/aedc.com.ng', 1 FROM bill_categories WHERE code='electricity'
     UNION ALL SELECT id, 'WAEC', 'waec', 'https://logo.clearbit.com/waecnigeria.org', 1 FROM bill_categories WHERE code='education'
     UNION ALL SELECT id, 'JAMB', 'jamb', 'https://logo.clearbit.com/jamb.gov.ng', 1 FROM bill_categories WHERE code='education'
     UNION ALL SELECT id, 'Bet9ja', 'bet9ja', 'https://logo.clearbit.com/bet9ja.com', 1 FROM bill_categories WHERE code='betting'
     UNION ALL SELECT id, 'SportyBet', 'sportybet', 'https://logo.clearbit.com/sportybet.com', 1 FROM bill_categories WHERE code='betting'
     UNION ALL SELECT id, 'Spectranet', 'spectranet', 'https://logo.clearbit.com/spectranet.com.ng', 1 FROM bill_categories WHERE code='internet'
     UNION ALL SELECT id, 'Smile', 'smile', 'https://logo.clearbit.com/smile.com.ng', 1 FROM bill_categories WHERE code='internet'`
  );

  await conn.query(
    `INSERT IGNORE INTO bill_pricing (provider_id, base_fee, markup_type, markup_value, currency, active)
     SELECT id, 0, 'flat', 10, 'NGN', 1 FROM bill_providers`
  );

  await conn.query('UPDATE schema_meta SET seeded = 1 WHERE id = 1');
}

async function seedAdmin(conn) {
  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPasswordHash = process.env.ADMIN_SEED_PASSWORD_HASH;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminEmail || (!adminPasswordHash && !adminPassword)) return;

  let passwordHash = adminPasswordHash;
  if (!passwordHash && adminPassword) {
    passwordHash = await argon2.hash(adminPassword, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  await conn.query(
    'INSERT IGNORE INTO admin_users (id, name, email, password_hash, role) VALUES (UUID(), ?, ?, ?, ?)',
    ['Super Admin', adminEmail, passwordHash, 'superadmin']
  );
}

export async function initDatabase() {
  const bootstrap = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await bootstrap.end();

  const conn = await pool.getConnection();
  try {
    await runStatements(conn, `
      CREATE TABLE IF NOT EXISTS schema_meta (
        id INT PRIMARY KEY,
        seeded TINYINT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY,
        full_name VARCHAR(120) NULL,
        email VARCHAR(120) NULL UNIQUE,
        phone VARCHAR(20) NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        login_failed_attempts INT NOT NULL DEFAULT 0,
        login_locked_until TIMESTAMP NULL,
        last_login_failed_at TIMESTAMP NULL,
        transaction_pin_hash VARCHAR(255) NULL,
        pin_failed_attempts INT NOT NULL DEFAULT 0,
        pin_locked_until TIMESTAMP NULL,
        biometric_enabled TINYINT NOT NULL DEFAULT 0,
        pin_updated_at TIMESTAMP NULL,
        security_question VARCHAR(255) NULL,
        security_answer_hash VARCHAR(255) NULL,
        security_updated_at TIMESTAMP NULL,
        security_question_enabled TINYINT NOT NULL DEFAULT 0,
        kyc_level TINYINT NOT NULL DEFAULT 1,
        kyc_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
        kyc_payload JSON NULL,
        full_name_encrypted VARCHAR(500) NULL,
        email_encrypted VARCHAR(500) NULL,
        phone_encrypted VARCHAR(500) NULL,
        email_hash CHAR(64) NULL,
        phone_hash CHAR(64) NULL,
        kyc_payload_encrypted LONGTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(120) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(40) NOT NULL,
        disabled_at TIMESTAMP NULL,
        disabled_by CHAR(36) NULL,
        disabled_reason VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_notifications (
        id CHAR(36) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        type ENUM('info','warning','success','error') NOT NULL DEFAULT 'info',
        target_user_id CHAR(36) NULL,
        target_scope ENUM('broadcast','single') NOT NULL DEFAULT 'broadcast',
        force TINYINT NOT NULL DEFAULT 0,
        created_by CHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_notify_created (created_at),
        INDEX idx_admin_notify_target (target_user_id)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id CHAR(36) PRIMARY KEY,
        actor_type ENUM('user','admin','system') NOT NULL,
        actor_id CHAR(36) NULL,
        action VARCHAR(120) NOT NULL,
        entity_type VARCHAR(80) NULL,
        entity_id VARCHAR(120) NULL,
        ip_address VARCHAR(60) NULL,
        user_agent VARCHAR(255) NULL,
        metadata JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_actor (actor_type, actor_id),
        INDEX idx_audit_action (action),
        INDEX idx_audit_entity (entity_type, entity_id)
      );

      CREATE TABLE IF NOT EXISTS security_events (
        id CHAR(36) PRIMARY KEY,
        event_type VARCHAR(120) NOT NULL,
        severity ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
        actor_type ENUM('user','admin','system') NOT NULL DEFAULT 'system',
        actor_id CHAR(36) NULL,
        entity_type VARCHAR(80) NULL,
        entity_id VARCHAR(120) NULL,
        ip_address VARCHAR(60) NULL,
        user_agent VARCHAR(255) NULL,
        metadata JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_severity (severity),
        INDEX idx_event_type (event_type),
        INDEX idx_event_actor (actor_type, actor_id)
      );

      CREATE TABLE IF NOT EXISTS kyc_verifications (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        provider VARCHAR(60) NOT NULL,
        verification_type ENUM('bvn','nin') NOT NULL,
        status ENUM('pending','verified','failed','mismatch') NOT NULL DEFAULT 'pending',
        name_match TINYINT NOT NULL DEFAULT 0,
        verified_name VARCHAR(160) NULL,
        verified_dob DATE NULL,
        verified_phone VARCHAR(30) NULL,
        verified_gender VARCHAR(20) NULL,
        reference VARCHAR(120) NULL,
        request_payload JSON NULL,
        response_payload JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_kyc_user (user_id),
        INDEX idx_kyc_status (status),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS admin_adjustments (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        type ENUM('credit','debit') NOT NULL,
        amount DECIMAL(14,2) NOT NULL,
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        reason VARCHAR(255) NULL,
        requested_by CHAR(36) NOT NULL,
        approved_by CHAR(36) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_adj_user (user_id),
        INDEX idx_adj_status (status),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS wallets (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        balance DECIMAL(14,2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_wallet_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NULL,
        admin_id CHAR(36) NULL,
        refresh_family_id CHAR(36) NULL,
        device_id VARCHAR(120) NULL,
        ip_address VARCHAR(60) NULL,
        user_agent VARCHAR(255) NULL,
        token_hash CHAR(64) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        revoked_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_refresh_user (user_id),
        INDEX idx_refresh_admin (admin_id)
      );

      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        idem_key VARCHAR(120) NOT NULL,
        route VARCHAR(80) NOT NULL,
        request_hash CHAR(64) NOT NULL,
        status ENUM('processing','complete') NOT NULL DEFAULT 'processing',
        response_json JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_idem (user_id, idem_key, route),
        INDEX idx_idem_user (user_id)
      );

      CREATE TABLE IF NOT EXISTS email_otps (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NULL,
        email VARCHAR(120) NOT NULL,
        purpose ENUM('device_login','password_reset','admin_password_reset') NOT NULL,
        code_hash CHAR(64) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        consumed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_otp_email (email),
        INDEX idx_otp_user (user_id)
      );

      CREATE TABLE IF NOT EXISTS user_devices (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        device_id VARCHAR(120) NOT NULL,
        label VARCHAR(120) NULL,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        ip_address VARCHAR(60) NULL,
        user_agent VARCHAR(255) NULL,
        trusted TINYINT NOT NULL DEFAULT 1,
        UNIQUE KEY uniq_user_device (user_id, device_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS reserved_accounts (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        provider VARCHAR(40) NOT NULL DEFAULT 'flutterwave',
        account_reference VARCHAR(120) NOT NULL UNIQUE,
        reservation_reference VARCHAR(120) NULL,
        account_name VARCHAR(120) NOT NULL,
        account_number VARCHAR(20) NOT NULL,
        bank_name VARCHAR(120) NOT NULL,
        bank_code VARCHAR(20) NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
        raw_response JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_reserved_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        type ENUM('send','receive','bill','topup','request') NOT NULL,
        amount DECIMAL(14,2) NOT NULL,
        fee DECIMAL(14,2) NOT NULL DEFAULT 0,
        total DECIMAL(14,2) NOT NULL,
        status ENUM('pending','success','failed') NOT NULL DEFAULT 'pending',
        reference VARCHAR(80) NOT NULL,
        metadata JSON NULL,
        metadata_encrypted LONGTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tx_user (user_id),
        UNIQUE KEY uniq_reference (reference),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS bill_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(255) NOT NULL,
        active TINYINT NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS bill_providers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(120) NOT NULL,
        code VARCHAR(80) NOT NULL UNIQUE,
        logo_url VARCHAR(255) NULL,
        active TINYINT NOT NULL DEFAULT 1,
        FOREIGN KEY (category_id) REFERENCES bill_categories(id)
      );

      CREATE TABLE IF NOT EXISTS bill_pricing (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_id INT NOT NULL UNIQUE,
        base_fee DECIMAL(14,2) NOT NULL DEFAULT 0,
        markup_type ENUM('flat','percent') NOT NULL DEFAULT 'flat',
        markup_value DECIMAL(10,2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
        active TINYINT NOT NULL DEFAULT 1,
        FOREIGN KEY (provider_id) REFERENCES bill_providers(id)
      );

      CREATE TABLE IF NOT EXISTS bill_orders (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        provider_id INT NULL,
        amount DECIMAL(14,2) NOT NULL,
        fee DECIMAL(14,2) NOT NULL,
        total DECIMAL(14,2) NOT NULL,
        status ENUM('pending','success','failed') NOT NULL DEFAULT 'pending',
        reference VARCHAR(80) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_bill_reference (reference),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (provider_id) REFERENCES bill_providers(id)
      );

      CREATE TABLE IF NOT EXISTS banks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        code VARCHAR(20) NOT NULL UNIQUE,
        active TINYINT NOT NULL DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bank_cache_meta (
        id INT PRIMARY KEY,
        refreshed_at TIMESTAMP NULL
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        status ENUM('open','closed') NOT NULL DEFAULT 'open',
        subject VARCHAR(120) NULL,
        last_message_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_conversation_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS conversation_messages (
        id CHAR(36) PRIMARY KEY,
        conversation_id CHAR(36) NOT NULL,
        sender_type ENUM('user','admin','system') NOT NULL,
        sender_id CHAR(36) NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_message_conversation (conversation_id),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        title VARCHAR(120) NOT NULL,
        body TEXT NOT NULL,
        type VARCHAR(40) NOT NULL DEFAULT 'info',
        data JSON NULL,
        force TINYINT NOT NULL DEFAULT 0,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notification_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS vtpass_events (
        id CHAR(36) PRIMARY KEY,
        request_id VARCHAR(120) NOT NULL UNIQUE,
        transaction_id VARCHAR(120) NULL,
        status VARCHAR(40) NOT NULL,
        raw_payload JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS flutterwave_events (
        id CHAR(36) PRIMARY KEY,
        event_id VARCHAR(120) NULL,
        tx_ref VARCHAR(120) NULL,
        flw_ref VARCHAR(120) NULL,
        status VARCHAR(40) NOT NULL,
        raw_payload JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS virtual_cards (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        provider VARCHAR(40) NOT NULL DEFAULT 'flutterwave',
        card_id VARCHAR(120) NOT NULL,
        masked_pan VARCHAR(40) NULL,
        expiry VARCHAR(20) NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
        status VARCHAR(40) NOT NULL DEFAULT 'active',
        balance DECIMAL(14,2) NOT NULL DEFAULT 0,
        raw_response JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_card_provider (provider, card_id),
        INDEX idx_card_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS card_settings (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        card_id VARCHAR(120) NOT NULL,
        daily_limit DECIMAL(14,2) NULL,
        monthly_limit DECIMAL(14,2) NULL,
        merchant_locks TEXT NULL,
        auto_freeze TINYINT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_card_settings (card_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS card_spends (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        card_id VARCHAR(120) NOT NULL,
        amount DECIMAL(14,2) NOT NULL,
        merchant VARCHAR(120) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_spend_card (card_id),
        INDEX idx_spend_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    await conn.query('INSERT IGNORE INTO schema_meta (id, seeded) VALUES (1, 0)');
    await conn.query('INSERT IGNORE INTO bank_cache_meta (id, refreshed_at) VALUES (1, NULL)');
    await seedDefaults(conn);
    await seedAdmin(conn);
    await ensureUserSecurityColumns(conn);
    await ensureAccountLockoutColumns(conn, DB_NAME);
    await ensureUserLoginLockColumns(conn);
    await ensureUserPhoneNullable(conn);
    await ensureUserEmailNullable(conn);
    await ensureUserFullNameNullable(conn);
    await ensurePiiEncryptionColumns(conn, DB_NAME);
    await ensurePiiEncryptionIndexes(conn, DB_NAME);
    await ensureUserPiiColumns(conn);
    await ensureUserPiiIndexes(conn);
    await migrateUserPii(conn);
    await ensureRefreshTokenFamilyColumns(conn);
    await ensureRefreshTokenIndexes(conn);
    await ensureIdempotencyTable(conn);
    await ensureTransactionReferenceUnique(conn);
    await ensureTransactionIndexes(conn);
    await ensureBillOrderReferenceUnique(conn);
    await ensureSecurityEventIndexes(conn);
    await ensureAuditLogIndexes(conn);
    await ensureNotificationIndexes(conn);
    await ensureUserDeviceIndexes(conn);
    await ensureVtpassEventIndexes(conn);
    await ensureFlutterwaveEventColumns(conn);
    await ensureFlutterwaveEventIndexes(conn);
    await ensureAdminAdjustmentsTable(conn);
    await ensureBillProviderLogoColumn(conn);
    await ensureBillOrderProviderNullable(conn);
      await ensureSecurityEventsTable(conn);
      await ensureKycVerificationTable(conn);
      await ensureAdminTotpColumns(conn, DB_NAME);
      await ensureAdminDisableColumns(conn, DB_NAME);
      await ensureAdminNotificationsTable(conn);
      await ensureUserTotpColumns(conn);
    await ensureTransactionMetadataEncrypted(conn);
    await ensureAccountClosureTable(conn);
    await ensureDataExportTable(conn);
    await ensureUserPasswordUpdatedAt(conn);
  } finally {
    conn.release();
  }
}

async function runStatements(conn, sql) {
  const statements = String(sql)
    .split(';')
    .map((stmt) => stmt.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await conn.query(statement);
  }
}

export { hashToken };

async function ensureUserSecurityColumns(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
    [DB_NAME]
  );
  const existing = new Set(cols.map((c) => c.COLUMN_NAME));
  const alters = [];
  if (!existing.has('transaction_pin_hash')) alters.push('ADD COLUMN transaction_pin_hash VARCHAR(255) NULL');
  if (!existing.has('pin_failed_attempts')) alters.push('ADD COLUMN pin_failed_attempts INT NOT NULL DEFAULT 0');
  if (!existing.has('pin_locked_until')) alters.push('ADD COLUMN pin_locked_until TIMESTAMP NULL');
  if (!existing.has('biometric_enabled')) alters.push('ADD COLUMN biometric_enabled TINYINT NOT NULL DEFAULT 0');
  if (!existing.has('pin_updated_at')) alters.push('ADD COLUMN pin_updated_at TIMESTAMP NULL');
  if (!existing.has('security_question')) alters.push('ADD COLUMN security_question VARCHAR(255) NULL');
  if (!existing.has('security_answer_hash')) alters.push('ADD COLUMN security_answer_hash VARCHAR(255) NULL');
  if (!existing.has('security_updated_at')) alters.push('ADD COLUMN security_updated_at TIMESTAMP NULL');
  if (!existing.has('security_question_enabled')) {
    alters.push('ADD COLUMN security_question_enabled TINYINT NOT NULL DEFAULT 0');
  }
  if (alters.length) {
    await conn.query(`ALTER TABLE users ${alters.join(', ')}`);
  }
}

async function ensureUserPhoneNullable(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone'`,
    [DB_NAME]
  );
  if (cols.length && cols[0].IS_NULLABLE === 'NO') {
    await conn.query('ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NULL');
  }
}

async function ensureUserEmailNullable(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email'`,
    [DB_NAME]
  );
  if (cols.length && cols[0].IS_NULLABLE === 'NO') {
    await conn.query('ALTER TABLE users MODIFY COLUMN email VARCHAR(120) NULL');
  }
}

async function ensureUserFullNameNullable(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'full_name'`,
    [DB_NAME]
  );
  if (cols.length && cols[0].IS_NULLABLE === 'NO') {
    await conn.query('ALTER TABLE users MODIFY COLUMN full_name VARCHAR(120) NULL');
  }
}

async function ensureUserPiiColumns(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
    [DB_NAME]
  );
  const existing = new Set(cols.map((c) => c.COLUMN_NAME));
  const alters = [];
  if (!existing.has('full_name_encrypted')) {
    alters.push('ADD COLUMN full_name_encrypted VARCHAR(500) NULL');
  }
  if (!existing.has('email_encrypted')) {
    alters.push('ADD COLUMN email_encrypted VARCHAR(500) NULL');
  }
  if (!existing.has('phone_encrypted')) {
    alters.push('ADD COLUMN phone_encrypted VARCHAR(500) NULL');
  }
  if (!existing.has('email_hash')) {
    alters.push('ADD COLUMN email_hash CHAR(64) NULL');
  }
  if (!existing.has('phone_hash')) {
    alters.push('ADD COLUMN phone_hash CHAR(64) NULL');
  }
  if (!existing.has('kyc_payload_encrypted')) {
    alters.push('ADD COLUMN kyc_payload_encrypted LONGTEXT NULL');
  }
  if (alters.length) {
    await conn.query(`ALTER TABLE users ${alters.join(', ')}`);
  }
}

async function ensureUserPiiIndexes(conn) {
  const [rows] = await conn.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
    [DB_NAME]
  );
  const existing = new Set(rows.map((r) => r.INDEX_NAME));
  if (!existing.has('uniq_email_hash')) {
    await conn.query('CREATE UNIQUE INDEX uniq_email_hash ON users (email_hash)');
  }
  if (!existing.has('uniq_phone_hash')) {
    await conn.query('CREATE UNIQUE INDEX uniq_phone_hash ON users (phone_hash)');
  }
}

async function migrateUserPii(conn) {
  const [rows] = await conn.query(
    `SELECT id, full_name, email, phone, kyc_payload,
            full_name_encrypted, email_encrypted, phone_encrypted,
            email_hash, phone_hash, kyc_payload_encrypted
     FROM users`
  );
  for (const row of rows) {
    const updates = [];
    const values = [];
    if (!row.full_name_encrypted && row.full_name) {
      updates.push('full_name_encrypted = ?');
      values.push(encryptPII(row.full_name, row.id));
    }
    if (!row.email_encrypted && row.email) {
      updates.push('email_encrypted = ?');
      values.push(encryptPII(row.email, row.id));
    }
    if (!row.phone_encrypted && row.phone) {
      updates.push('phone_encrypted = ?');
      values.push(encryptPII(row.phone, row.id));
    }
    if (!row.email_hash && row.email) {
      updates.push('email_hash = ?');
      values.push(hashEmail(row.email));
    }
    if (!row.phone_hash && row.phone) {
      updates.push('phone_hash = ?');
      values.push(hashPhone(row.phone));
    }
    if (!row.kyc_payload_encrypted && row.kyc_payload) {
      updates.push('kyc_payload_encrypted = ?');
      values.push(encryptJson(JSON.parse(row.kyc_payload), row.id));
    }
    if (updates.length) {
      values.push(row.id);
      await conn.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }
}

async function ensureUserLoginLockColumns(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
    [DB_NAME]
  );
  const existing = new Set(cols.map((c) => c.COLUMN_NAME));
  const alters = [];
  if (!existing.has('login_failed_attempts')) {
    alters.push('ADD COLUMN login_failed_attempts INT NOT NULL DEFAULT 0');
  }
  if (!existing.has('login_locked_until')) {
    alters.push('ADD COLUMN login_locked_until TIMESTAMP NULL');
  }
  if (!existing.has('last_login_failed_at')) {
    alters.push('ADD COLUMN last_login_failed_at TIMESTAMP NULL');
  }
  if (!existing.has('last_login_at')) {
    alters.push('ADD COLUMN last_login_at TIMESTAMP NULL');
  }
  if (!existing.has('last_login_ip')) {
    alters.push('ADD COLUMN last_login_ip VARCHAR(60) NULL');
  }
  if (alters.length) {
    await conn.query(`ALTER TABLE users ${alters.join(', ')}`);
  }
}

async function ensureRefreshTokenFamilyColumns(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'refresh_tokens'`,
    [DB_NAME]
  );
  const existing = new Set(cols.map((c) => c.COLUMN_NAME));
  const alters = [];
  if (!existing.has('refresh_family_id')) {
    alters.push('ADD COLUMN refresh_family_id CHAR(36) NULL');
  }
  if (!existing.has('device_id')) {
    alters.push('ADD COLUMN device_id VARCHAR(120) NULL');
  }
  if (!existing.has('ip_address')) {
    alters.push('ADD COLUMN ip_address VARCHAR(60) NULL');
  }
  if (!existing.has('user_agent')) {
    alters.push('ADD COLUMN user_agent VARCHAR(255) NULL');
  }
  if (alters.length) {
    await conn.query(`ALTER TABLE refresh_tokens ${alters.join(', ')}`);
  }
}

async function ensureTransactionMetadataEncrypted(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'transactions'`,
    [DB_NAME]
  );
  const existing = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!existing.has('metadata_encrypted')) {
    await conn.query('ALTER TABLE transactions ADD COLUMN metadata_encrypted LONGTEXT NULL');
  }

  const [rows] = await conn.query(
    `SELECT id, user_id, metadata, metadata_encrypted FROM transactions WHERE metadata IS NOT NULL`
  );
  for (const row of rows) {
    if (row.metadata_encrypted) continue;
    let meta = row.metadata;
    if (typeof meta === 'string') {
      try {
        meta = JSON.parse(meta);
      } catch {
        meta = null;
      }
    }
    if (!meta) continue;
    const { safe, encrypted } = buildTransactionMetadata(meta, row.user_id);
    await conn.query(
      'UPDATE transactions SET metadata = ?, metadata_encrypted = ? WHERE id = ?',
      [safe ? JSON.stringify(safe) : null, encrypted, row.id]
    );
  }
}

async function ensureIdempotencyTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      idem_key VARCHAR(120) NOT NULL,
      route VARCHAR(80) NOT NULL,
      request_hash CHAR(64) NOT NULL,
      status ENUM('processing','complete') NOT NULL DEFAULT 'processing',
      response_json JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_idem (user_id, idem_key, route),
      INDEX idx_idem_user (user_id)
    )
  `);
}

async function ensureTransactionReferenceUnique(conn) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'transactions' AND INDEX_NAME = 'uniq_reference'`,
    [DB_NAME]
  );
  if (!rows[0]?.c) {
    await conn.query('ALTER TABLE transactions ADD UNIQUE KEY uniq_reference (reference)');
  }
}

async function ensureBillOrderReferenceUnique(conn) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bill_orders' AND INDEX_NAME = 'uniq_bill_reference'`,
    [DB_NAME]
  );
  if (!rows[0]?.c) {
    await conn.query('ALTER TABLE bill_orders ADD UNIQUE KEY uniq_bill_reference (reference)');
  }
}

async function ensureRefreshTokenIndexes(conn) {
  const indexes = [
    { name: 'uniq_refresh_token', ddl: 'ALTER TABLE refresh_tokens ADD UNIQUE KEY uniq_refresh_token (token_hash)' },
    { name: 'idx_refresh_family', ddl: 'ALTER TABLE refresh_tokens ADD INDEX idx_refresh_family (refresh_family_id)' },
    { name: 'idx_refresh_device', ddl: 'ALTER TABLE refresh_tokens ADD INDEX idx_refresh_device (device_id)' },
    { name: 'idx_refresh_revoked', ddl: 'ALTER TABLE refresh_tokens ADD INDEX idx_refresh_revoked (revoked_at)' },
    { name: 'idx_refresh_created', ddl: 'ALTER TABLE refresh_tokens ADD INDEX idx_refresh_created (created_at)' },
  ];
  for (const idx of indexes) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'refresh_tokens' AND INDEX_NAME = ?`,
      [DB_NAME, idx.name]
    );
    if (!rows[0]?.c) {
      await conn.query(idx.ddl);
    }
  }
}

async function ensureTransactionIndexes(conn) {
  const indexes = [
    { name: 'idx_tx_user_created', ddl: 'ALTER TABLE transactions ADD INDEX idx_tx_user_created (user_id, created_at)' },
    { name: 'idx_tx_status_type', ddl: 'ALTER TABLE transactions ADD INDEX idx_tx_status_type (status, type)' },
  ];
  for (const idx of indexes) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'transactions' AND INDEX_NAME = ?`,
      [DB_NAME, idx.name]
    );
    if (!rows[0]?.c) {
      await conn.query(idx.ddl);
    }
  }
}

async function ensureSecurityEventIndexes(conn) {
  const indexes = [
    { name: 'idx_event_actor_created', ddl: 'ALTER TABLE security_events ADD INDEX idx_event_actor_created (actor_type, actor_id, created_at)' },
  ];
  for (const idx of indexes) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'security_events' AND INDEX_NAME = ?`,
      [DB_NAME, idx.name]
    );
    if (!rows[0]?.c) {
      await conn.query(idx.ddl);
    }
  }
}

async function ensureAuditLogIndexes(conn) {
  const indexes = [
    { name: 'idx_audit_actor_created', ddl: 'ALTER TABLE audit_logs ADD INDEX idx_audit_actor_created (actor_type, actor_id, created_at)' },
  ];
  for (const idx of indexes) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'audit_logs' AND INDEX_NAME = ?`,
      [DB_NAME, idx.name]
    );
    if (!rows[0]?.c) {
      await conn.query(idx.ddl);
    }
  }
}

async function ensureNotificationIndexes(conn) {
  const indexes = [
    { name: 'idx_notification_user_created', ddl: 'ALTER TABLE notifications ADD INDEX idx_notification_user_created (user_id, created_at)' },
    { name: 'idx_notification_read', ddl: 'ALTER TABLE notifications ADD INDEX idx_notification_read (read_at)' },
  ];
  for (const idx of indexes) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notifications' AND INDEX_NAME = ?`,
      [DB_NAME, idx.name]
    );
    if (!rows[0]?.c) {
      await conn.query(idx.ddl);
    }
  }
}

async function ensureUserDeviceIndexes(conn) {
  const indexes = [
    { name: 'idx_device_user_last', ddl: 'ALTER TABLE user_devices ADD INDEX idx_device_user_last (user_id, last_seen)' },
    { name: 'idx_device_id', ddl: 'ALTER TABLE user_devices ADD INDEX idx_device_id (device_id)' },
  ];
  for (const idx of indexes) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_devices' AND INDEX_NAME = ?`,
      [DB_NAME, idx.name]
    );
    if (!rows[0]?.c) {
      await conn.query(idx.ddl);
    }
  }
}

async function ensureVtpassEventIndexes(conn) {
  const indexes = [
    { name: 'idx_vtpass_status', ddl: 'ALTER TABLE vtpass_events ADD INDEX idx_vtpass_status (status)' },
    { name: 'idx_vtpass_updated', ddl: 'ALTER TABLE vtpass_events ADD INDEX idx_vtpass_updated (updated_at)' },
  ];
  for (const idx of indexes) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'vtpass_events' AND INDEX_NAME = ?`,
      [DB_NAME, idx.name]
    );
    if (!rows[0]?.c) {
      await conn.query(idx.ddl);
    }
  }
}

async function ensureFlutterwaveEventColumns(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'flutterwave_events'`,
    [DB_NAME]
  );
  const existing = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!existing.has('processed_at')) {
    await conn.query(
      'ALTER TABLE flutterwave_events ADD COLUMN processed_at TIMESTAMP NULL'
    );
    await conn.query(
      'UPDATE flutterwave_events SET processed_at = created_at WHERE processed_at IS NULL'
    );
  }
}

async function ensureFlutterwaveEventIndexes(conn) {
  const indexes = [
    { name: 'uniq_event_id', ddl: 'ALTER TABLE flutterwave_events ADD UNIQUE KEY uniq_event_id (event_id)', unique: true },
    { name: 'idx_event_id', ddl: 'ALTER TABLE flutterwave_events ADD INDEX idx_event_id (event_id)', unique: false },
    { name: 'idx_flw_ref', ddl: 'ALTER TABLE flutterwave_events ADD INDEX idx_flw_ref (flw_ref)', unique: false },
    { name: 'idx_tx_ref', ddl: 'ALTER TABLE flutterwave_events ADD INDEX idx_tx_ref (tx_ref)', unique: false },
    { name: 'idx_processed_at', ddl: 'ALTER TABLE flutterwave_events ADD INDEX idx_processed_at (processed_at)', unique: false },
  ];

  for (const idx of indexes) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'flutterwave_events' AND INDEX_NAME = ?`,
      [DB_NAME, idx.name]
    );
    if (rows[0]?.c) continue;
    if (idx.name === 'uniq_event_id') {
      const [[dup]] = await conn.query(
        `SELECT COUNT(*) AS c FROM (
           SELECT event_id FROM flutterwave_events
           WHERE event_id IS NOT NULL
           GROUP BY event_id HAVING COUNT(*) > 1
         ) t`
      );
      if (!dup?.c) {
        await conn.query(idx.ddl);
      }
      continue;
    }
    if (idx.name === 'idx_event_id') {
      // Add non-unique event_id index only if unique index wasn't created
      const [uniqRows] = await conn.query(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'flutterwave_events' AND INDEX_NAME = 'uniq_event_id'`,
        [DB_NAME]
      );
      if (!uniqRows[0]?.c) {
        await conn.query(idx.ddl);
      }
      continue;
    }
    await conn.query(idx.ddl);
  }
}

async function ensureAdminAdjustmentsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS admin_adjustments (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      type ENUM('credit','debit') NOT NULL,
      amount DECIMAL(14,2) NOT NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      reason VARCHAR(255) NULL,
      requested_by CHAR(36) NOT NULL,
      approved_by CHAR(36) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_adj_user (user_id),
      INDEX idx_adj_status (status),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

async function ensureBillProviderLogoColumn(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bill_providers'`,
    [DB_NAME]
  );
  const existing = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!existing.has('logo_url')) {
    await conn.query('ALTER TABLE bill_providers ADD COLUMN logo_url VARCHAR(255) NULL');
  }
  await conn.query(
    `UPDATE bill_providers
     SET logo_url = CASE code
       WHEN 'mtn' THEN 'https://logo.clearbit.com/mtn.ng'
       WHEN 'airtel' THEN 'https://logo.clearbit.com/airtel.com.ng'
       WHEN 'glo' THEN 'https://logo.clearbit.com/gloworld.com'
       WHEN '9mobile' THEN 'https://logo.clearbit.com/9mobile.com.ng'
       WHEN 'mtn-data' THEN 'https://logo.clearbit.com/mtn.ng'
       WHEN 'airtel-data' THEN 'https://logo.clearbit.com/airtel.com.ng'
       WHEN 'glo-data' THEN 'https://logo.clearbit.com/gloworld.com'
       WHEN '9mobile-data' THEN 'https://logo.clearbit.com/9mobile.com.ng'
       WHEN 'dstv' THEN 'https://logo.clearbit.com/dstv.com'
       WHEN 'gotv' THEN 'https://logo.clearbit.com/gotvafrica.com'
       WHEN 'startimes' THEN 'https://logo.clearbit.com/startimestv.com'
       WHEN 'ikedc' THEN 'https://logo.clearbit.com/ikedc.com'
       WHEN 'ekedc' THEN 'https://logo.clearbit.com/ekedp.com'
       WHEN 'aedc' THEN 'https://logo.clearbit.com/aedc.com.ng'
       WHEN 'waec' THEN 'https://logo.clearbit.com/waecnigeria.org'
       WHEN 'jamb' THEN 'https://logo.clearbit.com/jamb.gov.ng'
       WHEN 'bet9ja' THEN 'https://logo.clearbit.com/bet9ja.com'
       WHEN 'sportybet' THEN 'https://logo.clearbit.com/sportybet.com'
       WHEN 'spectranet' THEN 'https://logo.clearbit.com/spectranet.com.ng'
       WHEN 'smile' THEN 'https://logo.clearbit.com/smile.com.ng'
       ELSE logo_url
     END
     WHERE logo_url IS NULL`
  );
}

async function ensureBillOrderProviderNullable(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bill_orders' AND COLUMN_NAME = 'provider_id'`,
    [DB_NAME]
  );
  if (cols.length && cols[0].IS_NULLABLE === 'NO') {
    await conn.query('ALTER TABLE bill_orders MODIFY COLUMN provider_id INT NULL');
  }
}

async function ensureSecurityEventsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS security_events (
      id CHAR(36) PRIMARY KEY,
      event_type VARCHAR(120) NOT NULL,
      severity ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
      actor_type ENUM('user','admin','system') NOT NULL DEFAULT 'system',
      actor_id CHAR(36) NULL,
      entity_type VARCHAR(80) NULL,
      entity_id VARCHAR(120) NULL,
      ip_address VARCHAR(60) NULL,
      user_agent VARCHAR(255) NULL,
      metadata JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_severity (severity),
      INDEX idx_event_type (event_type),
      INDEX idx_event_actor (actor_type, actor_id)
    )
  `);
}

async function ensureAdminNotificationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS admin_notifications (
      id CHAR(36) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      body TEXT NOT NULL,
      type ENUM('info','warning','success','error') NOT NULL DEFAULT 'info',
      target_user_id CHAR(36) NULL,
      target_scope ENUM('broadcast','single') NOT NULL DEFAULT 'broadcast',
      force TINYINT NOT NULL DEFAULT 0,
      created_by CHAR(36) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin_notify_created (created_at),
      INDEX idx_admin_notify_target (target_user_id)
    )
  `);
}

async function ensureKycVerificationTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS kyc_verifications (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      provider VARCHAR(60) NOT NULL,
      verification_type ENUM('bvn','nin') NOT NULL,
      status ENUM('pending','verified','failed','mismatch') NOT NULL DEFAULT 'pending',
      name_match TINYINT NOT NULL DEFAULT 0,
      verified_name VARCHAR(160) NULL,
      verified_dob DATE NULL,
      verified_phone VARCHAR(30) NULL,
      verified_gender VARCHAR(20) NULL,
      reference VARCHAR(120) NULL,
      request_payload JSON NULL,
      response_payload JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_kyc_user (user_id),
      INDEX idx_kyc_status (status),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

async function ensureUserTotpColumns(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
    [DB_NAME]
  );
  const existing = new Set(cols.map((c) => c.COLUMN_NAME));
  const alters = [];
  if (!existing.has('totp_secret')) {
    alters.push("ADD COLUMN totp_secret VARCHAR(255) NULL COMMENT 'Base32 encoded TOTP secret'");
  }
  if (!existing.has('totp_enabled')) {
    alters.push('ADD COLUMN totp_enabled TINYINT NOT NULL DEFAULT 0');
  }
  if (!existing.has('totp_backup_codes')) {
    alters.push("ADD COLUMN totp_backup_codes JSON NULL COMMENT 'Array of hashed backup codes'");
  }
  if (!existing.has('backup_codes_used')) {
    alters.push("ADD COLUMN backup_codes_used JSON NULL COMMENT 'Array of used backup code hashes'");
  }
  if (alters.length) {
    await conn.query(`ALTER TABLE users ${alters.join(', ')}`);
  }
}

async function ensureAccountClosureTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS account_closure_requests (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      reason VARCHAR(255) NULL,
      feedback TEXT NULL,
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      scheduled_deletion_at TIMESTAMP NULL,
      status ENUM('pending','cancelled','completed') NOT NULL DEFAULT 'pending',
      cancel_token_hash CHAR(64) NULL,
      cancelled_at TIMESTAMP NULL,
      INDEX idx_closure_user (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

async function ensureDataExportTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS data_export_requests (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      INDEX idx_export_user (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

async function ensureUserPasswordUpdatedAt(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
    [DB_NAME]
  );
  const existing = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!existing.has('password_updated_at')) {
    await conn.query('ALTER TABLE users ADD COLUMN password_updated_at TIMESTAMP NULL');
  }
}
