import type { PostCopy } from './post-layout';

/**
 * Template placeholders such as "[Phone Number]", "[Handle]", "{website}" or
 * "<your number>". A model writes them when it lacks a detail; printed on a flyer
 * they look broken, so they never reach an image.
 */
const PLACEHOLDER = /\[[^\]\n]{1,40}\]|\{[^}\n]{1,40}\}|<[^>\n]{1,40}>/g;

/** Words that mean nothing on their own once the detail after them is gone. */
const BARE = /^(follow us( on)?|call( us)?|phone|tel|mobile|whatsapp|email|e-mail|website|web|visit( us)?|book( at| on)?|instagram|insta|facebook|fb|x|twitter|linkedin|youtube|page link|handle)$/i;

/**
 * One segment between separators, after its placeholder was removed: "Call:" or
 * "Instagram" alone is dropped; "Follow us: Instagram" loses both.
 */
function segment(s: string): string {
  let out = s.replace(/\s{2,}/g, ' ').trim().replace(/[,;:\-–]+$/, '').trim();
  // "Follow us: Instagram" → nothing left worth printing.
  const parts = out.split(/\s*:\s*/);
  if (parts.every((p) => !p || BARE.test(p))) return '';
  out = parts.filter((p) => p).join(': ');
  return BARE.test(out) ? '' : out;
}

/** Cleans each "|" / "·" / "•" segment of a line, keeping the ones that still say something. */
const tidy = (s: string) =>
  s
    .split(/\s*[|·•]\s*/)
    .map(segment)
    .filter(Boolean)
    .join(' | ');

function clean(value: string | undefined, removed: Set<string>): string | undefined {
  if (!value) return value;
  const found = value.match(PLACEHOLDER);
  if (!found) return value;
  found.forEach((p) => removed.add(p));
  return tidy(value.replace(PLACEHOLDER, '')) || undefined;
}

/**
 * The copy with every placeholder removed, and the placeholders that were found, so
 * the caller can tell the provider which details are missing.
 */
export function stripPlaceholders<T extends PostCopy>(copy: T): { copy: T; removed: string[] } {
  const removed = new Set<string>();
  const list = (values?: string[]) => values?.map((v) => clean(v, removed)).filter((v): v is string => !!v);
  const out: T = {
    ...copy,
    headline: clean(copy.headline, removed) ?? '',
    subheading: clean(copy.subheading, removed),
    price: clean(copy.price, removed),
    priceNote: clean(copy.priceNote, removed),
    itemsNote: clean(copy.itemsNote, removed),
    cta: clean(copy.cta, removed),
    footer: clean(copy.footer, removed),
    finePrint: clean(copy.finePrint, removed),
    points: list(copy.points),
    footerLines: list(copy.footerLines),
    items: copy.items
      ?.map((i) => ({ ...i, label: clean(i.label, removed) ?? '', detail: clean(i.detail, removed) }))
      .filter((i) => i.label),
  };
  return { copy: out, removed: [...removed] };
}
