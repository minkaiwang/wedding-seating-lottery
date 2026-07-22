/** In-memory failed-login throttle (per server instance). */

type Entry = { fails: number; since: number };

const store = new Map<string, Entry>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 12;
const MAX_ENTRIES = 10_000;
let writesSinceCleanup = 0;

function normalizeClientKey(value: string): string {
  const normalized = value.trim();
  if (!normalized) return 'unknown';
  return normalized.length <= 128 ? normalized : normalized.slice(0, 128);
}

function pruneStore(now: number): void {
  for (const [key, entry] of store) {
    if (now - entry.since > WINDOW_MS) store.delete(key);
  }
  while (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value as string | undefined;
    if (oldestKey === undefined) break;
    store.delete(oldestKey);
  }
}

export function getLoginClientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return normalizeClientKey(first);
  }
  const real = req.headers.get('x-real-ip')?.trim();
  if (real) return normalizeClientKey(real);
  return 'unknown';
}

export function checkLoginAllowed(ip: string): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const e = store.get(ip);
  if (!e) return { allowed: true };
  const now = Date.now();
  if (now - e.since > WINDOW_MS) {
    store.delete(ip);
    return { allowed: true };
  }
  if (e.fails >= MAX_FAILS) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - e.since)) / 1000);
    return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  return { allowed: true };
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  writesSinceCleanup++;
  if (writesSinceCleanup >= 100 || store.size >= MAX_ENTRIES) {
    pruneStore(now);
    writesSinceCleanup = 0;
  }
  const key = normalizeClientKey(ip);
  let e = store.get(key);
  if (!e || now - e.since > WINDOW_MS) {
    e = { fails: 0, since: now };
  }
  e.fails++;
  store.delete(key);
  store.set(key, e);
}

export function clearLoginFailures(ip: string): void {
  store.delete(ip);
}
