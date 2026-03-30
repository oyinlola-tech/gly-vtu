import { pool } from '../config/db.js';

const limits = {
  1: {
    daily: Number(process.env.KYC_L1_DAILY_LIMIT || 50000),
    monthly: Number(process.env.KYC_L1_MONTHLY_LIMIT || 200000),
  },
  2: {
    daily: Number(process.env.KYC_L2_DAILY_LIMIT || 500000),
    monthly: Number(process.env.KYC_L2_MONTHLY_LIMIT || 2000000),
  },
  3: {
    daily: Number(process.env.KYC_L3_DAILY_LIMIT || 5000000),
    monthly: Number(process.env.KYC_L3_MONTHLY_LIMIT || 20000000),
  },
};

export function getKycLimits(level) {
  return limits[Number(level)] || null;
}

function getOverride(level, period, type) {
  const key = `KYC_L${level}_${period.toUpperCase()}_LIMIT_${String(type).toUpperCase()}`;
  const raw = process.env[key];
  return raw ? Number(raw) : null;
}

export async function enforceKycLimits({ userId, level, amount, types }) {
  const cfg = getKycLimits(level);
  if (!cfg) return { ok: true };
  const typeList = Array.isArray(types) && types.length ? types : ['send', 'bill'];
  const overrideDaily = typeList.length === 1 ? getOverride(level, 'daily', typeList[0]) : null;
  const overrideMonthly = typeList.length === 1 ? getOverride(level, 'monthly', typeList[0]) : null;
  const [dailyRows] = await pool.query(
    `SELECT COALESCE(SUM(total), 0) AS total
     FROM transactions
     WHERE user_id = ?
       AND status IN ('pending','success')
       AND type IN (?)
       AND created_at >= CURDATE()`,
    [userId, typeList]
  );
  const [monthlyRows] = await pool.query(
    `SELECT COALESCE(SUM(total), 0) AS total
     FROM transactions
     WHERE user_id = ?
       AND status IN ('pending','success')
       AND type IN (?)
       AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
    [userId, typeList]
  );
  const dailyTotal = Number(dailyRows[0]?.total || 0) + Number(amount || 0);
  const monthlyTotal = Number(monthlyRows[0]?.total || 0) + Number(amount || 0);
  const dailyLimit = overrideDaily ?? cfg.daily;
  const monthlyLimit = overrideMonthly ?? cfg.monthly;
  if (dailyLimit && dailyTotal > dailyLimit) {
    return { ok: false, message: 'Daily KYC limit exceeded' };
  }
  if (monthlyLimit && monthlyTotal > monthlyLimit) {
    return { ok: false, message: 'Monthly KYC limit exceeded' };
  }
  return { ok: true };
}
