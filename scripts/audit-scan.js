import fs from 'fs';
import path from 'path';
import readline from 'readline';

const DEFAULT_EXCLUDES = new Set(['.git', 'node_modules', 'dist', 'coverage']);
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5MB per file

const SENSITIVE_PATTERNS = [
  { id: 'private-key', name: 'Private Key Block', severity: 'critical', regex: /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/g },
  { id: 'jwt-token', name: 'JWT Token', severity: 'medium', regex: /eyJ[0-9A-Za-z_-]+\.[0-9A-Za-z_-]+\.[0-9A-Za-z_-]+/g },
  { id: 'basic-auth-url', name: 'Basic Auth URL', severity: 'medium', regex: /https?:\/\/[^/\s:]+:[^@\s]+@/g },
  { id: 'flutterwave-secret', name: 'Flutterwave Secret', severity: 'high', regex: /FLWSECK-[0-9a-zA-Z_-]+/g },
  { id: 'vtpass-key', name: 'VTpass Key', severity: 'high', regex: /VTPASS_[0-9A-Z_]*KEY\s*=\s*['"][^'"]+['"]/gi },
  { id: 'smtp-credential', name: 'SMTP Credential', severity: 'high', regex: /(SMTP_(PASS|PASSWORD|USER))\s*=\s*['"][^'"]+['"]/gi },
];

const ASSIGNMENT_PATTERNS = [
  { id: 'hardcoded-secret', name: 'Hardcoded Secret', severity: 'high', regex: /(secret|token|password|api[_-]?key|private[_-]?key)\s*[:=]\s*['"][^'"]{6,}['"]/gi },
  { id: 'hardcoded-jwt-secret', name: 'Hardcoded JWT Secret', severity: 'high', regex: /JWT_(ADMIN_)?SECRET\s*[:=]\s*['"][^'"]+['"]/gi },
  { id: 'hardcoded-db-password', name: 'Hardcoded DB Password', severity: 'high', regex: /(DB_PASSWORD|DATABASE_PASSWORD)\s*[:=]\s*['"][^'"]+['"]/gi },
  { id: 'hardcoded-flw-secret', name: 'Hardcoded Flutterwave Secret', severity: 'high', regex: /FLW_(SECRET|WEBHOOK)_KEY\s*[:=]\s*['"][^'"]+['"]/gi },
  { id: 'hardcoded-vtpass-secret', name: 'Hardcoded VTpass Secret', severity: 'high', regex: /VTPASS_(API|PUBLIC|SECRET)_KEY\s*[:=]\s*['"][^'"]+['"]/gi },
];

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico',
  '.pdf', '.zip', '.gz', '.tar', '.tgz', '.mp4', '.mov', '.mp3', '.woff', '.woff2',
]);

function isBinaryBuffer(buf) {
  for (let i = 0; i < buf.length; i += 1) {
    if (buf[i] === 0) return true;
  }
  return false;
}

function isBinaryPath(file) {
  return BINARY_EXTENSIONS.has(path.extname(file).toLowerCase());
}

async function walk(dir, excludes) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (excludes.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full, excludes)));
    } else {
      files.push(full);
    }
  }
  return files;
}

function addFinding(findings, file, lineNumber, match, reason, severity, ruleId, line) {
  findings.push({
    file: path.relative(process.cwd(), file),
    line: lineNumber,
    match,
    reason,
    severity,
    ruleId,
    snippet: line ? line.trim().slice(0, 180) : '',
  });
}

function parseFlags(argv = []) {
  const args = new Set(argv);
  return {
    includeNodeModules: args.has('--include-node-modules'),
    excludeNodeModules: args.has('--exclude-node-modules'),
    includeDist: args.has('--include-dist'),
    excludeDist: args.has('--exclude-dist'),
  };
}

export function parseAuditFlags(argv = process.argv.slice(2)) {
  return parseFlags(argv);
}

export async function runAuditScan(options = {}) {
  const {
    includeNodeModules = false,
    excludeNodeModules = false,
    includeDist = false,
    excludeDist = false,
    maxBytes = DEFAULT_MAX_BYTES,
  } = options;

  const excludes = new Set(DEFAULT_EXCLUDES);
  if (includeNodeModules) excludes.delete('node_modules');
  if (includeDist) excludes.delete('dist');
  if (excludeNodeModules) excludes.add('node_modules');
  if (excludeDist) excludes.add('dist');

  const files = await walk(process.cwd(), excludes);
  const findings = [];
  const scanned = [];
  const skipped = [];

  for (const file of files) {
    try {
      const stat = await fs.promises.stat(file);
      if (!stat.isFile()) continue;
      if (stat.size > maxBytes) {
        skipped.push({ file: path.relative(process.cwd(), file), reason: 'too_large' });
        continue;
      }
      if (isBinaryPath(file)) {
        skipped.push({ file: path.relative(process.cwd(), file), reason: 'binary_ext' });
        continue;
      }

      const fd = await fs.promises.open(file, 'r');
      const head = Buffer.alloc(Math.min(stat.size, 512));
      await fd.read(head, 0, head.length, 0);
      await fd.close();

      if (isBinaryBuffer(head)) {
        skipped.push({ file: path.relative(process.cwd(), file), reason: 'binary' });
        continue;
      }

      const rl = readline.createInterface({
        input: fs.createReadStream(file, { encoding: 'utf8' }),
        crlfDelay: Infinity,
      });

      let lineNumber = 0;
      for await (const line of rl) {
        lineNumber += 1;
        for (const pattern of SENSITIVE_PATTERNS) {
          const matches = line.match(pattern.regex);
          if (matches) {
            for (const match of matches) {
              addFinding(findings, file, lineNumber, match, pattern.name, pattern.severity, pattern.id, line);
            }
          }
        }
        for (const pattern of ASSIGNMENT_PATTERNS) {
          const matches = line.match(pattern.regex);
          if (matches) {
            for (const match of matches) {
              addFinding(findings, file, lineNumber, match, pattern.name, pattern.severity, pattern.id, line);
            }
          }
        }
      }
      scanned.push(path.relative(process.cwd(), file));
    } catch (err) {
      skipped.push({ file: path.relative(process.cwd(), file), reason: err?.message || 'read_error' });
    }
  }

  return {
    scannedCount: scanned.length,
    skippedCount: skipped.length,
    findings,
    skipped,
  };
}
