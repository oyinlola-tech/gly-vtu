import { pool } from '../config/db.js';
import { logger } from './logger.js';

// SECURITY: Enforce minimum retention periods for compliance
const MINIMUM_AUDIT_RETENTION_DAYS = 365; // 1 year for regulatory compliance
const MINIMUM_SECURITY_RETENTION_DAYS = 180; // 6 months for forensics
const MINIMUM_WEBHOOK_RETENTION_DAYS = 90; // 3 months for transaction reconciliation

const FLW_RETENTION_DAYS = Math.max(
  Number(process.env.FLW_EVENTS_RETENTION_DAYS || 90),
  MINIMUM_WEBHOOK_RETENTION_DAYS
);
const VTPASS_RETENTION_DAYS = Math.max(
  Number(process.env.VTPASS_EVENTS_RETENTION_DAYS || 90),
  MINIMUM_WEBHOOK_RETENTION_DAYS
);
const AUDIT_RETENTION_DAYS = Math.max(
  Number(process.env.AUDIT_LOG_RETENTION_DAYS || 365),
  MINIMUM_AUDIT_RETENTION_DAYS
);
const SECURITY_RETENTION_DAYS = Math.max(
  Number(process.env.SECURITY_EVENT_RETENTION_DAYS || 365),
  MINIMUM_SECURITY_RETENTION_DAYS
);

// Validate retention configuration on startup
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  if (Number(process.env.AUDIT_LOG_RETENTION_DAYS || 365) < MINIMUM_AUDIT_RETENTION_DAYS) {
    logger.warn(
      `Audit log retention (${process.env.AUDIT_LOG_RETENTION_DAYS} days) below recommended minimum (${MINIMUM_AUDIT_RETENTION_DAYS} days). ` +
      `Using minimum for compliance.`
    );
  }
  if (Number(process.env.SECURITY_EVENT_RETENTION_DAYS || 365) < MINIMUM_SECURITY_RETENTION_DAYS) {
    logger.warn(
      `Security event retention (${process.env.SECURITY_EVENT_RETENTION_DAYS} days) below recommended minimum (${MINIMUM_SECURITY_RETENTION_DAYS} days). ` +
      `Using minimum for forensic analysis.`
    );
  }
}

export async function pruneWebhookEvents() {
  await pool.query(
    'DELETE FROM flutterwave_events WHERE created_at < NOW() - INTERVAL ? DAY',
    [FLW_RETENTION_DAYS]
  );
  await pool.query(
    'DELETE FROM vtpass_events WHERE created_at < NOW() - INTERVAL ? DAY',
    [VTPASS_RETENTION_DAYS]
  );
}

export async function pruneAuditLogs() {
  await pool.query('DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL ? DAY', [
    AUDIT_RETENTION_DAYS,
  ]);
}

export async function pruneSecurityEvents() {
  await pool.query('DELETE FROM security_events WHERE created_at < NOW() - INTERVAL ? DAY', [
    SECURITY_RETENTION_DAYS,
  ]);
}
