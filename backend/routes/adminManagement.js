import express from 'express';
import argon2 from 'argon2';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { requirePermission, rolePermissions } from '../middleware/permissions.js';
import { logAudit } from '../utils/audit.js';
import { logger } from '../utils/logger.js';
import {
  validateParams,
  validateRequest,
  adminManagementCreateSchema,
  adminRoleUpdateSchema,
  adminAdjustmentIdParamSchema,
} from '../middleware/requestValidation.js';

const router = express.Router();

router.get('/', requireAdmin, requirePermission('admin:manage'), async (req, res) => {
  /*
    #swagger.tags = ['Admin Management']
    #swagger.summary = 'List admin users'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Admins', schema: { type: 'array', items: { $ref: '#/definitions/AdminUser' } } }
  */
  const [rows] = await pool.query(
    'SELECT id, name, email, role, created_at, disabled_at, disabled_by, disabled_reason FROM admin_users ORDER BY created_at DESC'
  );
  return res.json(rows);
});

router.get('/roles', requireAdmin, requirePermission('admin:manage'), async (req, res) => {
  /*
    #swagger.tags = ['Admin Management']
    #swagger.summary = 'List available roles'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Roles', schema: { type: 'array', items: { type: 'string' } } }
  */
  return res.json(Object.keys(rolePermissions));
});

router.get('/role-matrix', requireAdmin, requirePermission('admin:manage'), async (req, res) => {
  /*
    #swagger.tags = ['Admin Management']
    #swagger.summary = 'Role permissions matrix'
    #swagger.security = [{ "bearerAuth": [] }]
  */
  return res.json(rolePermissions);
});

router.post('/', requireAdmin, requirePermission('admin:manage'), validateRequest(adminManagementCreateSchema), async (req, res) => {
  /*
    #swagger.tags = ['Admin Management']
    #swagger.summary = 'Create an admin user'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/AdminCreateRequest' } }
    #swagger.responses[201] = { description: 'Created', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const { name, email, password, role } = req.validated || req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (!rolePermissions[role]) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const [existing] = await pool.query('SELECT id FROM admin_users WHERE email = ?', [normalizedEmail]);
  if (existing.length) return res.status(409).json({ error: 'Admin already exists' });

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });
  await pool.query(
    'INSERT INTO admin_users (id, name, email, password_hash, role) VALUES (UUID(), ?, ?, ?, ?)',
    [name, normalizedEmail, passwordHash, role]
  );

  logAudit({
    actorType: 'admin',
    actorId: req.admin.sub,
    action: 'admin.create',
    entityType: 'admin',
    entityId: email,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: { role },
  }).catch((err) => logger.error('Audit log failed (admin.create)', { error: logger.format(err) }));

  return res.status(201).json({ message: 'Admin created' });
});

router.put('/:id/role', requireAdmin, requirePermission('admin:manage'), validateParams(adminAdjustmentIdParamSchema), validateRequest(adminRoleUpdateSchema), async (req, res) => {
  /*
    #swagger.tags = ['Admin Management']
    #swagger.summary = 'Update admin role'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/AdminRoleUpdateRequest' } }
    #swagger.responses[200] = { description: 'Updated', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const { role } = req.validated || req.body || {};
  if (!role || !rolePermissions[role]) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  await pool.query('UPDATE admin_users SET role = ? WHERE id = ?', [role, req.validatedParams.id]);
  logAudit({
    actorType: 'admin',
    actorId: req.admin.sub,
    action: 'admin.role.update',
    entityType: 'admin',
    entityId: req.validatedParams.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: { role },
  }).catch((err) => logger.error('Audit log failed (admin.role.update)', { error: logger.format(err) }));
  return res.json({ message: 'Role updated' });
});

router.patch('/:id/disable', requireAdmin, requirePermission('admin:manage'), validateParams(adminAdjustmentIdParamSchema), async (req, res) => {
  /*
    #swagger.tags = ['Admin Management']
    #swagger.summary = 'Disable admin user'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Disabled', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const adminId = req.validatedParams.id;
  if (adminId === req.admin.sub) {
    return res.status(400).json({ error: 'You cannot disable your own account' });
  }

  const [rows] = await pool.query('SELECT id, role, disabled_at FROM admin_users WHERE id = ? LIMIT 1', [adminId]);
  if (!rows.length) return res.status(404).json({ error: 'Admin not found' });
  if (rows[0].disabled_at) return res.status(409).json({ error: 'Admin already disabled' });

  if (rows[0].role === 'superadmin') {
    const [[countRow]] = await pool.query(
      'SELECT COUNT(*) AS count FROM admin_users WHERE role = ? AND disabled_at IS NULL',
      ['superadmin']
    );
    if (Number(countRow?.count || 0) <= 1) {
      return res.status(409).json({ error: 'At least one active super admin must remain' });
    }
  }

  await pool.query(
    'UPDATE admin_users SET disabled_at = NOW(), disabled_by = ?, disabled_reason = ? WHERE id = ?',
    [req.admin.sub, req.body?.reason || null, adminId]
  );
  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE admin_id = ?', [adminId]);

  logAudit({
    actorType: 'admin',
    actorId: req.admin.sub,
    action: 'admin.disable',
    entityType: 'admin',
    entityId: adminId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch((err) => logger.error('Audit log failed (admin.disable)', { error: logger.format(err) }));

  return res.json({ message: 'Admin disabled' });
});

router.patch('/:id/enable', requireAdmin, requirePermission('admin:manage'), validateParams(adminAdjustmentIdParamSchema), async (req, res) => {
  /*
    #swagger.tags = ['Admin Management']
    #swagger.summary = 'Enable admin user'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Enabled', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const adminId = req.validatedParams.id;
  const [rows] = await pool.query('SELECT id, disabled_at FROM admin_users WHERE id = ? LIMIT 1', [adminId]);
  if (!rows.length) return res.status(404).json({ error: 'Admin not found' });
  if (!rows[0].disabled_at) return res.status(409).json({ error: 'Admin already active' });

  await pool.query(
    'UPDATE admin_users SET disabled_at = NULL, disabled_by = NULL, disabled_reason = NULL WHERE id = ?',
    [adminId]
  );

  logAudit({
    actorType: 'admin',
    actorId: req.admin.sub,
    action: 'admin.enable',
    entityType: 'admin',
    entityId: adminId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch((err) => logger.error('Audit log failed (admin.enable)', { error: logger.format(err) }));

  return res.json({ message: 'Admin enabled' });
});

router.delete('/:id', requireAdmin, requirePermission('admin:manage'), validateParams(adminAdjustmentIdParamSchema), async (req, res) => {
  /*
    #swagger.tags = ['Admin Management']
    #swagger.summary = 'Delete admin user'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Deleted', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const adminId = req.validatedParams.id;
  if (adminId === req.admin.sub) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const [rows] = await pool.query('SELECT id, role FROM admin_users WHERE id = ? LIMIT 1', [adminId]);
  if (!rows.length) return res.status(404).json({ error: 'Admin not found' });

  if (rows[0].role === 'superadmin') {
    const [[countRow]] = await pool.query(
      'SELECT COUNT(*) AS count FROM admin_users WHERE role = ?',
      ['superadmin']
    );
    if (Number(countRow?.count || 0) <= 1) {
      return res.status(409).json({ error: 'At least one super admin must remain' });
    }
  }

  await pool.query('DELETE FROM admin_users WHERE id = ?', [adminId]);
  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE admin_id = ?', [adminId]);

  logAudit({
    actorType: 'admin',
    actorId: req.admin.sub,
    action: 'admin.delete',
    entityType: 'admin',
    entityId: adminId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch((err) => logger.error('Audit log failed (admin.delete)', { error: logger.format(err) }));

  return res.json({ message: 'Admin deleted' });
});

export default router;
