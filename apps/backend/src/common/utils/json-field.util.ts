/**
 * Several Prisma columns hold JSON-encoded arrays in a `String` field
 * (mediaUrls, hashtags, seoKeywords, scopes, ...). Reading them straight off a
 * Prisma row yields a string, not an array, so every consumer must decode first.
 */

/** Decodes a JSON array column, tolerating null, malformed JSON and non-arrays. */
export function parseJsonArray<T = string>(
  value: unknown,
  fallback: T[] = [],
): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== 'string' || value.trim() === '') return fallback;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

/** Decodes a JSON object column, tolerating null, malformed JSON and non-objects. */
export function parseJsonObject<T extends Record<string, any>>(
  value: unknown,
  fallback: T = {} as T,
): T {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as T;
  }
  if (typeof value !== 'string' || value.trim() === '') return fallback;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as T)
      : fallback;
  } catch {
    return fallback;
  }
}

/** Normalizes hashtags to bare words, so callers can format them consistently. */
export function normalizeHashtags(value: unknown): string[] {
  return parseJsonArray<string>(value)
    .map((tag) => String(tag).trim().replace(/^#+/, ''))
    .filter((tag) => tag.length > 0);
}

/** Renders hashtags as a space-separated `#tag` string. */
export function formatHashtags(value: unknown): string {
  return normalizeHashtags(value)
    .map((tag) => `#${tag}`)
    .join(' ');
}
