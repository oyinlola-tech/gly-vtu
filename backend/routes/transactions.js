import express from 'express';
import { pool } from '../config/db.js';
import { requireUser } from '../middleware/auth.js';
import { generateStatementPdf, sendStatementEmail, generateReceiptPdf } from '../utils/email.js';
import { applyUserPII } from '../utils/encryption.js';
import { hydrateTransactionMetadata } from '../utils/transactionMetadata.js';
import { toCsv, csvRow } from '../utils/csv.js';
import {
  validateRequest,
  validateParams,
  transactionIdParamSchema,
  statementSchema,
  transactionsExportSchema
} from '../middleware/requestValidation.js';

const router = express.Router();

const creditTypes = new Set(['receive', 'topup']);
const debitTypes = new Set(['send', 'bill']);

function getTransactionDelta(row) {
  if (row.status !== 'success') return 0;
  if (creditTypes.has(row.type)) return Number(row.total || 0);
  if (debitTypes.has(row.type)) return -Number(row.total || 0);
  return 0;
}

async function buildStatementData({ userId, startDate, endDate }) {
  const [[wallet]] = await pool.query(
    'SELECT balance FROM wallets WHERE user_id = ?',
    [userId]
  );
  const currentBalance = Number(wallet?.balance || 0);
  const [[after]] = await pool.query(
    `SELECT COALESCE(SUM(CASE
      WHEN status = 'success' AND type IN ('receive','topup') THEN total
      WHEN status = 'success' AND type IN ('send','bill') THEN -total
      ELSE 0
    END), 0) AS net
     FROM transactions
     WHERE user_id = ?
       AND created_at > CONCAT(?, ' 23:59:59')`,
    [userId, endDate]
  );
  const netAfter = Number(after?.net || 0);
  const closingBalance = currentBalance - netAfter;

  const [rows] = await pool.query(
    `SELECT id, type, amount, fee, total, status, reference, created_at
     FROM transactions
     WHERE user_id = ?
       AND created_at >= CONCAT(?, ' 00:00:00')
       AND created_at <= CONCAT(?, ' 23:59:59')
     ORDER BY created_at ASC
     LIMIT 1000`,
    [userId, startDate, endDate]
  );

  const netWithin = rows.reduce((sum, row) => sum + getTransactionDelta(row), 0);
  const openingBalance = closingBalance - netWithin;

  let running = openingBalance;
  const enriched = rows.map((row) => {
    running += getTransactionDelta(row);
    return { ...row, running_balance: running };
  });

  return { rows: enriched, openingBalance, closingBalance };
}

function parseDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateDiffDays(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

router.get('/', requireUser, async (req, res) => {
  /*
    #swagger.tags = ['Transactions']
    #swagger.summary = 'List recent transactions'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = {
      description: 'Transactions',
      schema: { type: 'array', items: { $ref: '#/definitions/TransactionItem' } }
    }
  */
  const [rows] = await pool.query(
    'SELECT id, type, amount, fee, total, status, reference, metadata, metadata_encrypted, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.sub]
  );
  const mapped = rows.map((row) => {
    const rest = { ...row };
    delete rest.metadata_encrypted;
    return {
      ...rest,
      metadata: hydrateTransactionMetadata(row, req.user.sub),
    };
  });
  return res.json(mapped);
});

router.get('/:id', requireUser, validateParams(transactionIdParamSchema), async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, type, amount, fee, total, status, reference, metadata, metadata_encrypted, created_at FROM transactions WHERE id = ? AND user_id = ? LIMIT 1',
    [req.validatedParams.id, req.user.sub]
  );
  if (!rows.length) return res.status(404).json({ error: 'Transaction not found' });

  const row = rows[0];
  const meta = hydrateTransactionMetadata(row, req.user.sub) || {};
  const tx = { ...row };
  delete tx.metadata_encrypted;

  const recipient = {
    name:
      meta?.accountName ||
      meta?.provider ||
      meta?.to ||
      meta?.from ||
      meta?.accountNumber ||
      null,
    account: meta?.accountNumber || null,
    bank: meta?.bankName || meta?.bankCode || null,
  };

  return res.json({
    ...tx,
    metadata: meta,
    recipient,
    createdAt: tx.created_at,
    completedAt: null,
  });
});

router.get('/:id/receipt', requireUser, validateParams(transactionIdParamSchema), async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, type, amount, fee, total, status, reference, metadata, metadata_encrypted, created_at FROM transactions WHERE id = ? AND user_id = ? LIMIT 1',
    [req.validatedParams.id, req.user.sub]
  );
  if (!rows.length) return res.status(404).json({ error: 'Transaction not found' });

  const row = rows[0];
  const meta = hydrateTransactionMetadata(row, req.user.sub) || {};
  const tx = { ...row };
  delete tx.metadata_encrypted;

  const [[userRaw]] = await pool.query(
    'SELECT id, full_name, full_name_encrypted FROM users WHERE id = ?',
    [req.user.sub]
  );
  const user = applyUserPII(userRaw);
  const title = 'Transaction Receipt';
  const details = [
    `Reference: ${tx.reference}`,
    `Status: ${String(tx.status || '').toUpperCase()}`,
    `Type: ${String(tx.type || '').toUpperCase()}`,
    `Amount: NGN ${Number(tx.amount || 0).toFixed(2)}`,
    `Fee: NGN ${Number(tx.fee || 0).toFixed(2)}`,
    `Total: NGN ${Number(tx.total || 0).toFixed(2)}`,
  ];
  if (meta?.accountName || meta?.accountNumber || meta?.provider) {
    details.push(
      `Recipient: ${meta.accountName || meta.provider || meta.accountNumber}`
    );
  }

  const pdf = await generateReceiptPdf({
    title,
    name: user?.full_name,
    details,
  });
  const filename = `glyvtu-receipt-${tx.reference}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(pdf);
});

router.post('/statement', requireUser, validateRequest(statementSchema), async (req, res) => {
  /*
    #swagger.tags = ['Transactions']
    #swagger.summary = 'Email account statement PDF'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        properties: {
          startDate: { type: 'string', example: '2026-01-01' },
          endDate: { type: 'string', example: '2026-01-31' }
        }
      }
    }
    #swagger.responses[200] = { description: 'Statement queued', schema: { $ref: '#/definitions/MessageResponse' } }
  */
  const { startDate, endDate } = req.validated || req.body || {};
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) {
    return res.status(400).json({ error: 'Start and end date are required (YYYY-MM-DD)' });
  }
  if (startDate > endDate) {
    return res.status(400).json({ error: 'Start date must be before end date' });
  }
  if (dateDiffDays(start, end) > 366) {
    return res.status(400).json({ error: 'Date range too large (max 366 days)' });
  }

  const [[userRaw2]] = await pool.query(
    'SELECT id, full_name, email, full_name_encrypted, email_encrypted FROM users WHERE id = ?',
    [req.user.sub]
  );
  const user2 = applyUserPII(userRaw2);
  if (!user2?.email) {
    return res.status(400).json({ error: 'Email address not found' });
  }

  const { rows, openingBalance, closingBalance } = await buildStatementData({
    userId: req.user.sub,
    startDate,
    endDate,
  });

  await sendStatementEmail({
    to: user2.email,
    name: user2.full_name,
    startDate,
    endDate,
    openingBalance,
    closingBalance,
    transactions: rows,
  });

  return res.json({ message: 'Statement sent to your email' });
});

router.post('/statement/download', requireUser, validateRequest(statementSchema), async (req, res) => {
  /*
    #swagger.tags = ['Transactions']
    #swagger.summary = 'Download account statement PDF'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        properties: {
          startDate: { type: 'string', example: '2026-01-01' },
          endDate: { type: 'string', example: '2026-01-31' }
        }
      }
    }
  */
  const { startDate, endDate } = req.validated || req.body || {};
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) {
    return res.status(400).json({ error: 'Start and end date are required (YYYY-MM-DD)' });
  }
  if (startDate > endDate) {
    return res.status(400).json({ error: 'Start date must be before end date' });
  }
  if (dateDiffDays(start, end) > 366) {
    return res.status(400).json({ error: 'Date range too large (max 366 days)' });
  }

  const [[userRaw3]] = await pool.query(
    'SELECT id, full_name, full_name_encrypted FROM users WHERE id = ?',
    [req.user.sub]
  );
  const user3 = applyUserPII(userRaw3);

  const { rows, openingBalance, closingBalance } = await buildStatementData({
    userId: req.user.sub,
    startDate,
    endDate,
  });

  const pdf = await generateStatementPdf({
    name: user3?.full_name,
    startDate,
    endDate,
    openingBalance,
    closingBalance,
    transactions: rows,
  });

  const filename = `glyvtu-statement-${startDate}-to-${endDate}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(pdf);
});

router.post('/export', requireUser, validateRequest(transactionsExportSchema), async (req, res) => {
  const { type, status, search, dateFrom, dateTo, limit } = req.validated || req.body || {};
  const filters = ['user_id = ?'];
  const params = [req.user.sub];

  if (type) {
    filters.push('type = ?');
    params.push(type);
  }
  if (status) {
    filters.push('status = ?');
    params.push(status);
  }
  if (search) {
    filters.push('reference LIKE ?');
    params.push(`%${String(search).trim()}%`);
  }
  if (dateFrom) {
    filters.push('created_at >= CONCAT(?, " 00:00:00")');
    params.push(dateFrom);
  }
  if (dateTo) {
    filters.push('created_at <= CONCAT(?, " 23:59:59")');
    params.push(dateTo);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const capped = Math.min(Number(limit || 1000), 2000);

  const [rows] = await pool.query(
    `SELECT id, type, amount, fee, total, status, reference, created_at
     FROM transactions
     ${where}
     ORDER BY created_at DESC
     LIMIT ?`,
    [...params, capped]
  );

  const header = csvRow('id', 'type', 'amount', 'fee', 'total', 'status', 'reference', 'created_at');
  const lines = [header];
  for (const row of rows || []) {
    lines.push(
      csvRow(
        row.id,
        row.type,
        Number(row.amount || 0).toFixed(2),
        Number(row.fee || 0).toFixed(2),
        Number(row.total || 0).toFixed(2),
        row.status,
        row.reference,
        row.created_at ? new Date(row.created_at).toISOString() : ''
      )
    );
  }

  const filename = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(toCsv(lines));
});

export default router;
