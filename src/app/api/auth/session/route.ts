import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE_NAME, isJwtSecretConfigured, verifySessionToken } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';

async function databaseReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  }
  catch {
    return false;
  }
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      ok: false,
      configured: false,
      databaseReady: false,
      jwtReady: true,
    }, { status: 200 });
  }

  const dbOk = await databaseReachable();
  if (!dbOk) {
    return NextResponse.json({
      ok: false,
      configured: true,
      databaseReady: false,
      jwtReady: true,
    }, { status: 200 });
  }

  const jwtReady = isJwtSecretConfigured();
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  const username = await verifySessionToken(token);
  if (!username) {
    return NextResponse.json({ ok: false, configured: true, databaseReady: true, jwtReady });
  }
  return NextResponse.json({ ok: true, configured: true, databaseReady: true, jwtReady, username });
}
