import { NextResponse } from 'next/server';

import { testDbConnection } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await testDbConnection();

    return NextResponse.json({
      ok: true,
      message: 'Database connection successful',
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';

    return NextResponse.json(
      {
        ok: false,
        message,
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
