/**
 * Layout engine for finished post images, at any size in creative-specs.ts.
 *
 * The picture comes from an image model and never contains text; everything
 * readable is laid out here as HTML, so prices, dates and names are exact.
 * The picture sits in a photo panel cropped around its centre (where image
 * models put the subject), beside or below the text column, so copy never
 * covers a face.
 *
 * Five layout families follow from the canvas ratio: square and portrait
 * (text left, photo right), story (text top, photo below), landscape and
 * banner (compact, vertically centred text, cards in a row, slim footer).
 * Everything is sized in units of the family's base canvas, so any size in
 * a family scales alike, and text keeps out of each placement's safe area.
 *
 * A fit pass (window.__fitDesign, run by RendererService once fonts load)
 * shrinks over-wide lines and then the whole column; if a short banner still
 * cannot hold everything, it drops the least important lines in a fixed
 * order and reports which.
 */
import { CreativeSpec, familyOf, LayoutFamily, resolveSpec, SafeArea } from './creative-specs';

/** The original four formats; still accepted, now mapped to specs. */
export type PostFormat = 'square' | 'portrait' | 'story' | 'landscape';

export const POST_FORMATS: Record<PostFormat, { width: number; height: number; artwork: 'square' }> = {
  square: { width: 1080, height: 1080, artwork: 'square' },
  portrait: { width: 1080, height: 1350, artwork: 'square' },
  story: { width: 1080, height: 1920, artwork: 'square' },
  landscape: { width: 1200, height: 630, artwork: 'square' },
};

export interface PostItem {
  /** Short name, e.g. "LFT". */
  label: string;
  /** Longer description, e.g. "Liver Function Test". */
  detail?: string;
  /** Icon name from ICON_NAMES; picked from the words when omitted. */
  icon?: string;
}

export interface PostCopy {
  headline: string;
  subheading?: string;
  /** The hero figure: a price or offer ("₹599", "50% OFF"). Largest element. */
  price?: string;
  /** One line under the price, e.g. "Take the first step towards better health." */
  priceNote?: string;
  /** Shown as cards with icons. */
  items?: PostItem[];
  /** Small line under the cards, e.g. "Contact us for the complete test list." */
  itemsNote?: string;
  /** Short lines; a leading "50% off" / "FREE" becomes a badge. */
  points?: string[];
  /** Call-to-action button text. */
  cta?: string;
  footer?: string;
  footerLines?: string[];
  finePrint?: string;
}

export interface PostLayoutInput extends PostCopy {
  /** The canvas: a resolved spec, or a legacy format name. */
  spec?: CreativeSpec;
  format?: PostFormat;
  artworkUrl: string;
  businessName?: string;
  colour?: string;
  logoUrl?: string;
  /** 'show' uses logoUrl, 'reserve' keeps the space empty, 'none' drops it. */
  logo?: 'show' | 'reserve' | 'none';
}

const DEEP = '#0b2f4a';
const DEFAULT_COLOUR = '#0f766e';

const esc = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------
// Icons: simple 24px line icons, drawn with currentColor.
// ---------------------------------------------------------------------------

const ICONS: Record<string, string> = {
  liver: '<path d="M3 9c0-3 3-5 7-5 5 0 11 1 11 5 0 3-3 4-6 5-3 1-4 6-7 6-3 0-5-5-5-11z"/><path d="M12 5c-1 3-1 6 1 9"/>',
  kidney: '<path d="M15 3c-4 0-8 3-8 9s4 9 8 9c3 0 5-2 5-5 0-2-2-3-2-4s2-2 2-4c0-3-2-5-5-5z"/><path d="M7 12H3"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/><path d="M4 12h4l2-3 3 6 2-3h5"/>',
  drop: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  glasses: '<circle cx="6.5" cy="14" r="3.5"/><circle cx="17.5" cy="14" r="3.5"/><path d="M10 14h4M3 13 5 6M21 13l-2-7"/>',
  tooth: '<path d="M7 3c-3 0-4 3-3 6 1 2 1 4 1 6 0 3 1 6 3 6s2-5 4-5 2 5 4 5 3-3 3-6c0-2 0-4 1-6 1-3 0-6-3-6-2 0-3 1-5 1S9 3 7 3z"/>',
  flask: '<path d="M9 3h6M10 3v6L4 19a1.5 1.5 0 0 0 1.3 2h13.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
  pill: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m9 8 6 8"/>',
  stethoscope: '<path d="M5 3v6a5 5 0 0 0 10 0V3"/><path d="M10 14v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="12" r="2"/>',
  lungs: '<path d="M12 3v8M12 11c-1 2-3 2-4 1M12 11c1 2 3 2 4 1"/><path d="M8 7C5 8 3 12 3 17c0 2 1 3 3 3 3 0 4-2 4-5V9"/><path d="M16 7c3 1 5 5 5 10 0 2-1 3-3 3-3 0-4-2-4-5V9"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
  bone: '<path d="M17 10c.7.5 1.7.5 2.5-.3a2 2 0 0 0-2.8-2.8 2 2 0 0 0-2.8-2.8c-.8.8-.8 1.8-.3 2.5L7 13c-.7-.5-1.7-.5-2.5.3a2 2 0 0 0 2.8 2.8 2 2 0 0 0 2.8 2.8c.8-.8.8-1.8.3-2.5z"/>',
  thyroid: '<path d="M12 6v12M12 9c-2-3-7-3-7 2 0 4 4 6 7 4M12 9c2-3 7-3 7 2 0 4-4 6-7 4"/>',
  baby: '<circle cx="12" cy="8" r="4"/><path d="M6 21c0-4 3-6 6-6s6 2 6 6"/><path d="M10.5 8h.01M13.5 8h.01"/>',
  shieldcheck: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  pin: '<path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  building: '<path d="M4 21V5l8-2v18M12 8l8 2v11M3 21h18M8 9v.01M8 13v.01M8 17v.01M16 14v.01M16 18v.01"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};

export const ICON_NAMES = Object.keys(ICONS);

const ICON_WORDS: Array<[RegExp, string]> = [
  [/liver|lft|hepat/i, 'liver'],
  [/kidney|kft|renal|creatinine|urea/i, 'kidney'],
  [/cholesterol|lipid|heart|cardi|ecg|bp\b|blood pressure/i, 'heart'],
  [/sugar|glucose|diabet|hba1c|blood|cbc|haemo|hemo/i, 'drop'],
  [/thyroid|tsh|t3|t4/i, 'thyroid'],
  [/eye|vision|retina|cataract|glaucoma/i, 'eye'],
  [/glass|frame|spectacle|lens/i, 'glasses'],
  [/dental|tooth|teeth/i, 'tooth'],
  [/lung|chest|breath|asthma/i, 'lungs'],
  [/brain|neuro|stress|mental/i, 'brain'],
  [/bone|vitamin d|calcium|ortho|joint/i, 'bone'],
  [/child|baby|kid|paediatric|pediatric/i, 'baby'],
  [/medicine|pharmac|tablet|pill/i, 'pill'],
  [/consult|doctor|check ?up|physician/i, 'stethoscope'],
  [/date|sunday|monday|tuesday|wednesday|thursday|friday|saturday|\b\d{1,2} (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i, 'calendar'],
  [/\boff\b|%|discount|offer|save/i, 'tag'],
  [/test|lab|panel|profile|screen/i, 'flask'],
];

export function pickIcon(text: string, given?: string): string {
  if (given && ICONS[given]) return given;
  for (const [pattern, name] of ICON_WORDS) if (pattern.test(text)) return name;
  return 'check';
}

const svg = (name: string, cls = 'ico') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.check}</svg>`;

const footerIcon = (line: string, index: number) =>
  /call|phone|whats\s?app|\+?\d[\d\s-]{6,}|\[phone/i.test(line)
    ? 'phone'
    : /location|address|road|street|nagar|sector|\[location|delhi|mumbai|bengaluru|bangalore|chennai|hyderabad|pune|kolkata/i.test(line)
      ? 'pin'
      : index === 0
        ? 'building'
        : 'check';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Per-family geometry, in units of the family's base canvas. */
interface FamilyGeometry {
  baseW: number;
  baseH: number;
  /** Text column width. */
  col: number;
  /** Photo panel: 'right' as a % of width, or 'bottom' as a height in units. */
  photo: { side: 'right'; pct: number } | { side: 'bottom'; height: number };
  h1: number;
  price: number;
  /** Cards side by side (landscape/banner) instead of stacked. */
  cardsInRow: boolean;
  /** Vertically centre the column (short canvases). */
  centre: boolean;
  /** Footer band height for 1-2 lines / 3+ lines; row footers stay one line. */
  footer: [number, number];
  footerInRow: boolean;
  pad: number;
}

const FAMILIES: Record<LayoutFamily, FamilyGeometry> = {
  square: { baseW: 1080, baseH: 1080, col: 600, photo: { side: 'right', pct: 47 }, h1: 84, price: 168, cardsInRow: false, centre: false, footer: [118, 150], footerInRow: false, pad: 64 },
  portrait: { baseW: 1080, baseH: 1350, col: 600, photo: { side: 'right', pct: 47 }, h1: 84, price: 168, cardsInRow: false, centre: false, footer: [118, 150], footerInRow: false, pad: 64 },
  story: { baseW: 1080, baseH: 1920, col: 952, photo: { side: 'bottom', height: 1000 }, h1: 84, price: 168, cardsInRow: false, centre: false, footer: [118, 150], footerInRow: false, pad: 64 },
  landscape: { baseW: 1200, baseH: 630, col: 600, photo: { side: 'right', pct: 46 }, h1: 52, price: 92, cardsInRow: true, centre: true, footer: [72, 72], footerInRow: true, pad: 64 },
  banner: { baseW: 1920, baseH: 600, col: 1000, photo: { side: 'right', pct: 40 }, h1: 64, price: 110, cardsInRow: true, centre: true, footer: [64, 64], footerInRow: true, pad: 72 },
};

/** The canvas a layout input describes: its spec, a legacy format, or the default. */
export function layoutSpec(input: { spec?: CreativeSpec; format?: PostFormat }): CreativeSpec {
  if (input.spec) return input.spec;
  return resolveSpec({ spec: input.format || 'square' });
}

export function buildPostLayout(input: PostLayoutInput): string {
  const spec = layoutSpec(input);
  const { width, height } = spec;
  const family = spec.family || familyOf(width, height);
  const g = FAMILIES[family];
  const safe: SafeArea = { top: 0, right: 0, bottom: 0, left: 0, ...spec.safe };
  const colour = input.colour || DEFAULT_COLOUR;
  // One unit = this canvas's share of its family's base canvas, so text and
  // spacing scale with whichever side is tighter.
  const u = Math.min(width / g.baseW, height / g.baseH);
  const px = (units: number) => Math.round(units * u);

  const headlineLines = String(input.headline || '').split(/\n|\\n/).map((l) => l.trim()).filter(Boolean);
  const items = (input.items || []).slice(0, 8);
  const cardColumns = g.cardsInRow ? Math.min(Math.max(items.length, 1), family === 'banner' ? 4 : 3) : items.length >= 4 ? 2 : 1;
  const points = (input.points || []).slice(0, 6).map((point) => {
    const badge = point.match(/^\s*(\d{1,3}\s?%|free)\s*(?:off\b)?\s*/i);
    if (!badge) return `<div class="row">${svg(pickIcon(point), 'ico row-ico')}<span>${esc(point.trim())}</span></div>`;
    const rest = point.slice(badge[0].length).trim();
    const label = /off\b/i.test(badge[0]) ? `off ${rest}` : rest;
    return `<div class="row"><span class="badge">${esc(badge[1].toUpperCase().replace(/\s/g, ''))}</span><span>${esc(label)}</span></div>`;
  });
  const footerLines = [...(input.footerLines || []), ...(input.footer ? [input.footer] : [])].filter(Boolean).slice(0, 4);
  const logoMode = input.logo || (input.logoUrl ? 'show' : 'none');
  const hasFooter = footerLines.length > 0 || !!input.finePrint;
  const footerHeight = !hasFooter ? 0 : g.footer[footerLines.length > 2 ? 1 : 0];

  const logo =
    logoMode === 'show' && input.logoUrl
      ? `<div class="logo"><img src="${esc(input.logoUrl)}" alt=""></div>`
      : logoMode === 'reserve'
        ? '<div class="logo"></div>'
        : '';

  // data-drop: the fit pass removes these, lowest number first, only if the
  // column still overflows at the smallest type it allows.
  const column = [
    logo,
    input.businessName ? `<div class="brand" data-drop="5">${esc(input.businessName)}</div>` : '',
    `<h1>${headlineLines.map((l) => `<span class="fit-line">${esc(l)}</span>`).join('')}</h1>`,
    input.subheading ? `<div class="sub" data-drop="4">${svg(pickIcon(input.subheading, /\d/.test(input.subheading) ? 'calendar' : undefined), 'ico sub-ico')}<span>${esc(input.subheading)}</span></div>` : '',
    input.price
      ? `<div class="price-block"><div class="price"><span class="fit-line">${esc(input.price)}</span></div>${input.priceNote ? `<div class="price-note" data-drop="2">${esc(input.priceNote)}</div>` : ''}</div>`
      : input.priceNote ? `<div class="price-note" data-drop="2">${esc(input.priceNote)}</div>` : '',
    items.length
      ? `<div class="cards" data-drop="3">${items
          .map((item) => `<div class="card"><div class="card-ico">${svg(pickIcon(`${item.label} ${item.detail || ''}`, item.icon))}</div><div class="card-text"><div class="card-label">${esc(item.label)}</div>${item.detail ? `<div class="card-detail">${esc(item.detail)}</div>` : ''}</div></div>`)
          .join('')}</div>`
      : '',
    input.itemsNote ? `<div class="items-note" data-drop="1">${esc(input.itemsNote)}</div>` : '',
    points.length ? `<div class="rows" data-drop="3">${points.join('')}</div>` : '',
    input.cta ? `<div class="cta-wrap"><div class="cta"><span>${esc(input.cta)}</span>${svg('arrow', 'ico cta-ico')}</div></div>` : '',
  ].filter(Boolean).join('\n');

  const footer = hasFooter
    ? `<footer><div class="foot-lines">${footerLines
        .map((line, i) => `<div class="foot-line${i === 0 ? ' first' : ''}">${svg(footerIcon(line, i), 'ico foot-ico')}<span>${esc(line)}</span></div>`)
        .join('')}</div>${input.finePrint ? `<div class="fine">${esc(input.finePrint)}</div>` : ''}</footer>`
    : '';

  // Where things go, in canvas pixels, respecting the safe area.
  const left = safe.left + px(g.pad);
  const top = safe.top + px(family === 'story' ? 90 : family === 'landscape' || family === 'banner' ? 36 : 60);
  const footerBottom = family === 'story' ? safe.bottom : 0;
  const colBottom = footerBottom + px(footerHeight) + (g.centre ? px(36) : px(60)) + (family === 'story' ? 0 : safe.bottom);
  const photoPanelWidth = g.photo.side === 'right' ? Math.round((width * g.photo.pct) / 100) : width;
  const colWidth =
    g.photo.side === 'right'
      ? Math.min(px(g.col), width - left - Math.round(photoPanelWidth * 0.82) - safe.right)
      : width - left - px(g.pad) - safe.right;
  const photo =
    g.photo.side === 'bottom'
      ? // Runs to the canvas bottom, behind the footer and the app's reply zone, so nothing is left bare.
        `left:0;right:0;bottom:0;height:${px(g.photo.height)}px;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 22%);mask-image:linear-gradient(180deg,transparent 0,#000 22%)`
      : `top:0;right:0;bottom:${px(footerHeight)}px;width:${photoPanelWidth}px;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 24%);mask-image:linear-gradient(90deg,transparent 0,#000 24%)`;
  // Story text may run into the photo's faded top fifth, never down to the subject's face.
  const colMaxBottom = family === 'story' && g.photo.side === 'bottom'
    ? Math.round(px(g.photo.height) * 0.8)
    : colBottom;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');
:root{--u:${u}px;--c:${colour};--deep:${DEEP};--k:1}
*{box-sizing:border-box}
html,body{margin:0;padding:0;overflow:hidden}
body{width:${width}px;height:${height}px;font-family:Inter,Arial,sans-serif;color:#1f2d3a}
.stage{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--c) 16%, white), transparent 55%),radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--deep) 10%, white), transparent 60%),linear-gradient(160deg,#ffffff,color-mix(in srgb, var(--c) 6%, white))}
.photo{position:absolute;z-index:1;${photo};background:url("${esc(input.artworkUrl)}") center ${family === 'story' ? '30%' : 'center'}/cover no-repeat}
.col{position:absolute;z-index:2;left:${left}px;top:${top}px;bottom:${colMaxBottom}px;width:${colWidth}px;display:flex;flex-direction:column;justify-content:${g.centre ? 'center' : 'flex-start'};gap:calc(var(--u)*${g.centre ? 14 : 22}*var(--k))}
.logo{flex:none;height:calc(var(--u)*80);display:flex;align-items:center}
.logo img{max-height:100%;max-width:calc(var(--u)*260);object-fit:contain}
.brand{font-family:Poppins,sans-serif;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--c);font-size:calc(var(--u)*22*var(--k))}
h1{margin:0;font-family:Poppins,sans-serif;font-weight:800;line-height:1.02;color:var(--deep);font-size:calc(var(--u)*${g.h1}*var(--k));letter-spacing:-.01em}
.fit-line{display:block;white-space:nowrap}
.sub{display:flex;align-items:center;gap:calc(var(--u)*12);font-family:Poppins,sans-serif;font-weight:600;color:var(--c);font-size:calc(var(--u)*28*var(--k))}
.sub-ico{width:calc(var(--u)*30);height:calc(var(--u)*30)}
.price-block{display:flex;flex-direction:column;gap:calc(var(--u)*6)}
.price{font-family:Poppins,sans-serif;font-weight:800;line-height:.95;font-size:calc(var(--u)*${g.price}*var(--k));background:linear-gradient(135deg,var(--c),var(--deep));-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:.04em}
.price-note{font-size:calc(var(--u)*${g.cardsInRow ? 19 : 27}*var(--k));color:#3a4b5a;font-weight:500;line-height:1.3}
.cards{display:grid;grid-template-columns:repeat(${cardColumns},1fr);gap:calc(var(--u)*14*var(--k))}
.card{display:flex;align-items:center;gap:calc(var(--u)*18);background:rgba(255,255,255,.96);border:1px solid color-mix(in srgb, var(--c) 18%, white);border-radius:calc(var(--u)*20);padding:calc(var(--u)*16*var(--k)) calc(var(--u)*20);box-shadow:0 calc(var(--u)*8) calc(var(--u)*24) rgba(11,47,74,.08)}
.card-ico{flex:none;width:calc(var(--u)*62*var(--k));height:calc(var(--u)*62*var(--k));border-radius:50%;display:grid;place-items:center;color:var(--c);background:color-mix(in srgb, var(--c) 12%, white)}
.card-ico .ico{width:58%;height:58%}
.card-label{font-family:Poppins,sans-serif;font-weight:700;color:var(--deep);font-size:calc(var(--u)*27*var(--k));line-height:1.15}
.card-detail{color:#4a5a68;font-size:calc(var(--u)*21*var(--k));line-height:1.25;margin-top:calc(var(--u)*2)}
.in-row .card{flex-direction:column;align-items:flex-start;gap:calc(var(--u)*8);padding:calc(var(--u)*12*var(--k))}
.in-row .card-ico{width:calc(var(--u)*44*var(--k));height:calc(var(--u)*44*var(--k))}
.in-row .card-label{font-size:calc(var(--u)*22*var(--k))}
.in-row .card-detail{font-size:calc(var(--u)*17*var(--k))}
.items-note{color:#4a5a68;font-size:calc(var(--u)*${g.cardsInRow ? 19 : 21}*var(--k));font-style:italic}
.rows{display:grid;gap:calc(var(--u)*12*var(--k))}
.row{display:flex;align-items:center;gap:calc(var(--u)*14);font-size:calc(var(--u)*25*var(--k));color:#1f2d3a;line-height:1.25}
.row-ico{flex:none;width:calc(var(--u)*30);height:calc(var(--u)*30);color:var(--c)}
.badge{flex:none;min-width:calc(var(--u)*92);text-align:center;background:var(--c);color:#fff;font-family:Poppins,sans-serif;font-weight:800;border-radius:calc(var(--u)*12);padding:calc(var(--u)*6) calc(var(--u)*10);font-size:calc(var(--u)*23*var(--k))}
.cta-wrap{flex:none;padding-top:calc(var(--u)*6)}
.cta{display:inline-flex;align-items:center;gap:calc(var(--u)*14);background:linear-gradient(135deg,var(--c),color-mix(in srgb, var(--c) 70%, var(--deep)));color:#fff;font-family:Poppins,sans-serif;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:calc(var(--u)*${g.cardsInRow ? 14 : 20}*var(--k)) calc(var(--u)*${g.cardsInRow ? 28 : 36});font-size:calc(var(--u)*${g.cardsInRow ? 20 : 26}*var(--k));box-shadow:0 calc(var(--u)*10) calc(var(--u)*26) color-mix(in srgb, var(--c) 35%, transparent);white-space:nowrap}
.cta-ico{width:calc(var(--u)*28);height:calc(var(--u)*28)}
footer{position:absolute;z-index:3;left:0;right:0;bottom:${footerBottom}px;height:${px(footerHeight)}px;background:linear-gradient(90deg,var(--deep),color-mix(in srgb, var(--deep) 75%, var(--c)));color:#fff;display:flex;align-items:center;justify-content:space-between;gap:calc(var(--u)*24);padding:0 ${safe.right + px(g.pad)}px 0 ${safe.left + px(g.pad)}px}
.foot-lines{display:flex;flex-wrap:${g.footerInRow ? 'nowrap' : 'wrap'};gap:calc(var(--u)*10) calc(var(--u)*34);align-items:center;max-width:82%;overflow:hidden}
.foot-line{display:flex;align-items:center;gap:calc(var(--u)*10);font-size:calc(var(--u)*${g.footerInRow ? 19 : 22});white-space:nowrap}
.foot-line.first{font-family:Poppins,sans-serif;font-weight:700;font-size:calc(var(--u)*${g.footerInRow ? 19 : 24});${g.footerInRow ? '' : 'width:100%'}}
.foot-ico{width:calc(var(--u)*24);height:calc(var(--u)*24);opacity:.9;flex:none}
.fine{font-size:calc(var(--u)*16);opacity:.75;white-space:nowrap;align-self:${g.footerInRow ? 'center' : 'flex-end'};padding-bottom:${g.footerInRow ? 0 : px(22)}px}
</style></head><body><div class="stage ${family}" data-spec="${esc(spec.id)}">
<div class="photo"></div>
<div class="col${g.cardsInRow ? ' in-row' : ''}">
${column}
</div>
${footer}
</div>
<script>
// Called by the renderer once fonts are ready: make everything fit.
window.__fitDesign = function () {
  var col = document.querySelector('.col');
  var root = document.documentElement;
  var k = 1, dropped = [];
  function overflowing() { return col.scrollHeight > col.clientHeight + 1; }
  function fitLines() {
    document.querySelectorAll('.fit-line').forEach(function (line) {
      line.style.fontSize = '';
      var size = parseFloat(getComputedStyle(line).fontSize);
      var guard = 0;
      while (line.scrollWidth > col.clientWidth && guard++ < 40) {
        size *= 0.95; line.style.fontSize = size + 'px';
      }
    });
  }
  fitLines();
  while (overflowing() && k > 0.55) {
    k = Math.round((k - 0.04) * 100) / 100;
    root.style.setProperty('--k', k);
    fitLines();
  }
  // Still too tall: drop the least important lines, lowest data-drop first.
  var optional = Array.prototype.slice.call(document.querySelectorAll('[data-drop]'))
    .sort(function (a, b) { return a.dataset.drop - b.dataset.drop; });
  while (overflowing() && optional.length) {
    var el = optional.shift();
    dropped.push(el.className);
    el.remove();
    fitLines();
  }
  return { fitted: !overflowing(), zoom: k, dropped: dropped };
};
</script>
</body></html>`;
}
