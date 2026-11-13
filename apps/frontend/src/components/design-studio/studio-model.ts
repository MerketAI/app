'use client';

import { useEffect, useState } from 'react';
import type { SlotValue, TemplateDefinition, VerifiedProfile } from '@jasper/post-renderer';

/**
 * The editable state behind the studio, and the translation from it into the
 * renderer's inputs.
 *
 * Everything here is text, because everything here is typed by a person. The
 * renderer's own input types are structured, and `validateAndInjectFacts` is
 * what sits between the two - which is deliberate: the studio has no privileged
 * path, so what a user previews goes through exactly the checks a generated
 * post does, protected-fact injection included.
 */
export interface StudioState {
  templateId: string;
  format: string;
  brandColor: string;
  profile: VerifiedProfile;
  copy: {
    eyebrow: string;
    headlinePlain: string;
    headlineEmphasis: string;
    subheadline: string;
    servicesTitle: string;
    /** One per line: `Label | icon-id`. */
    services: string;
    cta: string;
    /** One per line: `Label | Value`. */
    timings: string;
    /** One per line. */
    badges: string;
    photoUrl: string;
    photoCredit: string;
    cutoutUrl: string;
  };
}


/**
 * A placeholder photograph, inline so the studio opens with a complete layout.
 *
 * Photo-led templates declare the photograph required with `overflow: reject`,
 * because the composition genuinely depends on it - opening on a validation
 * error teaches nothing. Replace it with a real URL to see the crop and the
 * mask behave.
 */
export const PLACEHOLDER_PHOTO = `data:image/svg+xml;base64,${typeof btoa === 'function' ? btoa(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100" viewBox="0 0 1600 1100">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#cbd5e1"/><stop offset="1" stop-color="#64748b"/>` +
    `</linearGradient></defs>` +
    `<rect width="1600" height="1100" fill="url(#g)"/>` +
    `<circle cx="520" cy="430" r="210" fill="#f8fafc" opacity="0.55"/>` +
    `<rect x="820" y="520" width="620" height="380" rx="36" fill="#0f172a" opacity="0.25"/>` +
    `</svg>`,
) : ''}`;

/**
 * A fictional practice, using reserved `.example` domains so nothing typed here
 * by default can route to a real one.
 */
export const DEFAULT_STATE: StudioState = {
  templateId: 'photo-hero-01',
  format: 'instagram_square',
  brandColor: '#0d9488',
  profile: {
    profileVersion: 'studio-draft',
    clinicName: 'SmileCraft Dental Studio',
    doctorName: 'Dr. Kavita Rao',
    qualifications: 'BDS, MDS (Prosthodontics)',
    specialty: 'Cosmetic and Restorative Dentistry',
    phone: '+91 98765 43210',
    email: 'hello@smilecraft.example',
    website: 'https://www.smilecraft.example',
    address:
      '2nd Floor, 14 Jyoti Nivas College Road, 5th Block, Koramangala, Bengaluru 560095',
  },
  copy: {
    eyebrow: 'Free dental camp',
    headlinePlain: 'Confident smiles',
    headlineEmphasis: 'start here',
    subheadline: 'Gentle, modern dentistry for the whole family in Koramangala.',
    servicesTitle: 'What we do',
    services: [
      'Scaling & polishing | healthicons:dental-hygiene',
      'Teeth whitening | ph:sparkle-fill',
      'Clear aligners | ph:tooth',
      'Implants & crowns | ph:shield-check-fill',
      'Root canal therapy | healthicons:stethoscope',
    ].join('\n'),
    cta: 'Book your check-up',
    timings: ['Mon - Sat | 9:30 am - 8:00 pm', 'Sunday | 10:00 am - 1:00 pm'].join('\n'),
    badges: ['Sterilised', 'Digital X-ray', 'Same-day crowns'].join('\n'),
    photoUrl: PLACEHOLDER_PHOTO,
    photoCredit: 'Placeholder artwork',
    cutoutUrl: '',
  },
};

/** Icon ids used for the contact lines, which no one needs to type. */
export const CONTACT_ICON_IDS: Record<string, string> = {
  phone: 'ph:phone-fill',
  email: 'ph:envelope-simple-fill',
  website: 'ph:globe-simple-fill',
  address: 'ph:map-pin-fill',
  bookingUrl: 'ph:calendar-check-fill',
  clinicName: 'ph:first-aid-kit-fill',
};

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parsePair(line: string): [string, string | undefined] {
  const [left, right] = line.split('|');
  return [left.trim(), right?.trim() || undefined];
}

/** Icon ids referenced by the current state, so they can be fetched up front. */
export function iconIdsFor(state: StudioState): {
  body: string[];
  contact: string[];
} {
  const body = splitLines(state.copy.services)
    .map((line) => parsePair(line)[1])
    .filter((id): id is string => Boolean(id));
  return { body: Array.from(new Set(body)), contact: Object.values(CONTACT_ICON_IDS) };
}

/**
 * Builds campaign content for the slots a template actually declares.
 *
 * Values for undeclared slots are dropped rather than rendered - the renderer
 * warns about them, and carrying them through would put a flyer's consulting
 * hours into a square post that has nowhere to show them.
 */
export function buildContent(
  state: StudioState,
  template: TemplateDefinition,
): Record<string, SlotValue> {
  const values: Record<string, SlotValue> = {};
  const has = (slot: string) => Boolean(template.slots[slot]);
  const text = (slot: string, value: string) => {
    if (has(slot) && value.trim()) values[slot] = { kind: 'text', value: value.trim() };
  };

  if (has('headline')) {
    const runs = [
      state.copy.headlinePlain.trim() ? { text: state.copy.headlinePlain.trim() } : null,
      state.copy.headlineEmphasis.trim()
        ? { text: state.copy.headlineEmphasis.trim(), emphasis: true }
        : null,
    ].filter(Boolean) as { text: string; emphasis?: boolean }[];
    if (runs.length > 0) values.headline = { kind: 'richtext', runs };
  }

  text('eyebrow', state.copy.eyebrow);
  text('subheadline', state.copy.subheadline);
  text('servicesTitle', state.copy.servicesTitle);
  text('cta', state.copy.cta);
  text('photoCredit', state.copy.photoCredit);

  if (has('services')) {
    const items = splitLines(state.copy.services).map((line) => {
      const [label, icon] = parsePair(line);
      return icon ? { label, icon } : { label };
    });
    if (items.length > 0) values.services = { kind: 'list', items };
  }

  // One input per idea, not per slot name. Templates name the same idea
  // differently - trust markers are "badges" on the profile layout and
  // "highlights" on the event one - and a studio with a field per slot name
  // would ask the user to retype the same thing when they switch template.
  const markers = splitLines(state.copy.badges).map((label) => ({ label }));
  if (markers.length > 0) {
    if (has('badges')) values.badges = { kind: 'list', items: markers };
    if (has('highlights')) values.highlights = { kind: 'list', items: markers };
  }

  const rows = splitLines(state.copy.timings).map((line) => {
    const [label, value] = parsePair(line);
    return { label, value: value ?? '' };
  });
  if (rows.length > 0) {
    if (has('timings')) values.timings = { kind: 'keyvalue', items: rows };
    if (has('details')) values.details = { kind: 'keyvalue', items: rows };
  }

  if (has('heroImage') && state.copy.photoUrl.trim()) {
    values.heroImage = {
      kind: 'image',
      assetId: 'studio-hero',
      url: state.copy.photoUrl.trim(),
    };
  }
  if (has('cutout') && state.copy.cutoutUrl.trim()) {
    values.cutout = {
      kind: 'image',
      assetId: 'studio-cutout',
      url: state.copy.cutoutUrl.trim(),
    };
  }

  return values;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

/**
 * Icon sets the studio will fetch.
 *
 * Iconify serves 150-plus sets under varying licences; only permissive ones
 * belong in a customer's printed flyer. This mirrors the backend's allow-list
 * rather than replacing it - the backend remains the authority, and anything
 * generated rather than typed goes through it.
 */
const ALLOWED_ICON_SETS = new Set([
  'healthicons',
  'tabler',
  'ph',
  'lucide',
  'mdi',
]);

// Keyed by id+colour, and holding the in-flight promise rather than the
// result, so two components asking for the same icon before it arrives share
// one request instead of racing.
const iconCache = new Map<string, Promise<string | null>>();

export function isAllowedIconId(id: string): boolean {
  const [prefix, name] = id.split(':');
  return Boolean(prefix && name && ALLOWED_ICON_SETS.has(prefix));
}

function fetchIcon(id: string, color: string): Promise<string | null> {
  const key = `${id}|${color}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  if (!isAllowedIconId(id)) return Promise.resolve(null);

  const [prefix, name] = id.split(':');
  const pending = (async () => {
    try {
      const response = await fetch(
        `https://api.iconify.design/${prefix}/${name}.svg?color=${encodeURIComponent(color)}&height=64`,
      );
      if (!response.ok) return null;
      const svg = (await response.text()).trim();
      return svg.startsWith('<svg') ? svg : null;
    } catch {
      return null;
    }
  })();

  iconCache.set(key, pending);
  // A failed fetch should not be cached forever: a dropped connection while
  // typing would leave the icon permanently missing from the design.
  void pending.then((svg) => {
    if (svg === null) iconCache.delete(key);
  });
  return pending;
}

/**
 * Fetches the icons the current state needs, in the right colours.
 *
 * Colour is baked into the SVG, so it has to be decided before the fetch;
 * `iconPaintPlan` works that out from the surfaces the template declares. An
 * icon that fails to resolve is simply absent - the renderer omits the mark
 * rather than drawing a placeholder, which is better than shipping a broken
 * glyph into a print.
 */
export function useIcons(
  state: StudioState,
  paint: { body: string; contact: string },
): Record<string, string> {
  const [icons, setIcons] = useState<Record<string, string>>({});
  const { body, contact } = iconIdsFor(state);
  const signature = JSON.stringify([body, paint.body, paint.contact]);

  useEffect(() => {
    let live = true;

    (async () => {
      const next: Record<string, string> = {};

      await Promise.all([
        ...body.map(async (id) => {
          const svg = await fetchIcon(id, paint.body);
          // Keyed by id: list items reference the icon they named.
          if (svg) next[id] = svg;
        }),
        ...Object.entries(CONTACT_ICON_IDS).map(async ([field, id]) => {
          const svg = await fetchIcon(id, paint.contact);
          if (svg) next[field] = svg;
        }),
      ]);

      if (live) setIcons(next);
    })();

    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return icons;
}
