import 'server-only';

import { db } from '@/lib/db';

const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_MAX_ATTEMPTS_PER_WINDOW = 10;
const LOGIN_BLOCK_MINUTES = 15;
const USER_MAX_FAILED_ATTEMPTS = 5;
const USER_BLOCK_MINUTES = 30;

type RateLimitRow = {
  scope_key: string;
  attempt_count: number;
  window_started_at: Date;
  blocked_until: Date | null;
};

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
  const [rows] = await db.execute(
    'SELECT scope_key, attempt_count, window_started_at, blocked_until FROM auth_rate_limits WHERE scope_key IN (:ipScopeKey, :usernameScopeKey)',
    {
      ipScopeKey: getIpScopeKey(request),
      usernameScopeKey: getUsernameScopeKey(username),
    }
  );

  const limits = rows as RateLimitRow[];
  const now = Date.now();

  for (const limit of limits) {
    if (limit.blocked_until && new Date(limit.blocked_until).getTime() > now) {
      return true;
    }
  }

  return false;
}

async function upsertFailedScope(scopeKey: string): Promise<void> {
  const [rows] = await db.execute(
    'SELECT scope_key, attempt_count, window_started_at, blocked_until FROM auth_rate_limits WHERE scope_key = :scopeKey LIMIT 1',
    { scopeKey }
  );

  const existing = (rows as RateLimitRow[])[0];
  const now = new Date();

  if (!existing) {
    const blockedUntil = LOGIN_MAX_ATTEMPTS_PER_WINDOW <= 1
      ? new Date(now.getTime() + LOGIN_BLOCK_MINUTES * 60 * 1000)
      : null;

    await db.execute(
      'INSERT INTO auth_rate_limits (scope_key, attempt_count, window_started_at, blocked_until) VALUES (:scopeKey, :attemptCount, :windowStartedAt, :blockedUntil)',
      {
        scopeKey,
        attemptCount: 1,
        windowStartedAt: now,
        blockedUntil,
      }
    );
    return;
  }

  const blockedUntil = existing.blocked_until ? new Date(existing.blocked_until) : null;
  if (blockedUntil && blockedUntil.getTime() > now.getTime()) {
    return;
  }

  const windowStartedAt = new Date(existing.window_started_at);
  const windowAgeMs = now.getTime() - windowStartedAt.getTime();
  const windowMs = LOGIN_WINDOW_MINUTES * 60 * 1000;

  let nextCount = existing.attempt_count + 1;
  let nextWindowStartedAt = windowStartedAt;

  if (windowAgeMs > windowMs) {
    nextCount = 1;
    nextWindowStartedAt = now;
  }

  const nextBlockedUntil = nextCount >= LOGIN_MAX_ATTEMPTS_PER_WINDOW
    ? new Date(now.getTime() + LOGIN_BLOCK_MINUTES * 60 * 1000)
    : null;

  await db.execute(
    'UPDATE auth_rate_limits SET attempt_count = :attemptCount, window_started_at = :windowStartedAt, blocked_until = :blockedUntil WHERE scope_key = :scopeKey',
    {
      scopeKey,
      attemptCount: nextCount,
      windowStartedAt: nextWindowStartedAt,
      blockedUntil: nextBlockedUntil,
    }
  );
}

export async function recordFailedLoginAttempt(request: Request, username: string, userId?: number): Promise<void> {
  const ipScopeKey = getIpScopeKey(request);
  const usernameScopeKey = getUsernameScopeKey(username);

  await upsertFailedScope(ipScopeKey);
  await upsertFailedScope(usernameScopeKey);

  if (userId) {
    await db.execute(
      `UPDATE users
       SET failed_login_attempts = failed_login_attempts + 1,
           lockout_until = CASE
             WHEN lockout_until IS NOT NULL AND lockout_until > UTC_TIMESTAMP() THEN lockout_until
             WHEN failed_login_attempts + 1 >= :maxFailedAttempts THEN DATE_ADD(UTC_TIMESTAMP(), INTERVAL :userBlockMinutes MINUTE)
             ELSE NULL
           END
       WHERE id = :userId`,
      {
        userId,
        maxFailedAttempts: USER_MAX_FAILED_ATTEMPTS,
        userBlockMinutes: USER_BLOCK_MINUTES,
      }
    );
  }
}

export async function isUserTemporarilyLocked(userSecurity: UserSecurityRow): Promise<boolean> {
  if (!userSecurity.lockout_until) {
    return false;
  }
  return new Date(userSecurity.lockout_until).getTime() > Date.now();
}

export async function clearLoginSecurityState(request: Request, username: string, userId: number): Promise<void> {
  await db.execute(
    'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL, last_login_at = UTC_TIMESTAMP() WHERE id = :userId',
    { userId }
  );

  await db.execute('DELETE FROM auth_rate_limits WHERE scope_key IN (:ipScopeKey, :usernameScopeKey)', {
    ipScopeKey: getIpScopeKey(request),
    usernameScopeKey: getUsernameScopeKey(username),
  });
}
