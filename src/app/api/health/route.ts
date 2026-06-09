import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const time = new Date().toISOString();

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      ok: true,
      database: 'not_configured',
      time,
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      database: 'ok',
      time,
    });
  }
  catch {
    return NextResponse.json(
      {
        ok: false,
        database: 'error',
        time,
      },
      { status: 503 },
    );
  }
}
