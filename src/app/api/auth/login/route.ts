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

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL is not configured', code: 'NO_DATABASE' },
      { status: 503 },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = (await req.json()) as { username?: string; password?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) {
    return NextResponse.json({ error: 'Missing username or password' }, { status: 400 });
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
