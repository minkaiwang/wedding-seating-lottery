/**
 * Pre-flight checks before first public GitHub push.
 * Run: npm run check:publish
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let errors = 0;
let warnings = 0;

function err(msg) {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
  errors++;
}
function warn(msg) {
  console.warn(`\x1b[33m!\x1b[0m ${msg}`);
  warnings++;
}
function ok(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === '.next' || name === 'dist') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

console.log('Checking repository before GitHub publish…\n');

// Secrets / local data
for (const rel of ['.env', 'prisma/dev.db', '.vercel']) {
  if (existsSync(join(root, rel))) warn(`Local-only path exists (must not git add): ${rel}`);
  else ok(`Not present: ${rel}`);
}

// Nested git in log-lottery blocks monorepo commit
if (existsSync(join(root, 'log-lottery', '.git'))) {
  err('log-lottery/.git exists — remove it so lottery sources are tracked in this repo (see docs/GITHUB-PUBLISH.md)');
}
else {
  ok('log-lottery is not a nested git repo');
}

// Required docs
for (const rel of ['LICENSE', 'ACKNOWLEDGMENTS.md', 'docs/PRIVACY-CHECKLIST.md', 'docs/GITHUB-PUBLISH.md']) {
  if (existsSync(join(root, rel))) ok(`Found ${rel}`);
  else err(`Missing ${rel}`);
}

// Lockfiles for CI
for (const rel of ['package-lock.json', 'log-lottery/package-lock.json']) {
  if (existsSync(join(root, rel))) ok(`Found ${rel}`);
  else warn(`Missing ${rel} — CI may fail`);
}

// Placeholder repository URL
try {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const url = pkg.repository?.url ?? '';
  if (url.includes('YOUR_GITHUB_USER')) {
    warn('package.json repository.url still has YOUR_GITHUB_USER — update after creating the GitHub repo');
  }
  else ok('package.json repository.url looks customized');
}
catch {
  warn('Could not read package.json');
}

// Personal name scan (sample patterns — extend if needed)
const banned = [/王珉锴/, /钱薇/];
const scanRoots = ['src', 'public', 'log-lottery/src', 'log-lottery/index.html', 'docs'];
let hits = 0;
for (const rel of scanRoots) {
  const p = join(root, rel);
  if (!existsSync(p)) continue;
  const files = statSync(p).isDirectory() ? walkFiles(p) : [p];
  for (const file of files) {
    if (!/\.(ts|tsx|js|vue|html|json|md|css|scss|mjs)$/.test(file)) continue;
    let text;
    try {
      text = readFileSync(file, 'utf8');
    }
    catch {
      continue;
    }
    for (const re of banned) {
      if (re.test(text)) {
        err(`Possible personal data in ${file.replace(root + '\\', '').replace(root + '/', '')}`);
        hits++;
      }
    }
  }
}
if (hits === 0) ok('No banned personal-name patterns in scanned sources');

// Remote warning
try {
  const { execSync } = await import('node:child_process');
  const remotes = execSync('git remote -v', { cwd: root, encoding: 'utf8' });
  if (remotes.includes('ajdincatic/wedding-seats') && remotes.includes('(push)')) {
    warn('git remote still points push to ajdincatic/wedding-seats — rename to upstream and add your own origin before push');
  }
  else {
    ok('git remote push target is not upstream wedding-seats (or no push remote)');
  }
}
catch {
  warn('Could not read git remotes');
}

console.log('');
if (errors > 0) {
  console.error(`Failed: ${errors} error(s), ${warnings} warning(s). Fix errors before pushing.`);
  process.exit(1);
}
console.log(`Ready with ${warnings} warning(s). See docs/GITHUB-PUBLISH.md for push steps.`);
