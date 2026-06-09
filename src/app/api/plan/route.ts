import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth-session';
import { getPlanKeyFromRequest } from '@/lib/planKey';
import { normalizeSeatingPlan } from '@/lib/planImport';
import { prisma } from '@/lib/prisma';

async function requireUser(): Promise<string | NextResponse> {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL is not configured' }, { status: 503 });
  }
  const store = await cookies();
  const username = await verifySessionToken(store.get(COOKIE_NAME)?.value);
  if (!username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return username;
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const planKey = getPlanKeyFromRequest(req);
  if (planKey === null) {
    return NextResponse.json({ error: 'Invalid planKey' }, { status: 400 });
  }

  const row = await prisma.cloudPlan.findUnique({ where: { id: planKey } });
  if (!row) {
    return NextResponse.json({ plan: null });
  }
  try {
    const parsed: unknown = JSON.parse(row.payload);
    const plan = normalizeSeatingPlan(parsed);
    return NextResponse.json({ plan });
  } catch {
    return NextResponse.json({ error: 'Stored plan is invalid' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const planKey = getPlanKeyFromRequest(req);
  if (planKey === null) {
    return NextResponse.json({ error: 'Invalid planKey' }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const plan = normalizeSeatingPlan(raw);
  if (!plan) {
    return NextResponse.json({ error: 'Invalid seating plan payload' }, { status: 400 });
  }

  const payload = JSON.stringify({
    ...plan,
    lastUpdated: new Date().toISOString(),
  });

  await prisma.cloudPlan.upsert({
    where: { id: planKey },
    create: { id: planKey, payload },
    update: { payload },
  });

  return NextResponse.json({ ok: true });
}
