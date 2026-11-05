import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * AES-256-GCM for OAuth tokens at rest. A social token can post to someone's public
 * page, so a database dump must not hand those out. Values carry a prefix, which
 * lets rows written before encryption keep reading until they are next refreshed.
 */
const PREFIX = 'enc:v1:';

const keyFrom = (secret: string) => createHash('sha256').update(secret).digest();

export function encryptToken(value: string, secret: string): string {
  if (!value || value.startsWith(PREFIX)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${PREFIX}${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${data.toString('base64')}`;
}

export function decryptToken(value: string, secret: string): string {
  if (!value || !value.startsWith(PREFIX)) return value;
  const [iv, tag, data] = value.slice(PREFIX.length).split('.');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    keyFrom(secret),
    Buffer.from(iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(data, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

const TOKEN_FIELDS = ['accessToken', 'refreshToken'];

/** Encrypts token fields in a write payload (data / create / update, or a list of them). */
export function encryptTokenFields(data: any, secret: string): void {
  if (!data || typeof data !== 'object') return;
  if (Array.isArray(data)) {
    data.forEach((row) => encryptTokenFields(row, secret));
    return;
  }
  for (const field of TOKEN_FIELDS) {
    if (typeof data[field] === 'string') {
      data[field] = encryptToken(data[field], secret);
    }
  }
}

/** Decrypts token fields anywhere in a result, so `include: { connection: true }` works too. */
export function decryptTokenFields(result: any, secret: string): void {
  if (!result || typeof result !== 'object' || result instanceof Date) return;
  if (Array.isArray(result)) {
    result.forEach((row) => decryptTokenFields(row, secret));
    return;
  }
  for (const [key, value] of Object.entries(result)) {
    if (TOKEN_FIELDS.includes(key) && typeof value === 'string') {
      result[key] = decryptToken(value, secret);
    } else if (value && typeof value === 'object') {
      decryptTokenFields(value, secret);
    }
  }
}
