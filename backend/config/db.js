import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

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
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  multipleStatements: true,
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
    passwordHash = await bcrypt.hash(adminPassword, 12);
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
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_meta (
        id INT PRIMARY KEY,
        seeded TINYINT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY,
        full_name VARCHAR(120) NOT NULL,
        email VARCHAR(120) NOT NULL UNIQUE,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(120) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(40) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    await ensureUserLoginLockColumns(conn);
    await ensureUserPhoneNullable(conn);
    await ensureRefreshTokenFamilyColumns(conn);
    await ensureIdempotencyTable(conn);
    await ensureTransactionReferenceUnique(conn);
    await ensureBillOrderReferenceUnique(conn);
    await ensureAdminAdjustmentsTable(conn);
    await ensureBillProviderLogoColumn(conn);
    await ensureBillOrderProviderNullable(conn);
  } finally {
    conn.release();
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
