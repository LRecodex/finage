import { NextResponse } from 'next/server';

import { getDummyPasswordHash, verifyPassword } from '@/lib/auth/password';
import {
  clearLoginSecurityState,
  isRateLimited,
  isUserTemporarilyLocked,
  recordFailedLoginAttempt,
} from '@/lib/auth/login-security';
import { prisma } from '@/lib/prisma';
import { createSessionForUser } from '@/lib/auth/session';

export const runtime = 'nodejs';

type UserRow = {
  id: bigint;
  username: string;
  passwordHash: string;
  failedLoginAttempts: number;
  lockoutUntil: Date | null;
};

function redirectTo(request: Request, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const username = String(formData.get('username') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!username || !password) {
      return redirectTo(request, '/login?error=missing_fields');
    }

    const rateLimited = await isRateLimited(request, username);
    if (rateLimited) {
      return redirectTo(request, '/login?error=try_again_later');
    }

    const user = (await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        failedLoginAttempts: true,
        lockoutUntil: true,
      },
    })) as UserRow | null;

    if (!user) {
      await verifyPassword(password, await getDummyPasswordHash());
      await recordFailedLoginAttempt(request, username);
      return redirectTo(request, '/login?error=invalid_credentials');
    }

    const userLocked = await isUserTemporarilyLocked({
      failed_login_attempts: user.failedLoginAttempts,
      lockout_until: user.lockoutUntil,
    });

    if (userLocked) {
      await recordFailedLoginAttempt(request, username, Number(user.id));
      return redirectTo(request, '/login?error=try_again_later');
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      await recordFailedLoginAttempt(request, username, Number(user.id));
      return redirectTo(request, '/login?error=invalid_credentials');
    }

    await clearLoginSecurityState(request, username, Number(user.id));
    await createSessionForUser(Number(user.id));

    return redirectTo(request, '/dashboard');
  } catch {
    return redirectTo(request, '/login?error=server_error');
  }
}
