-- Add encrypted PII fields and deterministic hashes for lookups
ALTER TABLE users ADD COLUMN full_name_encrypted VARCHAR(500);
ALTER TABLE users ADD COLUMN email_encrypted VARCHAR(500);
ALTER TABLE users ADD COLUMN phone_encrypted VARCHAR(500);
ALTER TABLE users ADD COLUMN email_hash CHAR(64);
ALTER TABLE users ADD COLUMN phone_hash CHAR(64);
ALTER TABLE users ADD COLUMN kyc_payload_encrypted LONGTEXT;

-- Optional: mark legacy plaintext fields for deprecation
-- full_name, email, phone, kyc_payload remain for backward compatibility

-- Recommended indexes for lookup hashes
CREATE UNIQUE INDEX idx_users_email_hash ON users(email_hash);
CREATE INDEX idx_users_phone_hash ON users(phone_hash);

