import cron from 'node-cron';
import { pool } from '../config/db.js';
import { logger } from './logger.js';

/**
 * Automated token cleanup jobs
 * Removes expired and revoked tokens to prevent database bloat
 */
export class TokenCleanupManager {
  static isInitialized = false;

  /**
   * Initialize all cleanup jobs
   * Should be called once on application startup
   */
  static initializeCleanupJobs() {
    if (this.isInitialized) return;

    logger.info('Initializing token cleanup jobs...');

    // Daily cleanup of expired tokens (runs at 2 AM)
    this.scheduleExpiredTokenCleanup();

    // Hourly cleanup of very old revoked tokens (runs every hour at :00)
    this.scheduleRevokedTokenCleanup();

    // Weekly cleanup of orphaned sessions (runs Sundays at 3 AM)
    this.scheduleOrphanedSessionCleanup();

    this.isInitialized = true;
    logger.info('Token cleanup jobs initialized successfully');
  }

  /**
   * Clean up tokens that have expired (daily)
   * Keeps tokens for 30 days after expiration for audit purposes
   */
  static scheduleExpiredTokenCleanup() {
    // Run every day at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        const result = await pool.query(
          `DELETE FROM refresh_tokens 
           WHERE expires_at < NOW() - INTERVAL 30 DAY
           AND (revoked_at IS NULL OR revoked_at < NOW() - INTERVAL 7 DAY)`
        );

        logger.info('Expired token cleanup completed', {
          deletedTokens: result[0].affectedRows,
          timestamp: new Date()
        });
      } catch (err) {
        logger.error('Expired token cleanup failed', {
          error: err.message,
          stack: err.stack
        });
      }
    });
  }

  /**
   * Clean up very old revoked tokens (hourly)
   */
  static scheduleRevokedTokenCleanup() {
    // Run every hour at minute 0
    cron.schedule('0 * * * *', async () => {
      try {
        const result = await pool.query(
          `DELETE FROM refresh_tokens 
           WHERE revoked_at IS NOT NULL 
           AND revoked_at < NOW() - INTERVAL 90 DAY`
        );

        if (result[0].affectedRows > 0) {
          logger.info('Old revoked token cleanup completed', {
            deletedTokens: result[0].affectedRows
          });
        }
      } catch (err) {
        logger.error('Revoked token cleanup failed', {
          error: err.message
        });
      }
    });
  }

  /**
   * Clean up orphaned sessions/tokens (weekly)
   * Tokens without corresponding user accounts
   */
  static scheduleOrphanedSessionCleanup() {
    // Run Sundays at 3:00 AM
    cron.schedule('0 3 * * 0', async () => {
      try {
        const result = await pool.query(
          `DELETE FROM refresh_tokens 
           WHERE user_id NOT IN (SELECT id FROM users)
           AND admin_id NOT IN (SELECT id FROM admins)`
        );

        logger.info('Orphaned token cleanup completed', {
          deletedTokens: result[0].affectedRows
        });
      } catch (err) {
        logger.error('Orphaned token cleanup failed', {
          error: err.message
        });
      }
    });
  }

  /**
   * Clean up tokens for a specific user
   * Useful when a user changes password or logs out from all devices
   */
  static async cleanupUserTokens(userId) {
    try {
      const result = await pool.query(
        `DELETE FROM refresh_tokens 
         WHERE user_id = ? AND expires_at < NOW()`,
        [userId]
      );

      logger.info('User token cleanup completed', {
        userId,
        deletedTokens: result[0].affectedRows
      });

      return result[0].affectedRows;
    } catch (err) {
      logger.error('User token cleanup failed', {
        userId,
        error: err.message
      });
      throw err;
    }
  }

  /**
   * Revoke all tokens for a user (logout from all devices)
   */
  static async revokeAllUserTokens(userId) {
    try {
      const result = await pool.query(
        `UPDATE refresh_tokens 
         SET revoked_at = NOW()
         WHERE user_id = ? AND revoked_at IS NULL`,
        [userId]
      );

      logger.info('All user tokens revoked', {
        userId,
        revokedTokens: result[0].affectedRows
      });

      return result[0].affectedRows;
    } catch (err) {
      logger.error('User token revocation failed', {
        userId,
        error: err.message
      });
      throw err;
    }
  }

  /**
   * Revoke a specific token
   */
  static async revokeToken(tokenHash) {
    try {
      const result = await pool.query(
        `UPDATE refresh_tokens 
         SET revoked_at = NOW()
         WHERE token_hash = ? AND revoked_at IS NULL`,
        [tokenHash]
      );

      return result[0].affectedRows > 0;
    } catch (err) {
      logger.error('Token revocation failed', {
        error: err.message
      });
      throw err;
    }
  }

  /**
   * Get database statistics (for monitoring)
   */
  static async getTokenStats() {
    try {
      const [stats] = await pool.query(
        `SELECT 
           COUNT(*) as total_tokens,
           SUM(CASE WHEN revoked_at IS NULL AND expires_at > NOW() THEN 1 ELSE 0 END) as active_tokens,
           SUM(CASE WHEN revoked_at IS NOT NULL THEN 1 ELSE 0 END) as revoked_tokens,
           SUM(CASE WHEN expires_at < NOW() THEN 1 ELSE 0 END) as expired_tokens
         FROM refresh_tokens`
      );

      return stats[0];
    } catch (err) {
      logger.error('Failed to get token statistics', {
        error: err.message
      });
      return null;
    }
  }
}

/**
 * Usage in server.js:
 * 
 * import { TokenCleanupManager } from './backend/utils/tokenCleanup.js';
 * 
 * app.listen(PORT, () => {
 *   TokenCleanupManager.initializeCleanupJobs();
 *   logger.info(`Server listening on port ${PORT}`);
 * });
 */

export default TokenCleanupManager;
