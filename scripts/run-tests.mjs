import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

function collectTests(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collectTests(path, out);
    else if (entry.name.endsWith('.test.ts')) out.push(relative(process.cwd(), path));
  }
  return out;
}

const tests = collectTests(join(process.cwd(), 'src')).sort();
if (tests.length === 0) {
  console.error('No root test files found.');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...tests], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
