import express from 'express';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { requirePermission } from '../middleware/permissions.js';
import { fetchVirtualAccount } from '../utils/flutterwave.js';
import { validateRequest, adminFlutterwaveRequerySchema } from '../middleware/requestValidation.js';

const router = express.Router();

router.post('/virtual-accounts/requery', requireAdmin, requirePermission('accounts:read'), validateRequest(adminFlutterwaveRequerySchema), async (req, res) => {
  const { userId, accountReference } = req.validated || req.body || {};
  let row = null;
  if (userId) {
    const [[found]] = await pool.query(
      'SELECT * FROM reserved_accounts WHERE user_id = ? AND provider = ? LIMIT 1',
      [userId, 'flutterwave']
    );
    row = found;
  } else if (accountReference) {
    const [[found]] = await pool.query(
      'SELECT * FROM reserved_accounts WHERE account_reference = ? AND provider = ? LIMIT 1',
      [accountReference, 'flutterwave']
    );
    row = found;
  }
  if (!row) return res.status(404).json({ error: 'Account not found' });
  if (!row.reservation_reference) {
    return res.status(400).json({ error: 'Missing order reference' });
  }

  const data = await fetchVirtualAccount(row.reservation_reference);
  const account = data?.data || {};
  await pool.query(
    `UPDATE reserved_accounts
     SET account_number = ?, bank_name = ?, bank_code = ?, raw_response = ?
     WHERE id = ?`,
    [
      account.account_number || row.account_number,
      account.bank_name || row.bank_name,
      account.bank_code || row.bank_code,
      JSON.stringify(data || {}),
      row.id,
    ]
  );
  return res.json({ message: 'Requery complete', account: account });
});

export default router;
