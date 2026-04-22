import type { ProfileInput, ValidationResult } from './types';

export function validateProfileInput(raw: unknown): ValidationResult<ProfileInput> {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid payload.' };
  }

  const body = raw as Record<string, unknown>;

  const name = String(body.name ?? '').trim();
  const age = Number(body.age);
  const profilePictureUrl = String(body.profilePictureUrl ?? '').trim();

  if (!name) {
    return { ok: false, error: 'Name is required.' };
  }
  if (name.length > 120) {
    return { ok: false, error: 'Name is too long.' };
  }

  if (!profilePictureUrl) {
    return { ok: false, error: 'Profile picture path is required.' };
  }
  if (profilePictureUrl.length > 500) {
    return { ok: false, error: 'Profile picture path is too long.' };
  }
  if (!profilePictureUrl.startsWith('/uploads/profiles/')) {
    return { ok: false, error: 'Profile picture path is invalid.' };
  }

  if (!Number.isInteger(age) || age < 1 || age > 120) {
    return { ok: false, error: 'Age must be an integer between 1 and 120.' };
  }

  return {
    ok: true,
    data: {
      name,
      profilePictureUrl,
      age,
    },
  };
}
