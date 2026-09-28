import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Readiness probe for the app and its database; intentionally returns no internals. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: 'ok' },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { status: 'not_ready' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
