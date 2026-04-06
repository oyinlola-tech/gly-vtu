import express from 'express';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { requirePermission } from '../middleware/permissions.js';
import { validateQuery, adminAuditQuerySchema } from '../middleware/requestValidation.js';

const router = express.Router();

router.get('/', requireAdmin, requirePermission('audit:read'), validateQuery(adminAuditQuerySchema), async (req, res) => {
  /*
    #swagger.tags = ['Admin Audit']
    #swagger.summary = 'Query audit logs'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['limit'] = { in: 'query', type: 'number' }
    #swagger.parameters['offset'] = { in: 'query', type: 'number' }
    #swagger.parameters['actorType'] = { in: 'query', type: 'string' }
    #swagger.parameters['actorId'] = { in: 'query', type: 'string' }
    #swagger.parameters['action'] = { in: 'query', type: 'string' }
    #swagger.parameters['entityType'] = { in: 'query', type: 'string' }
    #swagger.parameters['from'] = { in: 'query', type: 'string' }
    #swagger.parameters['to'] = { in: 'query', type: 'string' }
    #swagger.responses[200] = { description: 'Audit logs', schema: { type: 'array', items: { $ref: '#/definitions/AuditLog' } } }
  */
  const limit = Math.min(Number(req.validatedQuery?.limit || 100), 200);
  const offset = Number(req.validatedQuery?.offset || 0);
  const filters = [];
  const params = [];
  if (req.validatedQuery?.actorType) {
    filters.push('actor_type = ?');
    params.push(req.validatedQuery.actorType);
  }
  if (req.validatedQuery?.actorId) {
    filters.push('actor_id = ?');
    params.push(req.validatedQuery.actorId);
  }
  if (req.validatedQuery?.action) {
    filters.push('action = ?');
    params.push(req.validatedQuery.action);
  }
  if (req.validatedQuery?.entityType) {
    filters.push('entity_type = ?');
    params.push(req.validatedQuery.entityType);
  }
  if (req.validatedQuery?.from) {
    filters.push('created_at >= ?');
    params.push(req.validatedQuery.from);
  }
  if (req.validatedQuery?.to) {
    filters.push('created_at <= ?');
    params.push(req.validatedQuery.to);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT id, actor_type, actor_id, action, entity_type, entity_id, ip_address, user_agent, metadata, created_at
     FROM audit_logs
     ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return res.json(rows);
});

export default router;
