import { createHash, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { DATA_DIR } from './db.js';
import { sniffImage } from './image.js';

// ---------------------------------------------------------------------------
// AvatarStore — interfaccia di storage pensata per scalare a milioni di utenti.
//
// Layout chiavi sharded:  avatars/<aa>/<bb>/u<id>-<token>.<ext>
//   - 2 livelli × 256 shard = 65k directory foglia → nessun limite di file/dir
//   - stessa key su filesystem oggi e su S3/GCS domani (basta reimplementare
//     save/load/delete sotto, le route non cambiano).
//
// Sicurezza: SVG è escluso (può contenere script → XSS same-origin). Il tipo
// viene dedotto dai magic bytes, mai dal Content-Type dichiarato dal client.
// ---------------------------------------------------------------------------

export const AVATARS_DIR = path.join(DATA_DIR, 'avatars');
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const EXT_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

const KEY_RE = /^[a-f0-9]{2}\/[a-f0-9]{2}\/u\d+-[A-Za-z0-9_-]{4,12}\.(png|jpg|gif|webp)$/;

fs.mkdirSync(AVATARS_DIR, { recursive: true });

function shardsFor(userId: number): [string, string] {
  const h = createHash('sha256').update(`avatar:${userId}`).digest('hex');
  return [h.slice(0, 2), h.slice(2, 4)];
}

export function avatarContentType(rel: string): string {
  const ext = rel.split('.').pop() || '';
  return EXT_TO_MIME[ext] || 'application/octet-stream';
}

/** Percorso assoluto sicuro a partire da una chiave relativa (anti traversal). */
export function avatarAbs(rel: string): string | null {
  if (!KEY_RE.test(rel)) return null;
  const abs = path.resolve(AVATARS_DIR, rel);
  if (!abs.startsWith(AVATARS_DIR + path.sep)) return null;
  return abs;
}

export async function saveAvatar(userId: number, file: File): Promise<string> {
  if (file.size > AVATAR_MAX_BYTES || file.size === 0)
    throw Object.assign(new Error('image must be between 1 byte and 2 MB'), { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  // Trust only the bytes: a text file renamed .png is rejected, and an SVG
  // (or anything else) can never be stored or served as an image.
  const kind = sniffImage(buf);
  if (!kind) {
    throw Object.assign(new Error('unsupported image (png, jpg, gif, webp)'), { status: 415 });
  }

  const [a, b] = shardsFor(userId);
  const token = randomBytes(3).toString('base64url');
  const rel = `${a}/${b}/u${userId}-${token}.${kind.ext}`;
  const abs = path.join(AVATARS_DIR, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, buf);
  return rel;
}

export function deleteAvatar(rel: string | null | undefined): void {
  if (!rel) return;
  const abs = avatarAbs(rel);
  if (abs) fs.rmSync(abs, { force: true });
}
