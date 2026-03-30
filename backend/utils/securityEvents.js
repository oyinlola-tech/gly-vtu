import { pool } from '../config/db.js';

const DEFAULT_SEVERITY = 'medium';

export async function logSecurityEvent({
  type,
  severity = DEFAULT_SEVERITY,
  actorType = 'system',
  actorId = null,
  entityType = null,
  entityId = null,
  ip = null,
  userAgent = null,
  metadata = null,
} = {}) {
  if (!type) return;
  try {
    await pool.query(
      `INSERT INTO security_events
       (id, event_type, severity, actor_type, actor_id, entity_type, entity_id, ip_address, user_agent, metadata)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type,
        severity,
        actorType,
        actorId,
        entityType,
        entityId,
        ip,
        userAgent,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch {
    // Avoid blocking critical flows on logging failures
  }
}

