export async function ensureAdminTotpColumns(conn, dbName) {
  const [tables] = await conn.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin_users'`,
    [dbName]
  );
  if (!tables.length) return;

  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin_users'`,
    [dbName]
  );
  const existing = new Set(cols.map((c) => c.COLUMN_NAME));
  const alters = [];

  if (!existing.has('totp_secret')) {
    alters.push("ADD COLUMN totp_secret VARCHAR(255) NULL COMMENT 'Base32 encoded TOTP secret'");
  }
  if (!existing.has('totp_enabled')) {
    alters.push('ADD COLUMN totp_enabled BOOLEAN DEFAULT 0');
  }
  if (!existing.has('totp_backup_codes')) {
    alters.push("ADD COLUMN totp_backup_codes JSON NULL COMMENT 'Array of hashed backup codes'");
  }
  if (!existing.has('backup_codes_used')) {
    alters.push("ADD COLUMN backup_codes_used JSON NULL COMMENT 'Array of used backup code hashes'");
  }

  if (alters.length) {
    await conn.query(`ALTER TABLE admin_users ${alters.join(', ')}`);
  }
}
