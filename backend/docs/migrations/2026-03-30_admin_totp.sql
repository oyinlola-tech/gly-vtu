-- Admin MFA (TOTP) support
ALTER TABLE admin_users
  ADD COLUMN totp_secret VARCHAR(255) NULL COMMENT 'Base32 encoded TOTP secret',
  ADD COLUMN totp_enabled BOOLEAN DEFAULT 0,
  ADD COLUMN totp_backup_codes JSON NULL COMMENT 'Array of hashed backup codes',
  ADD COLUMN backup_codes_used JSON NULL COMMENT 'Array of used backup code hashes';
