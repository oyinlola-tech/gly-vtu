import 'dotenv/config';

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  const val = args[idx + 1];
  if (!val || val.startsWith('--')) return '';
  return val;
};

const provider = (getArg('--provider') || process.env.KYC_PROVIDER || 'identitypass').toLowerCase();
const type = (getArg('--type') || 'nin').toLowerCase();
const id = getArg('--id') || '';
const payloadOverride = getArg('--payload');

const isIdentityPass = ['identitypass', 'prembly', 'premby', 'prembly_identitypass'].includes(provider);

const baseUrl = (getArg('--base-url') || process.env.KYC_PROVIDER_BASE_URL || '').replace(/\/$/, '');
const bvnPath =
  getArg('--bvn-path') ||
  process.env.KYC_PROVIDER_BVN_PATH ||
  (provider === 'prembly'
    ? '/verification/bvn_validation'
    : '/api/v2/biometrics/merchant/data/verification/bvn');
const ninPath =
  getArg('--nin-path') ||
  process.env.KYC_PROVIDER_NIN_PATH ||
  (provider === 'prembly'
    ? '/verification/vnin-basic'
    : '/api/v1/biometrics/merchant/data/verification/nin_wo_face');

if (!baseUrl) {
  console.error('Missing KYC_PROVIDER_BASE_URL (pass --base-url or set in .env).');
  process.exit(1);
}

const apiKey = getArg('--api-key') || process.env.KYC_PROVIDER_TOKEN || '';
const appId = getArg('--app-id') || process.env.KYC_PROVIDER_APP_ID || '';
const apiKeyHeader = getArg('--api-key-header') || process.env.KYC_PROVIDER_API_KEY_HEADER || 'x-api-key';
const appIdHeader = getArg('--app-id-header') || process.env.KYC_PROVIDER_APP_ID_HEADER || 'app-id';

const makePayload = () => {
  if (payloadOverride) {
    try {
      return JSON.parse(payloadOverride);
    } catch (err) {
      console.error('Invalid --payload JSON:', err?.message || err);
      process.exit(1);
    }
  }

  if (!id) {
    if (provider === 'identitypass' && type === 'nin') {
      return { number: '12345678909' };
    }
    console.error('Missing --id (or provide --payload).');
    process.exit(1);
  }

  return { number: id };
};

const path = type === 'bvn' ? bvnPath : ninPath;
const url = `${baseUrl}${path}`;

const headers = { 'Content-Type': 'application/json' };
if (isIdentityPass) {
  if (apiKey) headers[apiKeyHeader] = apiKey;
  if (appId) headers[appIdHeader] = appId;
} else if (apiKey) {
  headers.Authorization = `Bearer ${apiKey}`;
}

const timeoutMs = Number(getArg('--timeout-ms') || process.env.KYC_PROVIDER_TIMEOUT_MS || 10000);
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

const payload = makePayload();

const run = async () => {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // ignore parse errors
    }

    const durationMs = Date.now() - start;
    console.log('KYC Health Check');
    console.log(`Provider: ${provider}`);
    console.log(`Type: ${type}`);
    console.log(`URL: ${url}`);
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Duration: ${durationMs}ms`);
    console.log('Response:');
    if (json) {
      console.log(JSON.stringify(json, null, 2));
    } else {
      console.log(text.slice(0, 2000));
    }

    if (!res.ok) process.exit(1);
  } catch (err) {
    const durationMs = Date.now() - start;
    console.error(`Request failed after ${durationMs}ms:`, err?.message || err);
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }
};

run();
