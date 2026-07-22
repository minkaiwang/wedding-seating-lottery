import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import {
  COOKIE_NAME,
  isJwtSecretConfigured,
  sessionCookieOptions,
  signSessionToken,
} from '@/lib/auth-session';
import {
  checkLoginAllowed,
  clearLoginFailures,
  getLoginClientKey,
  recordLoginFailure,
} from '@/lib/loginRateLimit';
import { prisma } from '@/lib/prisma';
import { readJsonBodyWithLimit } from '@/lib/readJsonBody';

const MAX_LOGIN_BODY_BYTES = 8 * 1024;
const MAX_USERNAME_LENGTH = 100;
const MAX_PASSWORD_LENGTH = 1_024;

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL is not configured', code: 'NO_DATABASE' },
      { status: 503 },
    );
  }

  const parsedBody = await readJsonBodyWithLimit(req, MAX_LOGIN_BODY_BYTES);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
  }
  const body =
    parsedBody.value && typeof parsedBody.value === 'object'
      ? (parsedBody.value as { username?: unknown; password?: unknown })
      : {};

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (
    !username ||
    !password ||
    username.length > MAX_USERNAME_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 400 });
  }

  if (!isJwtSecretConfigured()) {
    return NextResponse.json(
      { error: 'Server auth is misconfigured (JWT_SECRET)', code: 'JWT_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const clientKey = getLoginClientKey(req);
  const rate = checkLoginAllowed(clientKey);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many failed login attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } },
    );
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    recordLoginFailure(clientKey);
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  clearLoginFailures(clientKey);

  let token: string;
  try {
    token = await signSessionToken(user.username);
  } catch {
    return NextResponse.json(
      { error: 'Server auth is misconfigured (JWT_SECRET)', code: 'JWT_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const res = NextResponse.json({ ok: true, username: user.username });
  res.cookies.set(COOKIE_NAME, token, sessionCookieOptions(60 * 60 * 24 * 7));
  return res;
}
