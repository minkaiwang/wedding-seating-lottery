/**
 * Pre-flight checks before a public GitHub push.
 * Run: npm run check:publish
 *
 * Optional: set PUBLISH_BLOCKED_TERMS to a comma-separated list of project-
 * specific names or identifiers that must never be published. Keep the values
 * in your shell or CI secret store rather than committing them here.
 */
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const textExtensions = new Set([
  '.css', '.cts', '.cjs', '.html', '.json', '.js', '.md', '.mjs', '.mts',
  '.scss', '.svg', '.toml', '.ts', '.tsx', '.txt', '.vue', '.yaml', '.yml',
]);
const skippedDirectories = new Set(['.git', '.next', 'dist', 'node_modules', 'target']);
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
function relPath(path) {
  return relative(root, path).split(sep).join('/');
}

function trackedFiles() {
  try {
    return execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean);
  }
  catch {
    err('Could not read Git tracked files; run this command inside a Git repository.');
    return [];
  }
}

function isTextSource(file) {
  const base = file.split('/').at(-1) ?? '';
  if (base === 'package-lock.json' || base === 'pnpm-lock.yaml') return false;
  if (base === '.env.example' || base.endsWith('.env.example')) return true;
  if (['LICENSE', 'NOTICE', 'README', '.gitignore', '.npmrc'].includes(base)) return true;
  const extension = base.includes('.') ? `.${base.split('.').at(-1)}`.toLowerCase() : '';
  return textExtensions.has(extension);
}

function findNestedGitDirs(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || skippedDirectories.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    const gitPath = join(fullPath, '.git');
    if (existsSync(gitPath)) found.push(fullPath);
    findNestedGitDirs(fullPath, found);
  }
  return found;
}

console.log('Checking repository before GitHub publish…\n');

const tracked = trackedFiles();

// Secrets / local data
for (const rel of ['.env', 'prisma/dev.db', '.vercel']) {
  if (existsSync(join(root, rel))) warn(`Local-only path exists (must not git add): ${rel}`);
  else ok(`Not present: ${rel}`);
}

for (const rel of tracked) {
  const base = rel.split('/').at(-1) ?? '';
  const isSensitiveEnv = base === '.env' || (base.startsWith('.env.') && !base.endsWith('.example'));
  const isSensitiveKey = /\.(?:key|pem|p12|pfx)$/iu.test(base);
  if (isSensitiveEnv || isSensitiveKey || rel === 'prisma/dev.db') {
    err(`Sensitive local path is tracked: ${rel}`);
  }
}

// A vendored app must not remain a nested repository. Other nested repositories
// are also surfaced because `git add .` can otherwise create surprising gitlinks.
const nestedGitDirs = findNestedGitDirs(root);
if (nestedGitDirs.length === 0) {
  ok('No nested Git repositories found');
}
else {
  for (const dir of nestedGitDirs) {
    const rel = relPath(dir);
    if (rel === 'log-lottery') {
      err('log-lottery/.git exists — the vendored lottery sources would be recorded as a gitlink, not normal files');
    }
    else {
      warn(`Nested Git repository found: ${rel} (review before using git add .)`);
    }
  }
}

// Required docs
for (const rel of ['LICENSE', 'ACKNOWLEDGMENTS.md', 'THIRD_PARTY_NOTICES.md', 'docs/PRIVACY-CHECKLIST.md', 'docs/GITHUB-PUBLISH.md']) {
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
    warn('package.json repository.url still has YOUR_GITHUB_USER — update it before publishing');
  }
  else ok('package.json repository.url looks customized');
}
catch {
  warn('Could not read package.json');
}

// Scan every tracked, human-readable project source/document/config file. This
// deliberately excludes dependency/build directories because they are untracked.
const configuredTerms = (process.env.PUBLISH_BLOCKED_TERMS ?? '')
  .split(',')
  .map((term) => term.trim())
  .filter(Boolean);
const blockedPatterns = [
  ...configuredTerms.map((term) => ({ label: 'configured blocked term', re: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u') })),
  { label: 'possible mainland China mobile number', re: /(?<!\d)1[3-9]\d{9}(?!\d)/u },
  { label: 'private key', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u },
  { label: 'GitHub token', re: /(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/u },
  { label: 'AWS access key', re: /AKIA[0-9A-Z]{16}/u },
  { label: 'OpenAI API key', re: /(?:sk-[A-Za-z0-9]{32,}|sk-(?:proj|svcacct)-[A-Za-z0-9_-]{20,})/u },
];
const longHexTokenPattern = /(?<![A-Fa-f0-9])[A-Fa-f0-9]{32,}(?![A-Fa-f0-9])/gu;
let hits = 0;
for (const rel of tracked.filter(isTextSource)) {
  const file = join(root, rel);
  if (!existsSync(file) || !lstatSync(file).isFile()) continue;
  let content;
  try {
    content = readFileSync(file, 'utf8');
  }
  catch {
    continue;
  }
  for (const { label, re } of blockedPatterns) {
    // Cryptographic hashes can contain 11 consecutive decimal digits by chance.
    // Mask only long hexadecimal tokens for the phone-number check; secrets and
    // configured project terms must still be scanned against the original text.
    const scanContent = label === 'possible mainland China mobile number'
      ? content.replace(longHexTokenPattern, '')
      : content;
    if (re.test(scanContent)) {
      err(`Possible personal data (${label}) in ${rel}`);
      hits++;
    }
  }
}
if (hits === 0) {
  ok(`No configured or basic personal-data patterns in ${tracked.filter(isTextSource).length} tracked text files`);
}
if (configuredTerms.length === 0) {
  warn('PUBLISH_BLOCKED_TERMS is unset; add private names/identifiers in your shell or CI secret store for a project-specific scan');
}

// Remote safety: a publishable checkout needs an origin push URL that is not the
// upstream wedding-seats repository. Do not warn merely because upstream exists.
try {
  const originPush = execFileSync('git', ['remote', 'get-url', '--push', 'origin'], { cwd: root, encoding: 'utf8' }).trim();
  const upstreamPush = execFileSync('git', ['remote', 'get-url', '--push', 'upstream'], { cwd: root, encoding: 'utf8' }).trim();
  if (!originPush) {
    err('origin has no push URL');
  }
  else if (originPush === upstreamPush || /(?:^|[/:])ajdincatic\/wedding-seats(?:\.git)?$/u.test(originPush)) {
    err(`origin push target is the upstream wedding-seats repository: ${originPush}`);
  }
  else {
    ok(`origin push target is distinct from upstream: ${originPush}`);
  }
}
catch {
  warn('Could not read both origin and upstream push URLs; verify remotes before publishing');
}

console.log('');
if (errors > 0) {
  console.error(`Failed: ${errors} error(s), ${warnings} warning(s). Fix errors before pushing.`);
  process.exit(1);
}
console.log(`Ready with ${warnings} warning(s). See docs/GITHUB-PUBLISH.md for push steps.`);
