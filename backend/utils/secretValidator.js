import crypto from 'crypto';
import { logger } from './logger.js';

/**
 * CRITICAL: Validate all required security secrets on startup
 * This prevents the application from running with default/hardcoded secrets
 */
export class SecretValidator {
  static requiredSecrets = [
    'JWT_SECRET',
    'JWT_ADMIN_SECRET',
    'COOKIE_ENC_SECRET',
    'PII_ENCRYPTION_KEY',
    'PII_HASH_SECRET',
    'DB_PASSWORD',
    'FLW_SECRET_KEY',
    'VTPASS_API_KEY',
    'VTPASS_SECRET_KEY',
    'EMAIL_API_KEY'
  ];

  static minSecretLength = 32;
  static forbiddenDefaults = [
    'dev_secret_change_me',
    'change_this',
    'change_me',
    'test',
    'secret',
    '123456789',
    'password'
  ];

  /**
   * Validate all required secrets before server startup
   * Throws error if any required secret is missing or invalid
   */
  static validateSecrets() {
    const errors = [];
    const isProduction = process.env.NODE_ENV === 'production';
    const awsEnabled = process.env.AWS_SECRETS_ENABLED === 'true';
    const awsManagedSecrets = new Set(['FLW_SECRET_KEY', 'VTPASS_API_KEY', 'VTPASS_SECRET_KEY']);

    // Check for required secrets
    for (const secretName of this.requiredSecrets) {
      const secretValue = process.env[secretName];

      // In production, all secrets are required
      if (isProduction && !secretValue) {
        if (awsEnabled && awsManagedSecrets.has(secretName)) {
          continue;
        }
        errors.push(`[CRITICAL] ${secretName} is not configured. Set the environment variable.`);
        continue;
      }

      // Check minimum length
      if (secretValue && secretValue.length < this.minSecretLength) {
        errors.push(
          `[CRITICAL] ${secretName} is too short. Minimum ${this.minSecretLength} characters required. ` +
          `Current length: ${secretValue.length}`
        );
      }

      // Check for forbidden default values
      if (secretValue && this.forbiddenDefaults.some(def => secretValue.includes(def))) {
        errors.push(
          `[CRITICAL] ${secretName} appears to contain a default value. ` +
          `Generate a new random secret using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
        );
      }
    }

    // JWT_SECRET and JWT_ADMIN_SECRET should NOT be the same
    if (process.env.JWT_SECRET && process.env.JWT_ADMIN_SECRET) {
      if (process.env.JWT_SECRET === process.env.JWT_ADMIN_SECRET) {
        errors.push(
          '[CRITICAL] JWT_SECRET and JWT_ADMIN_SECRET must be different. ' +
          'Generate separate secrets for each.'
        );
      }
    }

    // Database configuration validation
    if (isProduction) {
      const dbRequired = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
      for (const dbSecret of dbRequired) {
        if (!process.env[dbSecret]) {
          errors.push(`[CRITICAL] Database configuration missing: ${dbSecret}`);
        }
      }
    }

    // Report all errors and exit
    if (errors.length > 0) {
      logger.error('SECURITY VALIDATION FAILED');
      errors.forEach((err) => logger.error(err));
      logger.error('To fix:');
      logger.error('1. Create a .env file in the project root');
      logger.error('2. Generate random secrets:');
      logger.error("   node -e \"console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))\"");
      logger.error('3. Set all required environment variables');
      logger.error('4. Do NOT commit .env to version control');
      process.exit(1);
    }

    logger.info('Security validation passed');
  }

  /**
   * Generate a new cryptographically secure random secret
   * Usage: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   */
  static generateSecret(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Check if a secret is strong enough
   */
  static isStrongSecret(secret) {
    if (!secret || typeof secret !== 'string') return false;
    if (secret.length < this.minSecretLength) return false;

    // Should contain mix of character types (optional but recommended)
    const hasUppercase = /[A-Z]/.test(secret);
    const hasLowercase = /[a-z]/.test(secret);
    const hasNumbers = /[0-9]/.test(secret);
    const hasSpecialChars = /[^A-Za-z0-9]/.test(secret);

    // For generated secrets (hex), numbers + letters are sufficient
    return secret.length >= this.minSecretLength &&
           (hasNumbers || hasSpecialChars) &&
           (hasLowercase || hasUppercase);
  }
}

/**
 * Sanitize a secret for logging (show only first 4 chars)
 */
export function sanitizeSecret(secret) {
  if (!secret || secret.length < 4) return '[HIDDEN]';
  return secret.substring(0, 4) + '*'.repeat(Math.max(0, secret.length - 4));
}

/**
 * Validate secrets on application startup
 */
export function initializeSecurityValidation() {
  if (process.env.SKIP_SECRET_VALIDATION !== 'true') {
    SecretValidator.validateSecrets();
  } else {
    logger.warn('Secret validation is disabled. Only use this in development.');
  }
}

// Export for testing
export default SecretValidator;
