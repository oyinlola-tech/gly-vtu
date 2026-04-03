export async function ensureAccountLockoutColumns(conn, dbName) {
  const [userCols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
    [dbName]
  );
  const userExisting = new Set(userCols.map((c) => c.COLUMN_NAME));
  const userAlters = [];
  if (!userExisting.has('login_failed_attempts')) {
    userAlters.push('ADD COLUMN login_failed_attempts INT NOT NULL DEFAULT 0');
  }
  if (!userExisting.has('login_locked_until')) {
    userAlters.push('ADD COLUMN login_locked_until TIMESTAMP NULL');
  }
  if (!userExisting.has('last_login_failed_at')) {
    userAlters.push('ADD COLUMN last_login_failed_at TIMESTAMP NULL');
  }
  if (userAlters.length) {
    await conn.query(`ALTER TABLE users ${userAlters.join(', ')}`);
  }

  const [adminCols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin_users'`,
    [dbName]
  );
  const adminExisting = new Set(adminCols.map((c) => c.COLUMN_NAME));
  const adminAlters = [];
  if (!adminExisting.has('login_failed_attempts')) {
    adminAlters.push('ADD COLUMN login_failed_attempts INT NOT NULL DEFAULT 0');
  }
  if (!adminExisting.has('login_locked_until')) {
    adminAlters.push('ADD COLUMN login_locked_until TIMESTAMP NULL');
  }
  if (!adminExisting.has('last_login_failed_at')) {
    adminAlters.push('ADD COLUMN last_login_failed_at TIMESTAMP NULL');
  }
  if (!adminExisting.has('last_login')) {
    adminAlters.push('ADD COLUMN last_login TIMESTAMP NULL');
  }
  if (!adminExisting.has('last_login_ip')) {
    adminAlters.push('ADD COLUMN last_login_ip VARCHAR(60) NULL');
  }
  if (adminAlters.length) {
    await conn.query(`ALTER TABLE admin_users ${adminAlters.join(', ')}`);
  }
}

