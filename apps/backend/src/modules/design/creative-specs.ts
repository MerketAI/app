/**
 * What a creative is for, and therefore its exact size.
 *
 *   category  ->  platform  ->  placement  ->  width x height, ratio, orientation
 *   social        instagram     feed-portrait   1080 x 1350, 4:5, portrait
 *
 * Every output Jasper renders resolves to one of these specs (or a validated
 * custom size), so the image is always the size the destination expects, and
 * text stays clear of the parts each app covers with its own UI (safe areas).
 *
 * Sizes are the platforms' recommended upload sizes as of 2026; check them
 * against platform documentation when a platform changes its layout.
 */

export type CreativeCategory = 'social' | 'website' | 'email' | 'blog' | 'ads' | 'print';
export type Orientation = 'portrait' | 'square' | 'landscape';
/** Layout family: how the text column and photo are arranged. Follows from the ratio. */
export type LayoutFamily = 'square' | 'portrait' | 'story' | 'landscape' | 'banner';

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CreativeSpec {
  /** e.g. "instagram-feed-portrait" */
  id: string;
  category: CreativeCategory;
  platform: string;
  placement: string;
  label: string;
  width: number;
  height: number;
  /** Simplified ratio for display, e.g. "4:5". */
  ratio: string;
  orientation: Orientation;
  family: LayoutFamily;
  /** Pixels the app overlays with its own UI; text is kept out of them. */
  safe?: SafeArea;
  /** Print resolution, when the spec is for print. */
  dpi?: number;
  notes?: string;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** "4:5", "16:9"; sizes that do not reduce neatly read as "1.91:1". */
export const ratioOf = (w: number, h: number) => {
  const d = gcd(w, h);
  if (w / d <= 32 && h / d <= 32) return `${w / d}:${h / d}`;
  const r = w / h;
  return r >= 1 ? `${+r.toFixed(2)}:1` : `1:${+(h / w).toFixed(2)}`;
};

export function orientationOf(width: number, height: number): Orientation {
  const r = width / height;
  return r > 1.05 ? 'landscape' : r < 0.95 ? 'portrait' : 'square';
}

/** The layout family that suits a canvas, from its ratio alone. */
export function familyOf(width: number, height: number): LayoutFamily {
  const r = width / height;
  if (r < 0.65) return 'story';
  if (r < 0.95) return 'portrait';
  if (r <= 1.2) return 'square';
  if (r <= 2.2) return 'landscape';
  return 'banner';
}

// Instagram and Facebook stories: the app draws the profile row at the top and
// the reply bar at the bottom.
const STORY_SAFE: SafeArea = { top: 250, right: 64, bottom: 340, left: 64 };

type Row = [id: string, category: CreativeCategory, platform: string, placement: string, label: string, w: number, h: number, extra?: Partial<CreativeSpec>];

const ROWS: Row[] = [
  // ---- Social ----------------------------------------------------------
  ['instagram-feed-portrait', 'social', 'instagram', 'feed-portrait', 'Instagram feed post (portrait)', 1080, 1350, { notes: 'Best reach in the feed.' }],
  ['instagram-feed-3x4', 'social', 'instagram', 'feed-3x4', 'Instagram feed post (3:4, matches the profile grid)', 1080, 1440],
  ['instagram-feed-square', 'social', 'instagram', 'feed-square', 'Instagram feed post (square)', 1080, 1080],
  ['instagram-feed-landscape', 'social', 'instagram', 'feed-landscape', 'Instagram feed post (landscape)', 1080, 566],
  ['instagram-story', 'social', 'instagram', 'story', 'Instagram story', 1080, 1920, { safe: STORY_SAFE }],
  ['instagram-reel-cover', 'social', 'instagram', 'reel-cover', 'Instagram reel cover', 1080, 1920, { safe: { top: 240, right: 64, bottom: 420, left: 64 }, notes: 'Shown cropped to 3:4 on the profile grid; key text stays central.' }],
  ['facebook-feed-portrait', 'social', 'facebook', 'feed-portrait', 'Facebook feed post (portrait)', 1080, 1350],
  ['facebook-feed-square', 'social', 'facebook', 'feed-square', 'Facebook feed post (square)', 1080, 1080],
  ['facebook-link', 'social', 'facebook', 'link', 'Facebook link / shared post', 1200, 630],
  ['facebook-story', 'social', 'facebook', 'story', 'Facebook story', 1080, 1920, { safe: STORY_SAFE }],
  ['facebook-event-cover', 'social', 'facebook', 'event-cover', 'Facebook event cover', 1920, 1005],
  ['facebook-page-cover', 'social', 'facebook', 'page-cover', 'Facebook page cover', 1640, 624, { safe: { top: 40, right: 180, bottom: 120, left: 180 }, notes: 'Mobile crops the sides; profile photo overlaps bottom-left.' }],
  ['x-post', 'social', 'x', 'post', 'X (Twitter) post', 1600, 900],
  ['x-post-square', 'social', 'x', 'post-square', 'X (Twitter) post (square)', 1080, 1080],
  ['x-header', 'social', 'x', 'header', 'X (Twitter) header', 1500, 500, { safe: { top: 30, right: 60, bottom: 120, left: 300 }, notes: 'Profile photo overlaps bottom-left.' }],
  ['linkedin-feed-square', 'social', 'linkedin', 'feed-square', 'LinkedIn feed post (square)', 1200, 1200],
  ['linkedin-feed-portrait', 'social', 'linkedin', 'feed-portrait', 'LinkedIn feed post (portrait)', 1080, 1350],
  ['linkedin-feed-landscape', 'social', 'linkedin', 'feed-landscape', 'LinkedIn feed post (landscape)', 1200, 627],
  ['linkedin-company-cover', 'social', 'linkedin', 'company-cover', 'LinkedIn company page cover', 1128, 191, { safe: { top: 10, right: 40, bottom: 10, left: 260 }, notes: 'Logo overlaps the left.' }],
  ['whatsapp-status', 'social', 'whatsapp', 'status', 'WhatsApp status', 1080, 1920, { safe: { top: 220, right: 64, bottom: 280, left: 64 } }],
  ['whatsapp-post', 'social', 'whatsapp', 'post', 'WhatsApp image', 1080, 1080],
  ['youtube-thumbnail', 'social', 'youtube', 'thumbnail', 'YouTube thumbnail', 1280, 720, { safe: { top: 0, right: 200, bottom: 80, left: 0 }, notes: 'Duration badge covers bottom-right.' }],
  ['youtube-community', 'social', 'youtube', 'community-post', 'YouTube community post', 1080, 1080],
  ['pinterest-pin', 'social', 'pinterest', 'pin', 'Pinterest pin', 1000, 1500],
  ['google-business-post', 'social', 'google-business', 'post', 'Google Business Profile post', 1200, 900],

  // ---- Website ---------------------------------------------------------
  ['web-hero', 'website', 'website', 'hero', 'Website hero banner', 1920, 600, { notes: 'Wide screens show it all; narrow ones crop the sides, so key content sits left-centre.' }],
  ['web-hero-full', 'website', 'website', 'hero-full', 'Website full-screen hero', 1920, 1080],
  ['web-hero-wide', 'website', 'website', 'hero-wide', 'Website wide banner', 2400, 800],
  ['web-section', 'website', 'website', 'section', 'Website section banner', 1200, 400],
  ['web-hero-mobile', 'website', 'website', 'hero-mobile', 'Website hero (mobile)', 1080, 1350],
  ['web-og', 'website', 'website', 'share-image', 'Website share image (Open Graph)', 1200, 630],

  // ---- Email / blog ----------------------------------------------------
  ['email-header', 'email', 'email', 'header', 'Email header', 1200, 400, { notes: 'Shown at 600px wide; text must stay large.' }],
  ['email-feature', 'email', 'email', 'feature', 'Email feature image', 1200, 800],
  ['blog-cover', 'blog', 'blog', 'cover', 'Blog cover', 1600, 900],
  ['blog-inline', 'blog', 'blog', 'inline', 'Blog inline image', 1200, 800],

  // ---- Ads ---------------------------------------------------------------
  ['ads-display-landscape', 'ads', 'google-ads', 'display-landscape', 'Display ad (landscape)', 1200, 628],
  ['ads-display-square', 'ads', 'google-ads', 'display-square', 'Display ad (square)', 1200, 1200],
  ['ads-meta-feed', 'ads', 'meta-ads', 'feed', 'Meta (Facebook/Instagram) feed ad', 1080, 1350],
  ['ads-meta-story', 'ads', 'meta-ads', 'story', 'Meta story / reels ad', 1080, 1920, { safe: STORY_SAFE }],

  // ---- Print (300 dpi) ---------------------------------------------------
  ['print-a4', 'print', 'print', 'a4-flyer', 'A4 flyer / poster (portrait, 300 dpi)', 2480, 3508, { dpi: 300 }],
  ['print-a5', 'print', 'print', 'a5-flyer', 'A5 flyer (portrait, 300 dpi)', 1748, 2480, { dpi: 300 }],
  ['print-a4-landscape', 'print', 'print', 'a4-landscape', 'A4 landscape (300 dpi)', 3508, 2480, { dpi: 300 }],
];

export const CREATIVE_SPECS: CreativeSpec[] = ROWS.map(([id, category, platform, placement, label, width, height, extra]) => ({
  id,
  category,
  platform,
  placement,
  label,
  width,
  height,
  ratio: ratioOf(width, height),
  orientation: orientationOf(width, height),
  family: familyOf(width, height),
  ...extra,
}));

export const SPEC_IDS = CREATIVE_SPECS.map((s) => s.id);
const BY_ID = new Map(CREATIVE_SPECS.map((s) => [s.id, s]));

/** The old four formats, kept working. */
const LEGACY_FORMATS: Record<string, string> = {
  square: 'instagram-feed-square',
  portrait: 'instagram-feed-portrait',
  story: 'instagram-story',
  landscape: 'facebook-link',
};

/** Feed post size when only a platform is named. */
const PLATFORM_DEFAULT: Record<string, string> = {
  instagram: 'instagram-feed-portrait',
  facebook: 'facebook-feed-portrait',
  x: 'x-post',
  twitter: 'x-post',
  linkedin: 'linkedin-feed-square',
  whatsapp: 'whatsapp-post',
  youtube: 'youtube-thumbnail',
  pinterest: 'pinterest-pin',
  'google-business': 'google-business-post',
  website: 'web-hero',
  email: 'email-header',
  blog: 'blog-cover',
  print: 'print-a4',
};

export const SIZE_LIMITS = { min: 200, max: 4000, minRatio: 1 / 4, maxRatio: 6 };

export class CreativeSpecError extends Error {}

/**
 * Resolves a request to a spec: an exact spec id, a legacy format, a platform
 * (its feed default), or a custom width x height within SIZE_LIMITS.
 * Defaults to the Instagram portrait feed post.
 */
export function resolveSpec(request: { spec?: string; platform?: string; width?: number; height?: number } = {}): CreativeSpec {
  if (request.width || request.height) {
    const width = Math.round(Number(request.width));
    const height = Math.round(Number(request.height));
    if (!width || !height) throw new CreativeSpecError('A custom size needs both width and height.');
    if (width < SIZE_LIMITS.min || height < SIZE_LIMITS.min || width > SIZE_LIMITS.max || height > SIZE_LIMITS.max) {
      throw new CreativeSpecError(`Custom sizes must be between ${SIZE_LIMITS.min} and ${SIZE_LIMITS.max} pixels on each side.`);
    }
    const r = width / height;
    if (r < SIZE_LIMITS.minRatio || r > SIZE_LIMITS.maxRatio) {
      throw new CreativeSpecError('That shape is too narrow to lay out (between 1:4 and 6:1 works).');
    }
    // An exact match to a known spec keeps its safe areas.
    const known = CREATIVE_SPECS.find((s) => s.width === width && s.height === height && (!request.platform || s.platform === request.platform));
    if (known) return known;
    return {
      id: `custom-${width}x${height}`,
      category: 'social',
      platform: request.platform || 'custom',
      placement: 'custom',
      label: `Custom ${width}×${height}`,
      width,
      height,
      ratio: ratioOf(width, height),
      orientation: orientationOf(width, height),
      family: familyOf(width, height),
    };
  }
  const key = String(request.spec || '').toLowerCase().trim();
  if (key) {
    const spec = BY_ID.get(key) || BY_ID.get(LEGACY_FORMATS[key] || '');
    if (!spec) throw new CreativeSpecError(`Unknown size "${request.spec}". Use one of: ${SPEC_IDS.join(', ')}.`);
    return spec;
  }
  const platform = String(request.platform || '').toLowerCase();
  return BY_ID.get(PLATFORM_DEFAULT[platform] || '') || BY_ID.get('instagram-feed-portrait')!;
}

/** The catalogue grouped for a picker: category -> platform -> specs. */
export function specCatalogue() {
  const tree: Record<string, Record<string, CreativeSpec[]>> = {};
  for (const spec of CREATIVE_SPECS) {
    ((tree[spec.category] ||= {})[spec.platform] ||= []).push(spec);
  }
  return tree;
}
