import crypto from 'crypto';
import { pool } from '../config/db.js';
import { encryptJson, encryptPII, applyUserPII } from './encryption.js';
import { verifyIdentity, namesMatchLoose, kycProviderEnabled } from './kycProvider.js';
import { logSecurityEvent } from './securityEvents.js';
import { logAudit } from './audit.js';
import { updateCustomer, createVirtualAccountForCustomer, flutterwaveEnabled } from './flutterwave.js';
import { sanitizeFlutterwaveAccount } from './sanitize.js';
import { sendReservedAccountEmail } from './email.js';
import { logger } from './logger.js';

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

async function upsertVerificationRecord({
  id,
  userId,
  provider,
  type,
  status,
  nameMatch,
  verifiedName,
  verifiedDob,
  verifiedPhone,
  verifiedGender,
  reference,
  requestPayload,
  responsePayload,
}) {
  const params = [
    id,
    userId,
    provider,
    type,
    status,
    nameMatch ? 1 : 0,
    verifiedName,
    verifiedDob,
    verifiedPhone,
    verifiedGender,
    reference,
    requestPayload ? JSON.stringify(requestPayload) : null,
    responsePayload ? JSON.stringify(responsePayload) : null,
  ];
  await pool.query(
    `INSERT INTO kyc_verifications
     (id, user_id, provider, verification_type, status, name_match, verified_name, verified_dob, verified_phone, verified_gender, reference, request_payload, response_payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       name_match = VALUES(name_match),
       verified_name = VALUES(verified_name),
       verified_dob = VALUES(verified_dob),
       verified_phone = VALUES(verified_phone),
       verified_gender = VALUES(verified_gender),
       reference = VALUES(reference),
       response_payload = VALUES(response_payload)`,
    params
  );
}

async function maybeCorrectName({ userId, currentName, verifiedName }) {
  if (!verifiedName) return { updated: false, finalName: currentName };
  if (!currentName) {
    await pool.query('UPDATE users SET full_name = ?, full_name_encrypted = ? WHERE id = ?', [
      null,
      encryptPII(verifiedName, userId),
      userId,
    ]);
    return { updated: true, finalName: verifiedName };
  }
  if (namesMatchLoose(currentName, verifiedName)) {
    await pool.query('UPDATE users SET full_name = ?, full_name_encrypted = ? WHERE id = ?', [
      null,
      encryptPII(verifiedName, userId),
      userId,
    ]);
    return { updated: true, finalName: verifiedName };
  }
  return { updated: false, finalName: currentName };
}

async function ensureReservedAccount({ user, customerId }) {
  const [existing] = await pool.query(
    'SELECT id FROM reserved_accounts WHERE user_id = ? LIMIT 1',
    [user.id]
  );
  if (existing.length) return;

  const accountReference = `GLY-${user.id}`;
  const nameParts = splitName(user.full_name || '');
  const reserved = await createVirtualAccountForCustomer({
    email: user.email,
    tx_ref: accountReference,
    firstName: nameParts.firstName || user.full_name,
    lastName: nameParts.lastName || user.full_name,
    customerId: customerId || undefined,
  });
  const account = reserved?.data || reserved?.response || {};
  await pool.query(
    `INSERT INTO reserved_accounts
     (id, user_id, provider, account_reference, reservation_reference, account_name, account_number, bank_name, bank_code, status, raw_response)
     VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE account_number = VALUES(account_number), bank_name = VALUES(bank_name), raw_response = VALUES(raw_response)`,
    [
      user.id,
      'flutterwave',
      accountReference,
      account.order_ref || account.reference || null,
      account.account_name || user.full_name,
      account.account_number || '',
      account.bank_name || '',
      account.bank_code || null,
      account.status || 'ACTIVE',
      JSON.stringify(sanitizeFlutterwaveAccount(account)),
    ]
  );
  if (user?.email) {
    sendReservedAccountEmail({
      to: user.email,
      name: user.full_name,
      accountNumber: account.account_number,
      bankName: account.bank_name,
    }).catch(() => null);
  }
}

async function notifyPostVerify({ userId, payload, verification }) {
  const url = process.env.KYC_POST_VERIFY_WEBHOOK_URL;
  if (!url) return;
  const token = process.env.KYC_POST_VERIFY_WEBHOOK_TOKEN || '';
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        userId,
        status: 'verified',
        provider: verification.provider,
        verificationType: payload?.bvn ? 'bvn' : payload?.nin ? 'nin' : null,
        verifiedName: verification.fullName || null,
        verifiedDob: verification.dob || null,
        bvn: payload?.bvn || null,
        nin: payload?.nin || null,
      }),
    });
  } catch (err) {
    logger.warn('Post-verify webhook failed', { error: logger.format(err) });
  }
}

export async function runKycVerification({
  userId,
  payload,
  level,
  ip,
  userAgent,
}) {
  if (!kycProviderEnabled()) {
    return { status: 'skipped', reason: 'provider_disabled' };
  }

  const [[userRaw]] = await pool.query(
    `SELECT id, full_name, email, phone, full_name_encrypted, email_encrypted, phone_encrypted,
            kyc_payload, kyc_payload_encrypted
     FROM users WHERE id = ?`,
    [userId]
  );
  const user = applyUserPII(userRaw);
  if (!user) {
    return { status: 'skipped', reason: 'user_not_found' };
  }

  const type = payload?.bvn ? 'bvn' : payload?.nin ? 'nin' : null;
  if (!type) {
    return { status: 'skipped', reason: 'missing_identifier' };
  }

  const verificationId = crypto.randomUUID();
  const requestPayload = {
    bvn: payload?.bvn || null,
    nin: payload?.nin || null,
    fullName: user.full_name || payload?.fullName || null,
    firstName: user.full_name ? splitName(user.full_name).firstName : payload?.firstName || null,
    lastName: user.full_name ? splitName(user.full_name).lastName : payload?.lastName || null,
    dob: payload?.dob || payload?.dateOfBirth || null,
    phone: payload?.phone || user.phone || null,
    gender: payload?.gender || null,
  };

  await upsertVerificationRecord({
    id: verificationId,
    userId,
    provider: process.env.KYC_PROVIDER || 'mock',
    type,
    status: 'pending',
    nameMatch: false,
    verifiedName: null,
    verifiedDob: null,
    verifiedPhone: null,
    verifiedGender: null,
    reference: null,
    requestPayload,
    responsePayload: null,
  });

  let verification;
  try {
    verification = await verifyIdentity({
      type,
      payload: requestPayload,
    });
  } catch (err) {
    await upsertVerificationRecord({
      id: verificationId,
      userId,
      provider: process.env.KYC_PROVIDER || 'mock',
      type,
      status: 'failed',
      nameMatch: false,
      verifiedName: null,
      verifiedDob: null,
      verifiedPhone: null,
      verifiedGender: null,
      reference: null,
      requestPayload,
      responsePayload: { error: err.message },
    });
    logSecurityEvent({
      type: 'kyc.verification.failed',
      severity: 'medium',
      actorType: 'user',
      actorId: userId,
      ip,
      userAgent,
      metadata: { provider: process.env.KYC_PROVIDER || 'mock', reason: err.message },
    }).catch(() => null);
    return { status: 'failed', reason: 'provider_error' };
  }

  const verifiedDob = normalizeDate(verification?.dob);
  const inputDob = normalizeDate(payload?.dob || payload?.dateOfBirth);
  const dobMatch = !verifiedDob || !inputDob || verifiedDob === inputDob;

  let nameMatch = false;
  if (verification?.fullName && user?.full_name) {
    nameMatch = namesMatchLoose(user.full_name, verification.fullName);
  }

  await upsertVerificationRecord({
    id: verificationId,
    userId,
    provider: verification.provider,
    type,
    status: verification.verified ? 'verified' : 'failed',
    nameMatch,
    verifiedName: verification.fullName || null,
    verifiedDob: verifiedDob || null,
    verifiedPhone: verification.phone || null,
    verifiedGender: verification.gender || null,
    reference: verification.reference || null,
    requestPayload,
    responsePayload: verification.raw || null,
  });

  if (!verification.verified) {
    await pool.query('UPDATE users SET kyc_status = ? WHERE id = ?', ['rejected', userId]);
    logSecurityEvent({
      type: 'kyc.verification.rejected',
      severity: 'low',
      actorType: 'user',
      actorId: userId,
      ip,
      userAgent,
      metadata: { provider: verification.provider, type },
    }).catch(() => null);
    return { status: 'failed', reason: 'not_verified' };
  }

  if (!dobMatch) {
    await pool.query('UPDATE users SET kyc_status = ? WHERE id = ?', ['rejected', userId]);
    logSecurityEvent({
      type: 'kyc.verification.dob_mismatch',
      severity: 'medium',
      actorType: 'user',
      actorId: userId,
      ip,
      userAgent,
      metadata: { provider: verification.provider },
    }).catch(() => null);
    return { status: 'failed', reason: 'dob_mismatch' };
  }

  if (verification?.fullName && user?.full_name && !nameMatch) {
    await pool.query('UPDATE users SET kyc_status = ? WHERE id = ?', ['rejected', userId]);
    logSecurityEvent({
      type: 'kyc.verification.name_mismatch',
      severity: 'medium',
      actorType: 'user',
      actorId: userId,
      ip,
      userAgent,
      metadata: { provider: verification.provider },
    }).catch(() => null);
    return { status: 'failed', reason: 'name_mismatch' };
  }

  const nameUpdate = await maybeCorrectName({
    userId,
    currentName: user.full_name,
    verifiedName: verification.fullName,
  });

  const payloadUpdate = {
    ...(payload || {}),
    kyc_verified_at: new Date().toISOString(),
    bvn_verified: type === 'bvn' ? true : payload?.bvn_verified || false,
    nin_verified: type === 'nin' ? true : payload?.nin_verified || false,
    verified_name: verification.fullName || null,
    verified_dob: verifiedDob || null,
    verified_phone: verification.phone || null,
    verified_gender: verification.gender || null,
  };

  await pool.query(
    'UPDATE users SET kyc_status = ?, kyc_level = ?, kyc_payload_encrypted = ? WHERE id = ?',
    [
      'verified',
      level || 2,
      encryptJson(payloadUpdate, userId),
      userId,
    ]
  );

  const customerId = payload?.flutterwave_customer_id || null;
  if (customerId && flutterwaveEnabled()) {
    updateCustomer(customerId, {
      bvn: payload?.bvn || undefined,
      nin: payload?.nin || undefined,
      dob: payload?.dob || payload?.dateOfBirth || undefined,
    }).catch((err) => {
      logger.warn('Flutterwave customer update failed', { error: logger.format(err) });
    });
  }

  if (flutterwaveEnabled()) {
    ensureReservedAccount({ user: { ...user, full_name: nameUpdate.finalName }, customerId }).catch((err) => {
      logger.warn('Reserved account creation failed after KYC', { error: logger.format(err) });
    });
  }

  notifyPostVerify({ userId, payload, verification }).catch(() => null);

  logAudit({
    actorType: 'system',
    actorId: userId,
    action: 'kyc.verified',
    entityType: 'user',
    entityId: userId,
    ip,
    userAgent,
    metadata: { provider: verification.provider, type },
  }).catch(() => null);

  return { status: 'verified', nameUpdated: nameUpdate.updated };
}
