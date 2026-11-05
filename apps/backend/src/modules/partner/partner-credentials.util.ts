import { randomBytes, timingSafeEqual, createHash } from 'crypto';

/**
 * Credential format for B2B partner platforms.
 *
 *   APP_KEY    U877666FX667777Z566-dhdhhdhhdhdhd   (public identifier, stored in clear)
 *   APP_SECRET 7373@jcchchh!djdjdjjdj7877dhdhdhdh  (system generated, stored hashed, shown once)
 *   APP_UID    UYYHD77887778888 | 23455            (partner's own subscriber id, opaque)
 */

const UPPER_ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const LOWER_ALNUM = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SECRET_ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@!#$%&*';

function pick(alphabet: string, length: number): string {
  // Rejection-free uniform sampling: draw 2 bytes per char and mod into range.
  const bytes = randomBytes(length * 2);
  let out = '';
  for (let i = 0; i < length; i++) {
    const n = (bytes[i * 2] << 8) | bytes[i * 2 + 1];
    out += alphabet[n % alphabet.length];
  }
  return out;
}

/** `U` + 20 uppercase alphanumerics + `-` + 13 lowercase alphanumerics. */
export function generateAppKey(): string {
  return `U${pick(UPPER_ALNUM, 20)}-${pick(LOWER_ALNUM, 13)}`;
}

/** 32-character mixed-alphabet secret. Returned once, never stored in clear. */
export function generateAppSecret(): string {
  return pick(SECRET_ALPHABET, 32);
}

/**
 * Secrets are high-entropy machine credentials, so a single SHA-256 pass is
 * sufficient and — unlike bcrypt — cheap enough to run on every API request.
 */
export function hashAppSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export function verifyAppSecret(secret: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashAppSecret(secret), 'hex');
  let expected: Buffer;
  try {
    expected = Buffer.from(expectedHash, 'hex');
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString('hex')}`;
}

const APP_KEY_PATTERN = /^U[A-Z0-9]{8,32}-[a-z0-9]{8,32}$/;
export function isValidAppKeyFormat(key: string): boolean {
  return APP_KEY_PATTERN.test(key);
}

/**
 * APP_UID is chosen by the partner, so accept anything printable and
 * reasonably sized — but reject whitespace and control characters that would
 * make the value ambiguous in a header.
 */
const APP_UID_PATTERN = /^[A-Za-z0-9._:@#\[\]-]{1,128}$/;
export function isValidAppUidFormat(uid: string): boolean {
  return APP_UID_PATTERN.test(uid);
}
