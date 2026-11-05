/**
 * Design tokens: the palette and typography a template draws from.
 *
 * Lives in the shared package so the Next.js preview and the Puppeteer export
 * resolve identical values. A palette computed differently in two places is a
 * preview that lies about what will be published.
 *
 * Templates never hardcode a colour or a font. They ask for a role - "accent",
 * "surface", "onSurfaceMuted" - so one brand colour propagates coherently and a
 * template stays legible whether the brand is navy or lime.
 */

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export interface Palette {
  /** The brand colour, as supplied. */
  brand: string;
  /** Primary action / emphasis colour. */
  accent: string;
  /** A harmonious second colour, for alternating panels and highlights. */
  accentAlt: string;
  /** Warm highlight, used sparingly for a third emphasis. */
  highlight: string;
  /** Deep colour for headers and footers. */
  ink: string;
  /** Page background. */
  surface: string;
  /** Slightly tinted background for panels. */
  surfaceAlt: string;
  /** Text on `surface`. */
  onSurface: string;
  onSurfaceMuted: string;
  /** Text on `ink` / `accent`. */
  onInk: string;
  onAccent: string;
  /**
   * Emphasis text sitting ON the accent background.
   *
   * `highlight` is analogous to the brand, which is right for small marks on a
   * light page but invisible on the accent itself - blue on blue. Emphasis here
   * needs warm contrast, the yellow-on-purple move the reference designs use.
   */
  onAccentEmphasis: string;
}

export interface TypePair {
  /** Display face, for headlines. */
  display: string;
  /** Body face, for everything else. */
  body: string;
  /** The Google Fonts family list for an @import. */
  googleFamilies: string[];
  /** Display faces vary a lot in optical size; this nudges the scale. */
  displayScale: number;
}

export type TypeMood = 'playful' | 'clinical' | 'warm' | 'editorial' | 'bold';

export const TYPE_PAIRS: Record<TypeMood, TypePair> = {
  // Rounded and friendly - childcare, paediatrics, anything for families.
  playful: {
    display: "'Baloo 2', system-ui, sans-serif",
    body: "'Nunito', system-ui, sans-serif",
    googleFamilies: [
      'Baloo+2:wght@500;600;700;800',
      'Nunito:wght@400;600;700;800',
    ],
    displayScale: 1.04,
  },
  // Precise and calm - hospitals, diagnostics, specialists.
  clinical: {
    display: "'Poppins', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    googleFamilies: [
      'Poppins:wght@500;600;700;800;900',
      'Inter:wght@400;500;600;700',
    ],
    displayScale: 1,
  },
  warm: {
    display: "'Fredoka', system-ui, sans-serif",
    body: "'Nunito Sans', system-ui, sans-serif",
    googleFamilies: [
      'Fredoka:wght@500;600;700',
      'Nunito+Sans:wght@400;600;700;800',
    ],
    displayScale: 1.02,
  },
  editorial: {
    display: "'Playfair Display', Georgia, serif",
    body: "'Source Sans 3', system-ui, sans-serif",
    googleFamilies: [
      'Playfair+Display:wght@600;700;800;900',
      'Source+Sans+3:wght@400;600;700',
    ],
    displayScale: 0.96,
  },
  bold: {
    display: "'Montserrat', system-ui, sans-serif",
    body: "'Open Sans', system-ui, sans-serif",
    googleFamilies: [
      'Montserrat:wght@700;800;900',
      'Open+Sans:wght@400;600;700',
    ],
    displayScale: 0.98,
  },
};

/** Industry -> the type mood that suits its audience. */
const INDUSTRY_MOOD: Record<string, TypeMood> = {
  healthcare: 'playful',
  education: 'playful',
  fitness: 'bold',
  food: 'warm',
  ecommerce: 'bold',
  finance: 'clinical',
  legal: 'editorial',
  real_estate: 'editorial',
  technology: 'clinical',
  travel: 'warm',
  marketing: 'bold',
};

export function moodForIndustry(
  industry?: string | null,
  subIndustry?: string | null,
): TypeMood {
  const sub = (subIndustry || '').toLowerCase();
  // Paediatrics and similar read as playful even inside clinical sectors.
  if (/paediatric|pediatric|child|kids|nursery|maternity/.test(sub)) {
    return 'playful';
  }
  return INDUSTRY_MOOD[(industry || '').toLowerCase().trim()] || 'clinical';
}

// ---------------------------------------------------------------
// Colour
// ---------------------------------------------------------------

export function hexToHsl(hex: string): Hsl | null {
  const normalised = hex.trim().replace('#', '');
  const full =
    normalised.length === 3
      ? normalised
          .split('')
          .map((c) => c + c)
          .join('')
      : normalised;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const lig = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));

  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  const m = lig - c / 2;
  return (
    '#' +
    rgb
      .map((v) =>
        Math.round((v + m) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

/** Relative luminance, for contrast decisions. */
export function luminance(hex: string): number {
  const hsl = hexToHsl(hex);
  if (!hsl) return 0.5;
  const full = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/** Black or white, whichever reads better on `hex`. */
export function readableOn(hex: string): string {
  return luminance(hex) > 0.45 ? '#111827' : '#ffffff';
}

/**
 * Builds a full palette from one brand colour.
 *
 * The accent is nudged to a usable lightness first: brands routinely supply a
 * near-black or a pastel, and using it directly for buttons and icon chips
 * produces either invisible or unreadable results.
 */
export function buildPalette(brandColor?: string | null): Palette {
  const parsed = brandColor ? hexToHsl(brandColor) : null;
  const base: Hsl = parsed ?? { h: 199, s: 89, l: 48 };

  const accent = hslToHex({
    h: base.h,
    s: Math.max(55, Math.min(92, base.s)),
    l: Math.max(42, Math.min(58, base.l)),
  });

  // Analogous, not complementary: a +150 hue jump on a medical brand looks
  // accidental. +38 reads as a deliberate second brand colour.
  const accentAlt = hslToHex({
    h: base.h + 38,
    s: Math.max(50, Math.min(88, base.s)),
    l: Math.max(46, Math.min(62, base.l)),
  });

  // A pure complement (+180) reads as an accident on most brands - lime on
  // purple, orange on blue. A warm analogous step is legible against the dark
  // footer and still looks chosen.
  const highlight = hslToHex({
    h: base.h + 22,
    s: Math.max(62, Math.min(95, base.s + 10)),
    l: 68,
  });

  const ink = hslToHex({
    h: base.h,
    s: Math.min(48, base.s * 0.6),
    l: 13,
  });

  const surfaceAlt = hslToHex({ h: base.h, s: 42, l: 96 });

  // Warm and light, so it reads against a saturated accent of any hue.
  const onAccentEmphasis = hslToHex({
    h: (base.h + 168) % 360,
    s: 92,
    l: 76,
  });

  return {
    brand: brandColor || accent,
    accent,
    accentAlt,
    onAccentEmphasis,
    highlight,
    ink,
    surface: '#ffffff',
    surfaceAlt,
    onSurface: '#111827',
    onSurfaceMuted: '#5b6472',
    onInk: '#ffffff',
    onAccent: readableOn(accent),
  };
}

/** Appends an alpha channel to a 6-digit hex. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/** Google Fonts @import line for a type pair. */
export function fontImport(pair: TypePair): string {
  const families = pair.googleFamilies
    .map((f) => `family=${f}`)
    .join('&');
  return `@import url('https://fonts.googleapis.com/css2?${families}&display=swap');`;
}
