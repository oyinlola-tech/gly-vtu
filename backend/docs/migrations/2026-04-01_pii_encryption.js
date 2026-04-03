export async function ensurePiiEncryptionColumns(conn, dbName) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
    [dbName]
  );
  const existing = new Set(cols.map((c) => c.COLUMN_NAME));
  const alters = [];
  if (!existing.has('full_name_encrypted')) alters.push('ADD COLUMN full_name_encrypted VARCHAR(500)');
  if (!existing.has('email_encrypted')) alters.push('ADD COLUMN email_encrypted VARCHAR(500)');
  if (!existing.has('phone_encrypted')) alters.push('ADD COLUMN phone_encrypted VARCHAR(500)');
  if (!existing.has('email_hash')) alters.push('ADD COLUMN email_hash CHAR(64)');
  if (!existing.has('phone_hash')) alters.push('ADD COLUMN phone_hash CHAR(64)');
  if (!existing.has('kyc_payload_encrypted')) alters.push('ADD COLUMN kyc_payload_encrypted LONGTEXT');
  if (alters.length) {
    await conn.query(`ALTER TABLE users ${alters.join(', ')}`);
  }
}

export async function ensurePiiEncryptionIndexes(conn, dbName) {
  const [rows] = await conn.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
    [dbName]
  );
  const existing = new Set(rows.map((r) => r.INDEX_NAME));
  if (!existing.has('uniq_email_hash')) {
    await conn.query('CREATE UNIQUE INDEX uniq_email_hash ON users (email_hash)');
  }
  if (!existing.has('uniq_phone_hash')) {
    await conn.query('CREATE UNIQUE INDEX uniq_phone_hash ON users (phone_hash)');
  }
}

