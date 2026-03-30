import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

const MAX_ATTEMPTS = Number(process.env.PIN_MAX_ATTEMPTS || 5);
const LOCK_MINUTES = Number(process.env.PIN_LOCK_MINUTES || 15);

export function isValidPin(pin) {
  return typeof pin === 'string' && /^\d{8,}$/.test(pin);
}

export function validatePinComplexity(pin) {
  if (!isValidPin(pin)) {
    return 'PIN must be at least 8 digits';
  }
  
  // Check for all same digits (111111111)
  if (/^(\d)\1+$/.test(pin)) {
    return 'PIN cannot be all the same digit (e.g., 11111111)';
  }
  
  // Check for 4+ consecutive identical digits
  if (/(\d)\1{3,}/.test(pin)) {
    return 'PIN cannot contain 4+ consecutive identical digits';
  }
  
  // Check for sequential patterns (123456... or 987654...)
  let sequential = true;
  for (let i = 0; i < pin.length - 1; i++) {
    const curr = Number(pin[i]);
    const next = Number(pin[i + 1]);
    if (curr + 1 !== next && curr - 1 !== next) {
      sequential = false;
      break;
    }
  }
  if (sequential && pin.length >= 4) {
    return 'PIN cannot be sequential (e.g., 12345678)';
  }
  
  // Check for keyboard patterns (111222 or 789456)
  if (/^(01{2}2{2}|12{2}3{2}|23{2}4{2}|34{2}5{2}|45{2}6{2}|56{2}7{2}|67{2}8{2}|78{2}9{2})/.test(pin)) {
    return 'PIN cannot use predictable keyboard patterns';
  }
  
  // Check for repeating double digits (1212121212)
  if (/^(\d{2})\1+$/.test(pin)) {
    return 'PIN cannot use repeating double digit patterns';
  }
  
  return null;
}

export async function getPinStatus(userId) {
  const [[row]] = await pool.query(
    'SELECT transaction_pin_hash, pin_failed_attempts, pin_locked_until, biometric_enabled FROM users WHERE id = ?',
    [userId]
  );
  if (!row) return null;
  return {
    hasPin: Boolean(row.transaction_pin_hash),
    failedAttempts: Number(row.pin_failed_attempts || 0),
    lockedUntil: row.pin_locked_until,
    biometricEnabled: Boolean(row.biometric_enabled),
  };
}

export async function setTransactionPin(userId, pin) {
  const complexityError = validatePinComplexity(pin);
  if (complexityError) {
    const err = new Error(complexityError);
    err.code = 'PIN_WEAK';
    throw err;
  }
  const pinHash = await bcrypt.hash(pin, 12);
  await pool.query(
    `UPDATE users
     SET transaction_pin_hash = ?, pin_failed_attempts = 0, pin_locked_until = NULL, pin_updated_at = NOW()
     WHERE id = ?`,
    [pinHash, userId]
  );
}

export async function verifyTransactionPin(userId, pin) {
  const [[row]] = await pool.query(
    'SELECT transaction_pin_hash, pin_failed_attempts, pin_locked_until FROM users WHERE id = ?',
    [userId]
  );
  if (!row?.transaction_pin_hash) {
    const err = new Error('Transaction PIN not set');
    err.code = 'PIN_NOT_SET';
    throw err;
  }
  if (row.pin_locked_until && new Date(row.pin_locked_until).getTime() > Date.now()) {
    const err = new Error('Transaction PIN locked. Try later.');
    err.code = 'PIN_LOCKED';
    err.lockedUntil = row.pin_locked_until;
    throw err;
  }
  const ok = await bcrypt.compare(pin, row.transaction_pin_hash);
  if (!ok) {
    const attempts = Number(row.pin_failed_attempts || 0) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await pool.query(
        'UPDATE users SET pin_failed_attempts = ?, pin_locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
        [attempts, LOCK_MINUTES, userId]
      );
      const err = new Error('Transaction PIN locked due to repeated failures.');
      err.code = 'PIN_LOCKED';
      throw err;
    }
    await pool.query('UPDATE users SET pin_failed_attempts = ? WHERE id = ?', [attempts, userId]);
    const err = new Error('Invalid transaction PIN');
    err.code = 'PIN_INVALID';
    throw err;
  }
  await pool.query('UPDATE users SET pin_failed_attempts = 0, pin_locked_until = NULL WHERE id = ?', [
    userId,
  ]);
  return true;
}
