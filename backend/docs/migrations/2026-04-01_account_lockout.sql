-- Add login lockout tracking for users and admins
ALTER TABLE users ADD COLUMN login_failed_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN login_locked_until TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN last_login_failed_at TIMESTAMP NULL;

ALTER TABLE admin_users ADD COLUMN login_failed_attempts INT DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN login_locked_until TIMESTAMP NULL;
ALTER TABLE admin_users ADD COLUMN last_login_failed_at TIMESTAMP NULL;

