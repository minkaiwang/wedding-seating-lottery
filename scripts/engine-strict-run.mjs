/**
 * Run npm with engine-strict (matches CI `npm_config_engine_strict`).
 * Usage: npm run verify:ci | verify:lottery:ci | verify:stack:ci
 *   or: node scripts/engine-strict-run.mjs run verify [--prefix ./log-lottery]
 */
import { spawnSync } from 'node:child_process';

process.env.npm_config_engine_strict = 'true';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/engine-strict-run.mjs <npm-args…>');
  process.exit(2);
}

const r = spawnSync('npm', args, {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

process.exit(r.status ?? 1);
