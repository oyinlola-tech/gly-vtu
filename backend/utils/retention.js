import { pool } from '../config/db.js';

const FLW_RETENTION_DAYS = Number(process.env.FLW_EVENTS_RETENTION_DAYS || 90);
const VTPASS_RETENTION_DAYS = Number(process.env.VTPASS_EVENTS_RETENTION_DAYS || 90);

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
