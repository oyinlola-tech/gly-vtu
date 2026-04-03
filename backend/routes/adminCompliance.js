import express from 'express';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { requirePermission } from '../middleware/permissions.js';
import { applyUserPII } from '../utils/encryption.js';

const router = express.Router();

router.get('/', requireAdmin, requirePermission('users:read'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.full_name_encrypted, u.email_encrypted, u.kyc_status, u.kyc_level, u.updated_at
     FROM users u
     WHERE u.kyc_status IN ('pending','rejected')
     ORDER BY u.updated_at DESC
     LIMIT 200`
  );
  const mapped = (rows || []).map((row) => {
    const user = applyUserPII(row);
    return {
      id: user.id,
      user_id: user.id,
      full_name: user.full_name,
      email: user.email,
      status: user.kyc_status,
      level: Number(user.kyc_level || 1),
      created_at: user.updated_at,
    };
  });
  return res.json(mapped);
});

export default router;
