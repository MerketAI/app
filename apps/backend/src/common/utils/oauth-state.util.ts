import { createHmac, timingSafeEqual } from 'crypto';

/**
 * OAuth `state`, signed so a callback can trust it.
 *
 * Unsigned state let anyone forge a callback naming another user's id and attach
 * their own social account to that user. Signing also carries the partner's
 * return URL safely through the provider's redirect.
 */
export interface OAuthState {
  userId: string;
  /** Where to send the browser afterwards (partner apps); checked against OAUTH_RETURN_ORIGINS. */
  returnUrl?: string;
  /** Expiry, ms since epoch. */
  exp: number;
}

const TTL_MS = 15 * 60 * 1000;

const sign = (body: string, secret: string) =>
  createHmac('sha256', secret).update(body).digest('base64url');

export function signOAuthState(
  payload: Omit<OAuthState, 'exp'>,
  secret: string,
): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + TTL_MS }),
  ).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

/** Returns the payload, or null when the state is forged, malformed or expired. */
export function verifyOAuthState(
  state: string,
  secret: string,
): OAuthState | null {
  const [body, mac] = String(state || '').split('.');
  if (!body || !mac) return null;

  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString(),
    ) as OAuthState;
    return payload.userId && payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

/** A return URL is only honoured when its origin is on the comma-separated allowlist. */
export function isAllowedReturnUrl(
  url: string | undefined,
  allowedOrigins: string | undefined,
): boolean {
  if (!url) return false;
  try {
    const origin = new URL(url).origin;
    return (allowedOrigins || '')
      .split(',')
      .map((o) => o.trim().replace(/\/+$/, ''))
      .includes(origin);
  } catch {
    return false;
  }
}
