import { pool } from '../config/db.js';

const FLW_RETENTION_DAYS = Number(process.env.FLW_EVENTS_RETENTION_DAYS || 90);
const VTPASS_RETENTION_DAYS = Number(process.env.VTPASS_EVENTS_RETENTION_DAYS || 90);
const AUDIT_RETENTION_DAYS = Number(process.env.AUDIT_LOG_RETENTION_DAYS || 365);
const SECURITY_RETENTION_DAYS = Number(process.env.SECURITY_EVENT_RETENTION_DAYS || 365);

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
