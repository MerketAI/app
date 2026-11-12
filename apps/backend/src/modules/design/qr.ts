import * as QRCode from 'qrcode';
import type { CreativeSpec } from './creative-specs';

/**
 * "Scan to book" QR codes on post images. The code points at the provider's
 * Quick Care booking page, tagged with utm_* so a booking can be traced back to
 * the post it came from.
 */

export const QR_LABEL = 'Scan to book';

/** The booking URL with campaign tags; any existing utm_* on it are replaced. */
export function trackedUrl(base: string, tags: { source: string; medium: string; campaign?: string }): string {
  const url = new URL(base);
  for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_')) url.searchParams.delete(key);
  url.searchParams.set('utm_source', tags.source);
  url.searchParams.set('utm_medium', tags.medium);
  if (tags.campaign) url.searchParams.set('utm_campaign', tags.campaign);
  return url.toString();
}

/** A campaign tag from a library folder: "campaigns/eye-camp-nov-2026" -> "eye-camp-nov-2026". */
export function campaignFromFolder(folder?: string): string | undefined {
  const last = (folder || '').split('/').filter(Boolean).pop();
  const slug = (last || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || undefined;
}

/** Only an absolute http(s) URL becomes a code; anything else is refused, not encoded. */
export function isBookableUrl(value?: string | null): value is string {
  if (!value) return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/**
 * Tagged booking links per channel, for captions and messages. Instagram captions
 * can't hold a clickable link, so its entry is for the bio ("link in bio").
 */
export function bookingLinks(bookingUrl?: string | null): Record<string, string> | null {
  if (!isBookableUrl(bookingUrl)) return null;
  const link = (source: string, medium: string) => trackedUrl(bookingUrl, { source, medium });
  return {
    facebook: link('facebook', 'social'),
    instagram_bio: link('instagram', 'bio'),
    whatsapp: link('whatsapp', 'message'),
    google: link('google', 'business_profile'),
    email: link('email', 'email'),
    website: link('website', 'referral'),
  };
}

/** The code itself as an SVG (dark modules on a transparent ground). */
export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#0000' } });
}

/**
 * Where the plate goes at a size: the bottom-right corner, inside the 4% margin and
 * clear of the areas the app covers. `side` is the plate's width; its height is
 * side * PLATE_RATIO (the code plus the label underneath).
 */
export const PLATE_RATIO = 1.22;
export function qrBox(spec: Pick<CreativeSpec, 'width' | 'height' | 'safe'>): { side: number; height: number; left: number; top: number } {
  const short = Math.min(spec.width, spec.height);
  // Wide banners are short: keep the code scannable without swallowing the height.
  const side = Math.round(Math.min(short * 0.2, spec.height * 0.42));
  const height = Math.round(side * PLATE_RATIO);
  const margin = Math.round(short * 0.04);
  const right = Math.max(margin, (spec.safe?.right || 0) + margin);
  const bottom = Math.max(margin, (spec.safe?.bottom || 0) + margin);
  return { side, height, left: spec.width - right - side, top: spec.height - bottom - height };
}

/** The same box in words, for the designer brief and its proofreader. */
export function qrSpaceWords(spec: Pick<CreativeSpec, 'width' | 'height' | 'safe'>): string {
  const box = qrBox(spec);
  const pct = (part: number, whole: number) => Math.ceil(((part + Math.min(spec.width, spec.height) * 0.04) / whole) * 100);
  return `the bottom-right corner (the last ${pct(box.side, spec.width)}% of the width and the last ${pct(box.height + (spec.height - box.top - box.height), spec.height)}% of the height)`;
}

/**
 * The plate as HTML: a white rounded card with the code and the label. Sized in
 * px so the layout engine can place it and the renderer can draw it alone.
 */
export function qrPlateHtml(svg: string, side: number, label = QR_LABEL): string {
  const pad = Math.round(side * 0.08);
  const font = Math.max(12, Math.round(side * 0.1));
  return `<div class="qr-plate" style="box-sizing:border-box;width:${side}px;height:${Math.round(side * PLATE_RATIO)}px;padding:${pad}px;background:#fff;border-radius:${Math.round(side * 0.08)}px;box-shadow:0 ${Math.round(side * 0.03)}px ${Math.round(side * 0.09)}px rgba(0,0,0,.18);display:flex;flex-direction:column;align-items:center;justify-content:space-between">`
    + `<div style="width:100%;aspect-ratio:1">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>`
    + `<div style="font:700 ${font}px/1 var(--display, 'Poppins', 'Helvetica Neue', sans-serif);color:#111;letter-spacing:.02em;white-space:nowrap">${label}</div>`
    + '</div>';
}

/** A page with only the plate, for stamping onto a finished (designer) image. */
export function qrPlatePage(svg: string, side: number): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700&display=swap');html,body{margin:0;background:transparent}</style></head><body>${qrPlateHtml(svg, side)}</body></html>`;
}
