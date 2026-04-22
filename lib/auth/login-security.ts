import 'server-only';

import { prisma } from '@/lib/prisma';

const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_MAX_ATTEMPTS_PER_WINDOW = 10;
const LOGIN_BLOCK_MINUTES = 15;
const USER_MAX_FAILED_ATTEMPTS = 5;
const USER_BLOCK_MINUTES = 30;

type UserSecurityRow = {
  failed_login_attempts: number;
  lockout_until: Date | null;
};

function normalizeIp(ip: string | null): string {
  if (!ip) {
    return 'unknown';
  }
  return ip.trim().slice(0, 120);
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0] ?? '';
    return normalizeIp(firstIp);
  }

  const realIp = request.headers.get('x-real-ip');
  return normalizeIp(realIp);
}

function getIpScopeKey(request: Request): string {
  return `ip:${getClientIp(request)}`;
}

function getUsernameScopeKey(username: string): string {
  return `username:${username.toLowerCase()}`;
}

export async function isRateLimited(request: Request, username: string): Promise<boolean> {
  const limits = await prisma.authRateLimit.findMany({
    where: {
      scopeKey: {
        in: [getIpScopeKey(request), getUsernameScopeKey(username)],
      },
    },
    select: {
      blockedUntil: true,
    },
  });

  const now = Date.now();

  for (const limit of limits) {
    if (limit.blockedUntil && limit.blockedUntil.getTime() > now) {
      return true;
    }
  }

  return false;
}

async function upsertFailedScope(scopeKey: string): Promise<void> {
  const existing = await prisma.authRateLimit.findUnique({
    where: { scopeKey },
  });

  const now = new Date();

  if (!existing) {
    const blockedUntil =
      LOGIN_MAX_ATTEMPTS_PER_WINDOW <= 1
        ? new Date(now.getTime() + LOGIN_BLOCK_MINUTES * 60 * 1000)
        : null;

    await prisma.authRateLimit.create({
      data: {
        scopeKey,
        attemptCount: 1,
        windowStartedAt: now,
        blockedUntil,
      },
    });
    return;
  }

  if (existing.blockedUntil && existing.blockedUntil.getTime() > now.getTime()) {
    return;
  }

  const windowAgeMs = now.getTime() - existing.windowStartedAt.getTime();
  const windowMs = LOGIN_WINDOW_MINUTES * 60 * 1000;

  let nextCount = existing.attemptCount + 1;
  let nextWindowStartedAt = existing.windowStartedAt;

  if (windowAgeMs > windowMs) {
    nextCount = 1;
    nextWindowStartedAt = now;
  }

  const nextBlockedUntil =
    nextCount >= LOGIN_MAX_ATTEMPTS_PER_WINDOW
      ? new Date(now.getTime() + LOGIN_BLOCK_MINUTES * 60 * 1000)
      : null;

  await prisma.authRateLimit.update({
    where: { scopeKey },
    data: {
      attemptCount: nextCount,
      windowStartedAt: nextWindowStartedAt,
      blockedUntil: nextBlockedUntil,
    },
  });
}

export async function recordFailedLoginAttempt(request: Request, username: string, userId?: number): Promise<void> {
  const ipScopeKey = getIpScopeKey(request);
  const usernameScopeKey = getUsernameScopeKey(username);

  await upsertFailedScope(ipScopeKey);
  await upsertFailedScope(usernameScopeKey);

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: {
        failedLoginAttempts: true,
        lockoutUntil: true,
      },
    });

    if (!user) {
      return;
    }

    const nextFailedAttempts = user.failedLoginAttempts + 1;
    const now = new Date();

    let nextLockoutUntil: Date | null = null;
    if (user.lockoutUntil && user.lockoutUntil > now) {
      nextLockoutUntil = user.lockoutUntil;
    } else if (nextFailedAttempts >= USER_MAX_FAILED_ATTEMPTS) {
      nextLockoutUntil = new Date(now.getTime() + USER_BLOCK_MINUTES * 60 * 1000);
    }

    await prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        failedLoginAttempts: nextFailedAttempts,
        lockoutUntil: nextLockoutUntil,
      },
    });
  }
}

export async function isUserTemporarilyLocked(userSecurity: UserSecurityRow): Promise<boolean> {
  if (!userSecurity.lockout_until) {
    return false;
  }
  return new Date(userSecurity.lockout_until).getTime() > Date.now();
}

export async function clearLoginSecurityState(request: Request, username: string, userId: number): Promise<void> {
  await prisma.user.update({
    where: { id: BigInt(userId) },
    data: {
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date(),
    },
  });

  await prisma.authRateLimit.deleteMany({
    where: {
      scopeKey: {
        in: [getIpScopeKey(request), getUsernameScopeKey(username)],
      },
    },
  });
}
