/** In-memory failed-login throttle (per server instance). */

type Entry = { fails: number; since: number };

const store = new Map<string, Entry>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 12;

export function getLoginClientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip')?.trim();
  if (real) return real;
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
  let e = store.get(ip);
  if (!e || now - e.since > WINDOW_MS) {
    e = { fails: 0, since: now };
  }
  e.fails++;
  store.set(ip, e);
}

export function clearLoginFailures(ip: string): void {
  store.delete(ip);
}
