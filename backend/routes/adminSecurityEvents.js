import express from 'express';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { requirePermission } from '../middleware/permissions.js';
import { validateQuery, adminSecurityEventsQuerySchema } from '../middleware/requestValidation.js';

const router = express.Router();

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvSanitize(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(str)) return `'${str}`;
  return str;
}

router.get('/', requireAdmin, requirePermission('audit:read'), validateQuery(adminSecurityEventsQuerySchema), async (req, res) => {
  const exportCsv = String(req.validatedQuery?.export || '').toLowerCase() === 'csv';
  const limit = Math.min(Number(req.validatedQuery?.limit || 100), 200);
  const offset = Math.max(Number(req.validatedQuery?.offset || 0), 0);
  const filters = [];
  const params = [];

  if (req.validatedQuery?.severity) {
    filters.push('severity = ?');
    params.push(req.validatedQuery.severity);
  }
  if (req.validatedQuery?.type) {
    filters.push('event_type LIKE ?');
    params.push(`%${req.validatedQuery.type}%`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT id, event_type, severity, actor_type, actor_id, ip_address, user_agent, metadata, created_at
     FROM security_events
     ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  if (!exportCsv) {
    return res.json(rows || []);
  }

  const header = ['id', 'event_type', 'severity', 'actor_type', 'actor_id', 'ip_address', 'user_agent', 'metadata', 'created_at'];
  const lines = [header.join(',')];
  for (const row of rows || []) {
    lines.push(
      [
        row.id,
        row.event_type,
        row.severity,
        row.actor_type,
        row.actor_id,
        row.ip_address || '',
        row.user_agent || '',
        row.metadata ? JSON.stringify(row.metadata) : '',
        row.created_at ? new Date(row.created_at).toISOString() : '',
      ]
        .map(csvSanitize)
        .map(csvEscape)
        .join(',')
    );
  }

  const filename = `security-events-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(lines.join('\n'));
});

export default router;
