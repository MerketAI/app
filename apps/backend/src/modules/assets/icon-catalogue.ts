/**
 * Curated icon vocabulary.
 *
 * Two jobs:
 *
 *  1. **Licence safety.** Iconify serves 150+ sets under wildly different
 *     licences, some of which are not safe to ship in a customer's printed
 *     marketing. Only the sets in ALLOWED_ICON_SETS may ever be fetched.
 *
 *  2. **Giving the model a closed vocabulary.** An LLM asked to "pick an icon"
 *     will happily invent `healthicons:baby-smiling-heart`, which 404s. It picks
 *     from CONCEPT_ICONS instead, and anything unknown falls back gracefully.
 */

/** Icon sets we permit, with their licence as reported by Iconify. */
export const ALLOWED_ICON_SETS: Record<string, { title: string; license: string }> =
  {
    healthicons: { title: 'Health Icons', license: 'MIT' },
    tabler: { title: 'Tabler Icons', license: 'MIT' },
    ph: { title: 'Phosphor', license: 'MIT' },
    lucide: { title: 'Lucide', license: 'ISC' },
    mdi: { title: 'Material Design Icons', license: 'Apache-2.0' },
  };

/**
 * Semantic concept -> a concrete Iconify id. Every id here is verified to
 * resolve; see `npm run assets:verify`.
 */
export const CONCEPT_ICONS: Record<string, string> = {
  // --- Healthcare -------------------------------------------------
  vaccination: 'healthicons:syringe-vaccine',
  immunization: 'healthicons:syringe-vaccine',
  newborn: 'healthicons:baby-0306m',
  infant: 'healthicons:baby-0306m',
  child_health: 'healthicons:child-program',
  pediatrics: 'healthicons:child-care',
  growth: 'healthicons:child-program',
  development: 'tabler:chart-line',
  checkup: 'healthicons:stethoscope',
  consultation: 'healthicons:doctor',
  doctor: 'healthicons:doctor',
  nurse: 'healthicons:nurse',
  diagnostics: 'healthicons:microscope',
  lab: 'healthicons:hematology-laboratory',
  heart: 'ph:heartbeat-fill',
  medicine: 'healthicons:medicines',
  emergency: 'healthicons:ambulance',
  hospital: 'healthicons:hospital',
  clinic: 'healthicons:health-worker-form',
  appointment: 'tabler:calendar-heart',
  nutrition: 'healthicons:nutrition',
  dental: 'healthicons:dental-hygiene',
  eye_care: 'healthicons:eye',
  mental_health: 'healthicons:mental-health',
  pregnancy: 'healthicons:pregnant',
  wellness: 'ph:leaf-fill',

  // --- Generic business -------------------------------------------
  quality: 'ph:seal-check-fill',
  trusted: 'ph:shield-check-fill',
  experience: 'ph:medal-fill',
  affordable: 'ph:tag-fill',
  fast: 'ph:lightning-fill',
  support: 'ph:headset-fill',
  team: 'ph:users-three-fill',
  location: 'ph:map-pin-fill',
  phone: 'ph:phone-fill',
  email: 'ph:envelope-simple-fill',
  website: 'ph:globe-simple-fill',
  whatsapp: 'ph:whatsapp-logo-fill',
  clock: 'ph:clock-fill',
  calendar: 'ph:calendar-blank-fill',
  star: 'ph:star-fill',
  check: 'ph:check-circle-fill',
  delivery: 'ph:truck-fill',
  secure: 'ph:lock-key-fill',
  growth_chart: 'ph:chart-line-up-fill',
  education: 'ph:graduation-cap-fill',
  food: 'ph:fork-knife-fill',
  fitness: 'ph:barbell-fill',
  beauty: 'ph:sparkle-fill',
  property: 'ph:house-line-fill',
  finance: 'ph:currency-circle-dollar-fill',
  legal: 'ph:scales-fill',
  travel: 'ph:airplane-tilt-fill',
};

/**
 * Concepts offered per industry, in priority order. Used to suggest icons when
 * the caller has not chosen any, and to steer the model's choices.
 */
export const INDUSTRY_CONCEPTS: Record<string, string[]> = {
  healthcare: [
    'vaccination',
    'newborn',
    'growth',
    'checkup',
    'consultation',
    'diagnostics',
    'appointment',
    'emergency',
  ],
  fitness: ['fitness', 'wellness', 'nutrition', 'team', 'growth_chart', 'clock'],
  education: ['education', 'team', 'quality', 'calendar', 'support', 'star'],
  food: ['food', 'delivery', 'quality', 'fast', 'location', 'star'],
  ecommerce: ['delivery', 'secure', 'affordable', 'quality', 'support', 'star'],
  finance: ['finance', 'secure', 'trusted', 'growth_chart', 'support', 'quality'],
  real_estate: ['property', 'location', 'trusted', 'quality', 'team', 'phone'],
  legal: ['legal', 'trusted', 'experience', 'secure', 'support', 'quality'],
  travel: ['travel', 'location', 'affordable', 'support', 'star', 'calendar'],
  technology: ['fast', 'secure', 'support', 'quality', 'team', 'growth_chart'],
  marketing: ['growth_chart', 'team', 'fast', 'quality', 'star', 'support'],
};

const ICON_ID_PATTERN = /^[a-z0-9-]+:[a-z0-9-]+$/;

/** True when the id is well-formed and its set is on the allow-list. */
export function isAllowedIconId(iconId: string): boolean {
  if (!ICON_ID_PATTERN.test(iconId)) return false;
  return Boolean(ALLOWED_ICON_SETS[iconId.split(':')[0]]);
}

/**
 * Resolves a concept name, a raw Iconify id, or free text to an allowed icon id.
 * Returns null when nothing sensible matches, so callers can omit the icon
 * rather than render a broken one.
 */
export function resolveIconId(input: string): string | null {
  if (!input) return null;
  const raw = input.trim();

  if (raw.includes(':')) {
    return isAllowedIconId(raw) ? raw : null;
  }

  // Strip punctuation as well as whitespace: real service lines are written as
  // prose ("Growth, nutrition and development"), and a trailing comma would
  // otherwise stop a word matching and silently pick the wrong icon.
  const key = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (CONCEPT_ICONS[key]) return CONCEPT_ICONS[key];

  // Then the significant words, in order, e.g. "Complete childhood vaccination
  // schedule" -> vaccination.
  for (const word of key.split('_')) {
    if (word.length > 3 && CONCEPT_ICONS[word]) return CONCEPT_ICONS[word];
  }
  return null;
}

/** Concepts to offer for an industry, falling back to generic business ones. */
export function conceptsForIndustry(industry?: string | null): string[] {
  const key = (industry || '').toLowerCase().trim();
  return (
    INDUSTRY_CONCEPTS[key] || [
      'quality',
      'trusted',
      'experience',
      'support',
      'fast',
      'star',
    ]
  );
}
