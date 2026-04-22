import 'server-only';

import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';

const UPLOAD_RELATIVE_DIR = '/uploads/profiles';
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'profiles');
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

const CONTENT_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function toUploadPath(filename: string): string {
  return `${UPLOAD_RELATIVE_DIR}/${filename}`;
}

function resolveAbsoluteUploadPath(uploadPath: string): string | null {
  if (!uploadPath.startsWith(`${UPLOAD_RELATIVE_DIR}/`)) {
    return null;
  }

  const absolute = path.normalize(path.join(process.cwd(), 'public', uploadPath));
  const uploadBase = path.normalize(UPLOAD_DIR);

  if (!absolute.startsWith(`${uploadBase}${path.sep}`)) {
    return null;
  }

  return absolute;
}

export async function saveProfileImage(file: File): Promise<string> {
  const extension = CONTENT_TYPE_TO_EXTENSION[file.type];
  if (!extension) {
    throw new Error('Only JPG, PNG, WEBP, and GIF images are allowed.');
  }

  if (file.size <= 0) {
    throw new Error('Image file is empty.');
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error('Image file is too large. Max size is 5MB.');
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  const absoluteFilePath = path.join(UPLOAD_DIR, filename);

  await writeFile(absoluteFilePath, fileBuffer);

  return toUploadPath(filename);
}

export async function deleteProfileImage(uploadPath: string | null | undefined): Promise<void> {
  if (!uploadPath) {
    return;
  }

  const absolutePath = resolveAbsoluteUploadPath(uploadPath);
  if (!absolutePath) {
    return;
  }

  try {
    await unlink(absolutePath);
  } catch {
    // ignore missing files
  }
}
