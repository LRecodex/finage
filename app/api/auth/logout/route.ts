import { NextResponse } from 'next/server';

import { clearSession } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  await clearSession();
  return NextResponse.redirect(new URL('/login', request.url));
}
