import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import argon2 from 'argon2';

const ISSUER = process.env.TOTP_ISSUER || 'GLY-VTU';
const WINDOW = Number(process.env.TOTP_WINDOW || 2);

export function generateTotpSecret(label) {
  return speakeasy.generateSecret({
    length: 20,
    name: `${ISSUER}:${label}`,
    issuer: ISSUER,
  });
}

export async function generateTotpQr(otpauthUrl) {
  if (!otpauthUrl) return null;
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch {
    return null;
  }
}

export function verifyTotp({ token, secret }) {
  if (!token || !secret) return false;
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: String(token),
    window: WINDOW,
  });
}

export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () => crypto.randomBytes(5).toString('hex'));
}

export function hashBackupCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function isBcryptHash(value) {
  return typeof value === 'string' && value.startsWith('$2');
}

export async function hashBackupCodes(codes) {
  return Promise.all(codes.map((code) => argon2.hash(String(code), {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  })));
}

export async function verifyBackupCode(plainCode, hashedCodes) {
  if (!plainCode || !Array.isArray(hashedCodes)) return null;
  for (const hashed of hashedCodes) {
    if (isBcryptHash(hashed)) {
      try {
        if (await argon2.verify(hashed, String(plainCode))) return hashed;
      } catch {
        // ignore
      }
    } else if (hashBackupCode(plainCode) === hashed) {
      return hashed;
    }
  }
  return null;
}
