import { Palette } from './tokens';

/**
 * Headline treatment.
 *
 * Every reference design colours *part* of a headline - "PEDIATRIC CARE that
 * nurtures EVERY SMILE" across three colours and two weights. A single-colour,
 * single-weight headline is the clearest tell that something was templated
 * rather than designed, so this splits a plain string into emphasis runs.
 */

export interface HeadlineRun {
  text: string;
  /** Which palette role paints this run. */
  role: 'strong' | 'accent' | 'alt' | 'muted';
  /** Rendered on its own line. */
  breakAfter?: boolean;
}

export interface HeadlineSpec {
  runs: HeadlineRun[];
  /** Upper-cased display, as most of these layouts use. */
  uppercase?: boolean;
}

/**
 * Which palette entry paints each run, per background.
 *
 * The surface matters: on an accent-coloured page the "accent" role would
 * paint text in the background colour and disappear entirely. Emphasis there
 * has to come from a different token.
 */
type Surface = 'light' | 'dark' | 'accent';

const ROLE_COLOR: Record<Surface, Record<HeadlineRun['role'], keyof Palette>> = {
  light: {
    strong: 'onSurface',
    accent: 'accent',
    alt: 'accentAlt',
    muted: 'onSurfaceMuted',
  },
  dark: {
    strong: 'onInk',
    accent: 'accent',
    alt: 'highlight',
    muted: 'onSurfaceMuted',
  },
  accent: {
    strong: 'onAccent',
    accent: 'onAccentEmphasis',
    alt: 'surfaceAlt',
    muted: 'surfaceAlt',
  },
};

/**
 * Splits a headline into emphasis runs.
 *
 * Markup form wins when present: `Pediatric care *that nurtures* **every
 * smile**`. Otherwise the line is segmented heuristically - the opening phrase
 * carries the weight, the closing phrase takes the accent - which is the
 * pattern all four reference designs follow.
 */
export function parseHeadline(
  headline: string,
  options: { uppercase?: boolean } = {},
): HeadlineSpec {
  const text = headline.trim();

  if (/[*_]{1,2}[^*_]+[*_]{1,2}/.test(text)) {
    return { runs: parseMarkup(text), uppercase: options.uppercase };
  }

  const words = text.split(/\s+/).filter(Boolean);

  // Short headlines read best as a single strong statement.
  if (words.length <= 3) {
    return {
      runs: [{ text, role: 'strong' }],
      uppercase: options.uppercase,
    };
  }

  // Split roughly 55/45 on a word boundary, breaking the line between them.
  const pivot = Math.max(2, Math.round(words.length * 0.55));
  return {
    runs: [
      { text: words.slice(0, pivot).join(' '), role: 'strong', breakAfter: true },
      { text: words.slice(pivot).join(' '), role: 'accent' },
    ],
    uppercase: options.uppercase,
  };
}

function parseMarkup(text: string): HeadlineRun[] {
  const runs: HeadlineRun[] = [];
  // **bold** -> accent, *italic* -> alt, plain -> strong.
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index).trim();
      if (plain) runs.push({ text: plain, role: 'strong' });
    }
    const token = match[0];
    if (token.startsWith('**')) {
      runs.push({ text: token.slice(2, -2).trim(), role: 'accent' });
    } else {
      runs.push({ text: token.slice(1, -1).trim(), role: 'alt' });
    }
    lastIndex = pattern.lastIndex;
  }

  const tail = text.slice(lastIndex).trim();
  if (tail) runs.push({ text: tail, role: 'strong' });

  return runs.length > 0 ? runs : [{ text, role: 'strong' }];
}

/** Renders a headline spec as HTML spans. */
export function renderHeadline(
  spec: HeadlineSpec,
  palette: Palette,
  options: {
    escape: (s: string) => string;
    /** The background the headline sits on. Defaults to the page surface. */
    surface?: Surface;
  } = { escape: (s) => s },
): string {
  const map = ROLE_COLOR[options.surface || 'light'];
  return spec.runs
    .map((run) => {
      const color = palette[map[run.role]] as string;
      const br = run.breakAfter ? '<br/>' : ' ';
      return `<span style="color:${color}">${options.escape(run.text)}</span>${br}`;
    })
    .join('');
}

/**
 * A type scale that shrinks as the headline lengthens.
 *
 * Fixed-size pages plus tenant-written copy means a headline can be four words
 * or fourteen; without this the long ones swallow the page before the auto-fit
 * pass even runs.
 */
export function headlineScale(headline: string, base = 0.082): number {
  const n = headline.length;
  if (n > 72) return base * 0.62;
  if (n > 52) return base * 0.72;
  if (n > 34) return base * 0.84;
  return base;
}

/** Splits a list into N balanced columns, filling column-wise. */
export function intoColumns<T>(items: T[], columns: number): T[][] {
  const perColumn = Math.ceil(items.length / columns);
  const out: T[][] = [];
  for (let i = 0; i < columns; i++) {
    out.push(items.slice(i * perColumn, (i + 1) * perColumn));
  }
  return out.filter((c) => c.length > 0);
}
