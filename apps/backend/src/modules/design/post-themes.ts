/**
 * Visual themes and art direction for post images.
 *
 * A theme is a complete look: typography, colour treatment, background,
 * card/price/button styles, decoration, and the picture's style, lighting and
 * mood. The provider's brand colour drives every theme, so a clinic's posts
 * stay recognisably theirs whichever theme a post uses.
 *
 * Art direction is the structured brief for the picture (objective, subject,
 * setting, props, lighting, framing, palette, mood, occasion). It is turned
 * into the image prompt here, in a fixed and tested way, rather than relying
 * on one free-text sentence; the healthcare guardrails are always added.
 */
import { buildPalette, hexToHsl, hslToHex, TYPE_PAIRS, TypePair } from './templates/tokens';

export type ThemeId = 'clinical-clean' | 'bold-promo' | 'warm-community' | 'festive' | 'premium-editorial' | 'playful-kids';
export type ImageStyle = 'photographic' | 'illustration' | 'flat-vector' | '3d';
export type Objective = 'promotion' | 'event' | 'awareness' | 'education' | 'greeting' | 'announcement' | 'hiring';

export interface ThemeColours {
  primary: string;
  deep: string;
  accent: string;
  /** Headline / strong text. */
  ink: string;
  text: string;
  muted: string;
  /** Page background (a CSS background value). */
  background: string;
  card: string;
  cardBorder: string;
  iconBg: string;
  priceFrom: string;
  priceTo: string;
  /** Solid price badge background, for themes whose price sits in a block. */
  priceBlock: string;
  priceBlockText: string;
  ctaFrom: string;
  ctaTo: string;
  ctaText: string;
  footerFrom: string;
  footerTo: string;
  footerText: string;
  /** Colour for decorative shapes. */
  decor: string;
  decorAlt: string;
}

export interface PostTheme {
  id: ThemeId;
  label: string;
  description: string;
  /** What it suits, for the assistant. */
  useFor: string;
  type: TypePair;
  headlineCase: 'upper' | 'as-written';
  priceStyle: 'gradient-text' | 'block';
  cardStyle: 'white' | 'tinted' | 'outline';
  ctaStyle: 'pill' | 'block';
  decoration: 'none' | 'rays' | 'blobs' | 'lights' | 'rules' | 'dots';
  /** Dark themes put light text on a dark background. */
  dark: boolean;
  image: { style: ImageStyle; lighting: string; mood: string; palette: string };
  colours(brand: string): ThemeColours;
}

const mix = (hex: string, h: number, s: number, l: number) => {
  const base = hexToHsl(hex) || { h: 175, s: 70, l: 30 };
  return hslToHex({ h: (base.h + h + 360) % 360, s, l });
};

export const THEMES: Record<ThemeId, PostTheme> = {
  'clinical-clean': {
    id: 'clinical-clean',
    label: 'Clinical clean',
    description: 'White space, brand teal and deep blue, crisp sans-serif, realistic photography.',
    useFor: 'Diagnostics, check-up packages, services, general clinic posts. The safe default.',
    type: TYPE_PAIRS.clinical,
    headlineCase: 'as-written',
    priceStyle: 'gradient-text',
    cardStyle: 'white',
    ctaStyle: 'pill',
    decoration: 'none',
    dark: false,
    image: { style: 'photographic', lighting: 'soft diffused daylight, bright and airy', mood: 'calm, trustworthy, reassuring', palette: 'white, soft teal and pale blue' },
    colours(brand) {
      const p = buildPalette(brand);
      return {
        primary: brand, deep: '#0b2f4a', accent: p.accentAlt, ink: '#0b2f4a', text: '#1f2d3a', muted: '#4a5a68',
        background: `radial-gradient(circle at 0% 0%, ${mix(brand, 0, 45, 92)}, transparent 55%), radial-gradient(circle at 100% 100%, #e3ecf3, transparent 60%), linear-gradient(160deg, #ffffff, ${mix(brand, 0, 35, 97)})`,
        card: 'rgba(255,255,255,.96)', cardBorder: mix(brand, 0, 40, 88), iconBg: mix(brand, 0, 45, 93),
        priceFrom: brand, priceTo: '#0b2f4a', priceBlock: brand, priceBlockText: '#fff',
        ctaFrom: brand, ctaTo: mix(brand, 0, 70, 22), ctaText: '#fff',
        footerFrom: '#0b2f4a', footerTo: mix(brand, 0, 55, 22), footerText: '#fff',
        decor: mix(brand, 0, 45, 85), decorAlt: '#d7e4ee',
      };
    },
  },

  'bold-promo': {
    id: 'bold-promo',
    label: 'Bold promo',
    description: 'Strong colour blocks, uppercase headline, the price in a solid badge, energetic photography.',
    useFor: 'Offers, discounts, limited-time packages, anything where the price or offer must shout.',
    type: TYPE_PAIRS.bold,
    headlineCase: 'upper',
    priceStyle: 'block',
    cardStyle: 'white',
    ctaStyle: 'block',
    decoration: 'rays',
    dark: false,
    image: { style: 'photographic', lighting: 'bright high-key light, crisp and vivid', mood: 'energetic, confident, upbeat', palette: 'bright white with bold brand colour accents' },
    colours(brand) {
      const p = buildPalette(brand);
      // Amber reads as "offer" on any brand hue; a computed complement turned teal into hot pink.
      const warm = '#ffb703';
      return {
        primary: brand, deep: p.ink, accent: warm, ink: p.ink, text: '#1b2430', muted: '#4b5563',
        background: `linear-gradient(135deg, #ffffff 0%, #ffffff 55%, ${mix(brand, 0, 60, 90)} 55%, ${mix(brand, 0, 55, 84)} 100%)`,
        card: '#ffffff', cardBorder: mix(brand, 0, 50, 86), iconBg: mix(brand, 0, 60, 92),
        priceFrom: brand, priceTo: p.ink, priceBlock: warm, priceBlockText: '#1b1405',
        ctaFrom: p.ink, ctaTo: p.ink, ctaText: '#fff',
        footerFrom: brand, footerTo: mix(brand, 0, 70, 28), footerText: '#fff',
        decor: mix(brand, 0, 70, 80), decorAlt: '#ffe3a3',
      };
    },
  },

  'warm-community': {
    id: 'warm-community',
    label: 'Warm community',
    description: 'Cream background, warm peach and brand tones, rounded friendly type, warm editorial illustration.',
    useFor: 'Free camps, health drives, community events, awareness for families and elders.',
    type: TYPE_PAIRS.warm,
    headlineCase: 'as-written',
    priceStyle: 'gradient-text',
    cardStyle: 'tinted',
    ctaStyle: 'pill',
    decoration: 'blobs',
    dark: false,
    image: { style: 'illustration', lighting: 'warm golden light', mood: 'welcoming, caring, hopeful', palette: 'cream, warm peach, terracotta and soft brand teal' },
    colours(brand) {
      const peach = '#f4a97f';
      return {
        primary: brand, deep: '#3b2a24', accent: peach, ink: '#3b2a24', text: '#3d332e', muted: '#6b5d55',
        background: `radial-gradient(circle at 10% 10%, #ffe9da, transparent 50%), radial-gradient(circle at 90% 85%, ${mix(brand, 0, 40, 88)}, transparent 55%), #fff8f0`,
        card: '#fffdf9', cardBorder: '#f2dfd0', iconBg: '#fde7da',
        priceFrom: '#e07548', priceTo: '#a8431f', priceBlock: '#d9653b', priceBlockText: '#fff',
        ctaFrom: '#d9653b', ctaTo: '#c2502b', ctaText: '#fff',
        footerFrom: '#3b2a24', footerTo: '#55392f', footerText: '#fff4ec',
        decor: '#ffd9c2', decorAlt: mix(brand, 0, 40, 84),
      };
    },
  },

  festive: {
    id: 'festive',
    label: 'Festive',
    description: 'Rich deep background with gold and warm accents, glowing lights, elegant display type, warm festive illustration.',
    useFor: 'Festival and occasion greetings (Diwali, Holi, Eid, Christmas, Pongal, Independence Day, New Year), celebrations.',
    type: TYPE_PAIRS.editorial,
    headlineCase: 'as-written',
    priceStyle: 'gradient-text',
    cardStyle: 'outline',
    ctaStyle: 'pill',
    decoration: 'lights',
    dark: true,
    image: { style: 'illustration', lighting: 'warm glowing festive light, soft bokeh', mood: 'joyful, celebratory, warm', palette: 'deep maroon and indigo with gold, saffron and warm amber' },
    colours(brand) {
      const gold = '#f2c46d';
      return {
        primary: gold, deep: '#1d0f2e', accent: '#ff9f43', ink: '#fff6e3', text: '#f6e9d3', muted: '#d9c6a8',
        background: `radial-gradient(circle at 15% 15%, rgba(255,170,80,.28), transparent 45%), radial-gradient(circle at 85% 90%, ${mix(brand, 0, 55, 30)}55, transparent 55%), linear-gradient(160deg, #3a0f2e, #1d0f2e 60%, #12082a)`,
        card: 'rgba(255,255,255,.06)', cardBorder: 'rgba(242,196,109,.55)', iconBg: 'rgba(242,196,109,.16)',
        priceFrom: '#ffe3a1', priceTo: gold, priceBlock: gold, priceBlockText: '#1d0f2e',
        ctaFrom: '#f7d27f', ctaTo: '#e7a83e', ctaText: '#2a1205',
        footerFrom: 'rgba(0,0,0,.35)', footerTo: 'rgba(0,0,0,.2)', footerText: '#fff1d6',
        decor: '#f2c46d', decorAlt: '#ff9f43',
      };
    },
  },

  'premium-editorial': {
    id: 'premium-editorial',
    label: 'Premium editorial',
    description: 'Ivory background, deep navy and muted gold, serif headlines, refined photography, thin rules.',
    useFor: 'Premium and executive packages, specialist services, advanced procedures, doctor expertise.',
    type: TYPE_PAIRS.editorial,
    headlineCase: 'as-written',
    priceStyle: 'gradient-text',
    cardStyle: 'outline',
    ctaStyle: 'pill',
    decoration: 'rules',
    dark: false,
    image: { style: 'photographic', lighting: 'soft window light, refined and subtle', mood: 'premium, calm, expert', palette: 'ivory, warm grey, deep navy with muted gold' },
    colours() {
      const navy = '#16233b';
      const gold = '#a8834a';
      return {
        primary: gold, deep: navy, accent: gold, ink: navy, text: '#2c3442', muted: '#626a77',
        background: 'radial-gradient(circle at 0% 0%, #fffdf8, transparent 50%), linear-gradient(160deg, #faf6ee, #f1ebe0)',
        card: 'rgba(255,255,255,.55)', cardBorder: '#cdb68f', iconBg: '#efe6d6',
        priceFrom: navy, priceTo: '#3a4a6b', priceBlock: navy, priceBlockText: '#f4e7cf',
        ctaFrom: navy, ctaTo: '#24365a', ctaText: '#f4e7cf',
        footerFrom: navy, footerTo: '#1f2f4f', footerText: '#efe3cc',
        decor: '#cdb68f', decorAlt: '#e6dac4',
      };
    },
  },

  'playful-kids': {
    id: 'playful-kids',
    label: 'Playful kids',
    description: 'Pastel background, bright cheerful accents, rounded type, soft 3D clay-style art.',
    useFor: 'Paediatrics, vaccination drives, school health camps, anything for children and parents.',
    type: TYPE_PAIRS.playful,
    headlineCase: 'as-written',
    priceStyle: 'block',
    cardStyle: 'tinted',
    ctaStyle: 'pill',
    decoration: 'dots',
    dark: false,
    image: { style: '3d', lighting: 'soft even studio light', mood: 'cheerful, gentle, safe', palette: 'pastel mint, sky blue, sunny yellow and coral' },
    colours(brand) {
      const yellow = '#ffd166';
      const coral = '#ff7b7b';
      return {
        primary: brand, deep: '#24315e', accent: coral, ink: '#24315e', text: '#2e3a5c', muted: '#5b6688',
        background: `radial-gradient(circle at 12% 10%, #fff3c4, transparent 40%), radial-gradient(circle at 90% 20%, #ffd9e0, transparent 40%), radial-gradient(circle at 70% 95%, ${mix(brand, 0, 55, 86)}, transparent 50%), #f3fbff`,
        card: '#ffffff', cardBorder: '#dfe9ff', iconBg: '#fff1c7',
        priceFrom: coral, priceTo: '#e85d75', priceBlock: yellow, priceBlockText: '#24315e',
        ctaFrom: coral, ctaTo: '#ef5d6d', ctaText: '#fff',
        footerFrom: '#24315e', footerTo: '#33427a', footerText: '#fff',
        decor: yellow, decorAlt: coral,
      };
    },
  },
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

/**
 * A theme when the assistant does not name one: festive for greetings,
 * playful for children, premium for premium/specialist, bold for priced
 * offers, warm for camps and community, otherwise clinical.
 */
export function pickTheme(context: { theme?: string; objective?: string; occasion?: string; text?: string; hasPrice?: boolean }): ThemeId {
  if (context.theme && THEMES[context.theme as ThemeId]) return context.theme as ThemeId;
  const text = `${context.text || ''} ${context.occasion || ''}`.toLowerCase();
  if (context.objective === 'greeting' || context.occasion || /diwali|deepavali|holi|eid|christmas|pongal|onam|navratri|durga puja|new year|independence day|republic day|raksha|festival/.test(text)) return 'festive';
  if (/child|kid|paediatr|pediatr|vaccin|baby|infant|school|newborn/.test(text)) return 'playful-kids';
  if (/premium|executive|advanced|specialist|luxury|cosmetic|comprehensive/.test(text)) return 'premium-editorial';
  if (context.hasPrice && (context.objective === 'promotion' || /\boff\b|%|discount|offer|sale|deal/.test(text))) return 'bold-promo';
  if (context.objective === 'event' || context.objective === 'awareness' || /camp|community|drive|free check|awareness|walk|marathon/.test(text)) return 'warm-community';
  return 'clinical-clean';
}

// ---------------------------------------------------------------------------
// Art direction
// ---------------------------------------------------------------------------

export interface ArtDirection {
  objective?: Objective;
  audience?: string;
  tone?: string;
  /** Overrides the theme's picture style. */
  style?: ImageStyle;
  /** Who or what the picture shows. Never a named real person. */
  subject: string;
  setting?: string;
  props?: string[];
  lighting?: string;
  framing?: 'waist-up' | 'close-up' | 'full-body' | 'object' | 'scene';
  palette?: string;
  mood?: string;
  /** Festival or occasion, e.g. "Diwali". */
  occasion?: string;
}

const FRAMING: Record<string, string> = {
  'waist-up': 'framed from the waist up',
  'close-up': 'a close, head-and-shoulders framing',
  'full-body': 'a full-length framing with space around the subject',
  object: 'a still life, objects arranged with breathing room',
  scene: 'a wide scene with a clear focal point in the middle',
};

/** Lowercases free text so a descriptive "White Coat" is not mistaken for a name downstream. */
const plain = (value?: string) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * The picture brief, as a scene description for the image model. Style,
 * no-text and no-likeness rules are added by ImageGenerationService; this adds
 * the art direction, the Indian context and the healthcare avoid-list.
 * `subject` should already have names removed (sanitiseSubject) - it is
 * lowercased here too.
 */
export function composeArtPrompt(direction: ArtDirection, theme: PostTheme): string {
  const parts: string[] = [];
  let scene = plain(direction.subject);
  if (direction.setting) scene += `, in ${plain(direction.setting)}`;
  if (direction.props?.length) scene += `, with ${direction.props.map(plain).filter(Boolean).join(', ')}`;
  parts.push(`${scene}.`);
  parts.push(`Framing: ${FRAMING[direction.framing || ''] || FRAMING['waist-up']}.`);
  parts.push(`Lighting: ${plain(direction.lighting) || theme.image.lighting}.`);
  parts.push(`Mood: ${[plain(direction.mood) || theme.image.mood, plain(direction.tone)].filter(Boolean).join(', ')}.`);
  parts.push(`Colour palette: ${plain(direction.palette) || theme.image.palette}.`);
  if (direction.occasion) parts.push(`Occasion: ${plain(direction.occasion)}, with tasteful, culturally accurate details.`);
  if (direction.audience) parts.push(`Made for: ${plain(direction.audience)}.`);
  parts.push('Set in india; any people are of south asian appearance, modestly dressed, generic and non-identifiable.');
  parts.push('Avoid: needles in skin, blood, wounds, surgery close-ups, distressing or frightening medical imagery, brand logos.');
  return parts.join(' ');
}
