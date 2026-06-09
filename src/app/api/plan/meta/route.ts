import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth-session';
import { getPlanKeyFromRequest } from '@/lib/planKey';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL is not configured' }, { status: 503 });
  }
  const store = await cookies();
  const username = await verifySessionToken(store.get(COOKIE_NAME)?.value);
  if (!username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const planKey = getPlanKeyFromRequest(req);
  if (planKey === null) {
    return NextResponse.json({ error: 'Invalid planKey' }, { status: 400 });
  }

  const row = await prisma.cloudPlan.findUnique({
    where: { id: planKey },
    select: { updatedAt: true },
  });

  return NextResponse.json({
    updatedAt: row ? row.updatedAt.toISOString() : null,
  });
}
