/**
 * Layout engine for finished post images.
 *
 * The picture comes from an image model and never contains text; everything
 * readable is laid out here as HTML, so prices, dates and names are exact.
 * The text column sits on a soft white fade on the left (top, for stories)
 * and the picture's subject is drawn on the opposite side, so copy never
 * covers a face. A fit pass (window.__fitDesign, run by RendererService once
 * fonts load) shrinks lines that are too wide and the column if it is too
 * tall, instead of letting anything overflow.
 */

export type PostFormat = 'square' | 'portrait' | 'story' | 'landscape';

/**
 * Every format uses a square picture, shown in a photo panel and cropped
 * around its centre - where image models reliably put the subject, whatever
 * the prompt says about placement. It also means one picture serves every
 * size of a campaign without being generated again.
 */
export const POST_FORMATS: Record<PostFormat, { width: number; height: number; artwork: 'square' | 'portrait' | 'landscape' }> = {
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

export function buildPostLayout(input: PostLayoutInput): string {
  const format = POST_FORMATS[input.format || 'square'] ? input.format || 'square' : 'square';
  const { width, height } = POST_FORMATS[format];
  const colour = input.colour || DEFAULT_COLOUR;
  const story = format === 'story';
  const landscape = format === 'landscape';
  // Everything is sized in units of 1/1080 of the width, so formats scale alike.
  const u = width / 1080;

  const headlineLines = String(input.headline || '').split(/\n|\\n/).map((l) => l.trim()).filter(Boolean);
  const items = (input.items || []).slice(0, 8);
  const twoColumns = items.length >= 4;
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

  const logo =
    logoMode === 'show' && input.logoUrl
      ? `<div class="logo"><img src="${esc(input.logoUrl)}" alt=""></div>`
      : logoMode === 'reserve'
        ? '<div class="logo"></div>'
        : '';

  const column = [
    logo,
    input.businessName ? `<div class="brand">${esc(input.businessName)}</div>` : '',
    `<h1>${headlineLines.map((l) => `<span class="fit-line">${esc(l)}</span>`).join('')}</h1>`,
    input.subheading ? `<div class="sub">${svg(pickIcon(input.subheading, /\d/.test(input.subheading) ? 'calendar' : undefined), 'ico sub-ico')}<span>${esc(input.subheading)}</span></div>` : '',
    input.price
      ? `<div class="price-block"><div class="price"><span class="fit-line">${esc(input.price)}</span></div>${input.priceNote ? `<div class="price-note">${esc(input.priceNote)}</div>` : ''}</div>`
      : input.priceNote ? `<div class="price-note">${esc(input.priceNote)}</div>` : '',
    items.length
      ? `<div class="cards${twoColumns ? ' two' : ''}">${items
          .map((item) => `<div class="card"><div class="card-ico">${svg(pickIcon(`${item.label} ${item.detail || ''}`, item.icon))}</div><div class="card-text"><div class="card-label">${esc(item.label)}</div>${item.detail ? `<div class="card-detail">${esc(item.detail)}</div>` : ''}</div></div>`)
          .join('')}</div>`
      : '',
    items.length && input.itemsNote ? `<div class="items-note">${esc(input.itemsNote)}</div>` : '',
    points.length ? `<div class="rows">${points.join('')}</div>` : '',
    !items.length && input.itemsNote ? `<div class="items-note">${esc(input.itemsNote)}</div>` : '',
    input.cta ? `<div class="cta-wrap"><div class="cta"><span>${esc(input.cta)}</span>${svg('arrow', 'ico cta-ico')}</div></div>` : '',
  ].filter(Boolean).join('\n');

  const footer = hasFooter
    ? `<footer><div class="foot-lines">${footerLines
        .map((line, i) => `<div class="foot-line${i === 0 ? ' first' : ''}">${svg(footerIcon(line, i), 'ico foot-ico')}<span>${esc(line)}</span></div>`)
        .join('')}</div>${input.finePrint ? `<div class="fine">${esc(input.finePrint)}</div>` : ''}</footer>`
    : '';

  // Text column width, per format (in 1/1080-width units).
  const columnWidth = story ? 952 : landscape ? 600 : 600;
  // Landscape is short: a one-row footer, cards side by side.
  const footerHeight = !hasFooter ? 0 : landscape ? 72 : footerLines.length > 2 ? 150 : 118;
  // The photo panel: right side, or the lower part for stories. Its inner edge
  // fades into the background so there is no hard seam.
  const photo = story
    ? `left:0;right:0;bottom:calc(var(--u)*${footerHeight});height:calc(var(--u)*760);-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 26%);mask-image:linear-gradient(180deg,transparent 0,#000 26%)`
    : `top:0;right:0;bottom:calc(var(--u)*${footerHeight});width:${landscape ? 46 : 47}%;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 24%);mask-image:linear-gradient(90deg,transparent 0,#000 24%)`;
  const columnMaxHeight = story ? 1080 : height / u - footerHeight - (landscape ? 70 : 120);
  const cardColumns = landscape ? Math.min(Math.max(items.length, 1), 3) : twoColumns ? 2 : 1;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');
:root{--u:${u}px;--c:${colour};--deep:${DEEP};--k:1}
*{box-sizing:border-box}
html,body{margin:0;padding:0;overflow:hidden}
body{width:${width}px;height:${height}px;font-family:Inter,Arial,sans-serif;color:#1f2d3a}
.stage{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--c) 16%, white), transparent 55%),radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--deep) 10%, white), transparent 60%),linear-gradient(160deg,#ffffff,color-mix(in srgb, var(--c) 6%, white))}
.photo{position:absolute;z-index:1;${photo};background:url("${esc(input.artworkUrl)}") center ${story ? '30%' : 'center'}/cover no-repeat}
.col{position:absolute;z-index:2;left:calc(var(--u)*64);top:calc(var(--u)*${story ? 90 : 60});width:calc(var(--u)*${columnWidth});max-height:calc(var(--u)*${columnMaxHeight});display:flex;flex-direction:column;gap:calc(var(--u)*22*var(--k))}
.logo{height:calc(var(--u)*80);display:flex;align-items:center}
.logo img{max-height:100%;max-width:calc(var(--u)*260);object-fit:contain}
.brand{font-family:Poppins,sans-serif;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--c);font-size:calc(var(--u)*22*var(--k))}
h1{margin:0;font-family:Poppins,sans-serif;font-weight:800;line-height:1.02;color:var(--deep);font-size:calc(var(--u)*${landscape ? 52 : 84}*var(--k));letter-spacing:-.01em}
.fit-line{display:block;white-space:nowrap}
.sub{display:flex;align-items:center;gap:calc(var(--u)*12);font-family:Poppins,sans-serif;font-weight:600;color:var(--c);font-size:calc(var(--u)*28*var(--k))}
.price-block{display:flex;flex-direction:column;gap:calc(var(--u)*6)}
.price{font-family:Poppins,sans-serif;font-weight:800;line-height:.95;font-size:calc(var(--u)*${landscape ? 92 : 168}*var(--k));background:linear-gradient(135deg,var(--c),var(--deep));-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:.04em}
.price-note{font-size:calc(var(--u)*27*var(--k));color:#3a4b5a;font-weight:500;line-height:1.3}
.cards{display:grid;grid-template-columns:repeat(${cardColumns},1fr);gap:calc(var(--u)*14*var(--k))}
.landscape .col{top:calc(var(--u)*36);gap:calc(var(--u)*14*var(--k))}
.landscape .card{flex-direction:column;align-items:flex-start;gap:calc(var(--u)*8);padding:calc(var(--u)*12*var(--k))}
.landscape .card-ico{width:calc(var(--u)*44*var(--k));height:calc(var(--u)*44*var(--k))}
.landscape .card-label{font-size:calc(var(--u)*22*var(--k))}
.landscape .card-detail{font-size:calc(var(--u)*17*var(--k))}
.landscape .price-note,.landscape .items-note{font-size:calc(var(--u)*19*var(--k))}
.landscape .cta{padding:calc(var(--u)*14*var(--k)) calc(var(--u)*28);font-size:calc(var(--u)*20*var(--k))}
.landscape .foot-lines{flex-wrap:nowrap}
.landscape .foot-line.first{width:auto}
.landscape .foot-line,.landscape .foot-line.first{font-size:calc(var(--u)*19)}
.card{display:flex;align-items:center;gap:calc(var(--u)*18);background:rgba(255,255,255,.96);border:1px solid color-mix(in srgb, var(--c) 18%, white);border-radius:calc(var(--u)*20);padding:calc(var(--u)*16*var(--k)) calc(var(--u)*20);box-shadow:0 calc(var(--u)*8) calc(var(--u)*24) rgba(11,47,74,.08)}
.card-ico{flex:none;width:calc(var(--u)*62*var(--k));height:calc(var(--u)*62*var(--k));border-radius:50%;display:grid;place-items:center;color:var(--c);background:color-mix(in srgb, var(--c) 12%, white)}
.card-ico .ico{width:58%;height:58%}
.card-label{font-family:Poppins,sans-serif;font-weight:700;color:var(--deep);font-size:calc(var(--u)*27*var(--k));line-height:1.15}
.card-detail{color:#4a5a68;font-size:calc(var(--u)*21*var(--k));line-height:1.25;margin-top:calc(var(--u)*2)}
.items-note{color:#4a5a68;font-size:calc(var(--u)*21*var(--k));font-style:italic}
.rows{display:grid;gap:calc(var(--u)*12*var(--k))}
.row{display:flex;align-items:center;gap:calc(var(--u)*14);font-size:calc(var(--u)*25*var(--k));color:#1f2d3a;line-height:1.25}
.row-ico{flex:none;width:calc(var(--u)*30);height:calc(var(--u)*30);color:var(--c)}
.badge{flex:none;min-width:calc(var(--u)*92);text-align:center;background:var(--c);color:#fff;font-family:Poppins,sans-serif;font-weight:800;border-radius:calc(var(--u)*12);padding:calc(var(--u)*6) calc(var(--u)*10);font-size:calc(var(--u)*23*var(--k))}
.sub-ico{width:calc(var(--u)*30);height:calc(var(--u)*30)}
.cta-wrap{padding-top:calc(var(--u)*6)}
.cta{display:inline-flex;align-items:center;gap:calc(var(--u)*14);background:linear-gradient(135deg,var(--c),color-mix(in srgb, var(--c) 70%, var(--deep)));color:#fff;font-family:Poppins,sans-serif;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:calc(var(--u)*20*var(--k)) calc(var(--u)*36);font-size:calc(var(--u)*26*var(--k));box-shadow:0 calc(var(--u)*10) calc(var(--u)*26) color-mix(in srgb, var(--c) 35%, transparent);white-space:nowrap}
.cta-ico{width:calc(var(--u)*28);height:calc(var(--u)*28)}
footer{position:absolute;z-index:3;left:0;right:0;bottom:0;height:calc(var(--u)*${footerHeight});background:linear-gradient(90deg,var(--deep),color-mix(in srgb, var(--deep) 75%, var(--c)));color:#fff;display:flex;align-items:center;justify-content:space-between;gap:calc(var(--u)*24);padding:0 calc(var(--u)*64)}
.foot-lines{display:flex;flex-wrap:wrap;gap:calc(var(--u)*10) calc(var(--u)*34);align-items:center;max-width:82%}
.foot-line{display:flex;align-items:center;gap:calc(var(--u)*10);font-size:calc(var(--u)*22);white-space:nowrap}
.foot-line.first{font-family:Poppins,sans-serif;font-weight:700;font-size:calc(var(--u)*24);width:100%}
.foot-ico{width:calc(var(--u)*24);height:calc(var(--u)*24);opacity:.9}
.fine{font-size:calc(var(--u)*16);opacity:.75;white-space:nowrap;align-self:flex-end;padding-bottom:calc(var(--u)*22)}
</style></head><body><div class="stage ${format}">
<div class="photo"></div>
<div class="col">
${column}
</div>
${footer}
</div>
<script>
// Called by the renderer once fonts are ready: shrink what does not fit.
window.__fitDesign = function () {
  var col = document.querySelector('.col');
  var root = document.documentElement;
  var k = 1;
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
  while (col.scrollHeight > col.clientHeight + 1 && k > 0.6) {
    k = Math.round((k - 0.04) * 100) / 100;
    root.style.setProperty('--k', k);
    fitLines();
  }
  return { fitted: col.scrollHeight <= col.clientHeight + 1, zoom: k };
};
</script>
</body></html>`;
}
