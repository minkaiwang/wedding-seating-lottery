import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'wedding_session';
const DEV_FALLBACK = 'development-only-replace-with-long-secret-min-32-chars!!';
const JWT_MIN_LEN = 32;

function cookieSecure(): boolean {
  if (process.env.COOKIE_INSECURE === '1') return false;
  if (process.env.COOKIE_SECURE === '1') return true;
  return process.env.NODE_ENV === 'production';
}

/** Production requires a real secret; dev may use fallback (logged once). */
export function isJwtSecretConfigured(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const s = process.env.JWT_SECRET?.trim();
  return Boolean(s && s.length >= JWT_MIN_LEN);
}

function getSecretKeyBytes(): Uint8Array {
  const trimmed = process.env.JWT_SECRET?.trim();
  if (process.env.NODE_ENV === 'production') {
    if (!trimmed || trimmed.length < JWT_MIN_LEN) {
      throw new Error(
        `JWT_SECRET must be set to at least ${JWT_MIN_LEN} characters in production`,
      );
    }
    return new TextEncoder().encode(trimmed);
  }
  const raw = trimmed || DEV_FALLBACK;
  if (!trimmed) {
    const g = globalThis as { __weddingJwtWarned?: boolean };
    if (!g.__weddingJwtWarned) {
      g.__weddingJwtWarned = true;
      console.warn('[wedding auth] JWT_SECRET not set; using insecure dev fallback');
    }
  }
  return new TextEncoder().encode(raw);
}

export function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/' as const,
    maxAge: maxAgeSec,
    secure: cookieSecure(),
  };
}

export { COOKIE_NAME };

export async function signSessionToken(username: string): Promise<string> {
  const key = getSecretKeyBytes();
  return new SignJWT({ sub: username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function verifySessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  let key: Uint8Array;
  try {
    key = getSecretKeyBytes();
  } catch {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    const sub = payload.sub;
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}
