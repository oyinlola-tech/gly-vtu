import { execSync } from 'child_process';

try {
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
  console.log('Git hooks configured (core.hooksPath=.githooks).');
} catch (err) {
  console.warn('Skipped git hooks setup:', err?.message);
}
