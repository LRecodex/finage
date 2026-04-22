import 'server-only';

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const DUMMY_PASSWORD_SALT = 'f2e99d9bd634e4aaf81d8f6f4a332193';
const DUMMY_PASSWORD_INPUT = 'not-the-real-password';

type ScryptHashParts = {
  n: number;
  r: number;
  p: number;
  salt: string;
  hash: string;
};

function scryptAsync(password: string, salt: string, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: n, r, p },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey as Buffer);
      }
    );
  });
}

function parseStoredHash(storedHash: string): ScryptHashParts | null {
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return null;
  }

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = parts[4];
  const hash = parts[5];

  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p) || !salt || !hash) {
    return null;
  }

  return { n, r, p, salt, hash };
}

let dummyPasswordHashPromise: Promise<string> | null = null;

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 12) {
    return 'Password must be at least 12 characters.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include a lowercase letter.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include an uppercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include a number.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include a symbol.';
  }

  const common = new Set(['12345678', 'password', 'password123', 'qwerty123']);
  if (common.has(password.toLowerCase())) {
    return 'Password is too common.';
  }

  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derivedKey.toString('hex')}`;
}

export async function getDummyPasswordHash(): Promise<string> {
  if (!dummyPasswordHashPromise) {
    dummyPasswordHashPromise = scryptAsync(
      DUMMY_PASSWORD_INPUT,
      DUMMY_PASSWORD_SALT,
      SCRYPT_N,
      SCRYPT_R,
      SCRYPT_P
    ).then(
      (derivedKey) =>
        `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${DUMMY_PASSWORD_SALT}$${derivedKey.toString('hex')}`
    );
  }

  return dummyPasswordHashPromise;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parsed = parseStoredHash(storedHash);
  if (!parsed) {
    return false;
  }

  const { n, r, p, salt, hash } = parsed;
  const derivedKey = await scryptAsync(password, salt, n, r, p);

  const expectedBuffer = Buffer.from(hash, 'hex');
  if (expectedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, expectedBuffer);
}
