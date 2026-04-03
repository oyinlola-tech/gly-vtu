export async function ensureAdminDisableColumns(conn, dbName) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin_users'`,
    [dbName]
  );
  const existing = new Set(cols.map((c) => c.COLUMN_NAME));
  const alters = [];
  if (!existing.has('disabled_at')) {
    alters.push('ADD COLUMN disabled_at TIMESTAMP NULL');
  }
  if (!existing.has('disabled_by')) {
    alters.push('ADD COLUMN disabled_by CHAR(36) NULL');
  }
  if (!existing.has('disabled_reason')) {
    alters.push('ADD COLUMN disabled_reason VARCHAR(255) NULL');
  }
  if (alters.length) {
    await conn.query(`ALTER TABLE admin_users ${alters.join(', ')}`);
  }
}
