import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import * as sharp from 'sharp';
import { isIP } from 'net';
import { CredentialsService } from '../credentials/credentials.service';
import { CreativeSpec } from './creative-specs';
import { PostCopy } from './post-layout';
import { PostTheme } from './post-themes';

/**
 * Designer mode: an image model (GPT-image) designs the whole creative, text
 * included, the way a designer would - then Claude reads the result back and
 * checks every word, price and number against the brief. A wrong price or
 * phone number on a clinic's post is a real harm, so nothing unverified is
 * returned: one corrected retry, then the caller falls back to the
 * exact-text layout engine.
 */

export interface DesignerInput {
  spec: CreativeSpec;
  copy: PostCopy;
  theme: PostTheme;
  /** The picture brief, already composed (composeArtPrompt). */
  picture?: string;
  businessName?: string;
  brandColour?: string;
  /** The provider's logo, placed exactly as supplied. */
  logo?: Buffer;
  /** Keep an empty corner for a logo to be added later (when there is no logo). */
  reserveLogo?: boolean;
  /** A photograph to build the design around (e.g. a library picture being reused). */
  photo?: Buffer;
  /** Style/mood references: never copied, only followed. */
  references?: Buffer[];
}

export interface Verification {
  ok: boolean;
  /** Everything Claude could read in the image. */
  transcript: string;
  /** One sentence on what the picture shows, as seen - not as briefed. */
  imagery: string;
  problems: string[];
}

/** Where the logo space goes: top-left, clear of any app overlay. */
const LOGO_SPACE = 'the top-left corner (about 28% of the width and 12% of the height)';

export interface DesignerResult {
  buffer: Buffer;
  model: string;
  attempts: number;
  verification: Verification;
}

/** One line per piece of copy, labelled with its role, in reading order. */
export function copyLines(copy: PostCopy): Array<{ role: string; text: string }> {
  const lines: Array<{ role: string; text: string }> = [];
  const add = (role: string, text?: string) => text?.trim() && lines.push({ role, text: text.trim() });
  add('headline', copy.headline?.replace(/\\n|\n/g, ' '));
  add('subheading', copy.subheading);
  add('price - the largest, most prominent element', copy.price);
  add('line under the price', copy.priceNote);
  (copy.items || []).forEach((item) => add('item, shown as a card with a fitting simple icon', [item.label, item.detail].filter(Boolean).join(' — ')));
  add('small line under the items', copy.itemsNote);
  (copy.points || []).forEach((p) => add('point', p));
  add('call-to-action button', copy.cta);
  (copy.footerLines || []).forEach((l) => add('footer', l));
  add('footer', copy.footer);
  add('fine print, small', copy.finePrint);
  return lines;
}

/** The size the image model can render: multiples of 16, longest side at most 2048, same ratio. */
export function modelSize(spec: CreativeSpec): { width: number; height: number } {
  const scale = Math.min(1, 2048 / Math.max(spec.width, spec.height));
  const ratio = spec.height / spec.width;
  const target = Math.round((spec.width * scale) / 16);
  // Search nearby widths for the pair of multiples of 16 closest to the exact ratio,
  // so the final resize to the delivery size scales without cropping.
  let best = { width: target * 16, height: Math.round(target * ratio) * 16, error: Infinity };
  for (let a = Math.max(16, target - 6); a <= target + 6; a++) {
    const b = Math.round(a * ratio);
    if (Math.max(a, b) * 16 > 2048 || Math.min(a, b) * 16 < 256) continue;
    const error = Math.abs(b / a - ratio) + Math.abs(a - target) * 0.0002;
    if (error < best.error) best = { width: a * 16, height: b * 16, error };
  }
  return { width: best.width, height: best.height };
}

/** The designer brief for the image model. */
export function composeDesignerPrompt(input: DesignerInput, size: { width: number; height: number }, fixes: string[] = []): string {
  const { spec, theme } = input;
  const lines = copyLines(input.copy);
  const safe = spec.safe;
  const parts = [
    `Design a finished, professional ${spec.label} for a healthcare provider in India: ${size.width}×${size.height} px, ${spec.ratio} ${spec.orientation}. It must look like the work of a skilled graphic designer: a strong visual hierarchy, generous spacing, polished and easy to read on a phone.`,
    `Visual theme: ${theme.description}`,
    input.logo || input.references?.length
      ? `Colours: take the brand colours from the provided ${input.logo ? 'logo' : 'reference'}${input.brandColour ? ` (otherwise build around ${input.brandColour})` : ''}.`
      : `Colours: built around the brand colour ${input.brandColour || '#0f766e'}, with ${theme.image.palette}.`,
    input.photo
      ? `PHOTO: the ${input.logo ? 'second' : 'first'} provided image is the photograph to use as the main imagery. Keep its subject, people and look; you may crop it, extend its background and adjust its colours to fit the layout, but do not redraw or replace the people in it.`
      : input.picture
        ? `Imagery: ${input.picture}`
        : '',
    'TEXT. Render exactly these lines, spelled character for character as written, each once, in this order of importance. Do not add, change, translate, abbreviate or invent any other words, numbers, prices, phone numbers, web addresses, hashtags, QR codes, badges, ratings or certifications:',
    ...lines.map((l, i) => `${i + 1}. [${l.role}] "${l.text}"`),
    input.logo
      ? 'LOGO: the first provided image is the logo. Place it exactly as supplied - same shapes, colours and lettering, unaltered and undistorted - near the top, clearly visible. Do not redraw it and do not add any other logo.'
      : input.reserveLogo
        ? `LOGO SPACE: leave ${LOGO_SPACE} completely empty - plain background only, no text, shapes, people or objects - so a logo can be added later. Do not draw a logo and do not write any placeholder text there or anywhere.`
        : 'LOGO: there is no logo. Do not draw one and do not write any placeholder such as "logo", "your logo here" or "clinic name".',
    input.references?.length
      ? `REFERENCE: the last ${input.references.length > 1 ? `${input.references.length} provided images are` : 'provided image is'} style ${input.references.length > 1 ? 'references' : 'reference'} only - follow the mood, colours and layout ideas, but never copy their text, people, faces or logos.`
      : '',
    `Keep all text at least 4% inside the edges${safe ? `, and clear of the areas the app covers: ${safe.top}px top, ${safe.bottom}px bottom, ${safe.left}px left, ${safe.right}px right (at ${spec.width}×${spec.height})` : ''}.`,
    'Any people are generic, non-identifiable and of South Asian appearance. Avoid needles in skin, blood, wounds and distressing medical imagery.',
    fixes.length ? `The previous attempt had these errors, which must be fixed: ${fixes.join('; ')}.` : '',
  ];
  return parts.filter(Boolean).join('\n');
}

const MAX_INPUT_BYTES = 8 * 1024 * 1024;

/**
 * Fetches a provider-supplied image (logo, reference) for the image model:
 * https only, never a private or local address, bounded size, re-encoded as PNG.
 */
export async function fetchInputImage(url: string): Promise<Buffer> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestException('That image link is not valid.');
  }
  const host = parsed.hostname.toLowerCase();
  if (
    parsed.protocol !== 'https:' ||
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    isIP(host.replace(/^\[|\]$/g, ''))
  ) {
    throw new BadRequestException('Images must be public https links.');
  }
  const response = await fetch(parsed, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new BadRequestException(`Could not fetch that image (HTTP ${response.status}).`);
  if (!/^image\//.test(response.headers.get('content-type') || '')) throw new BadRequestException('That link is not an image.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_INPUT_BYTES) throw new BadRequestException('That image is larger than 8 MB.');
  return sharp(bytes).rotate().resize({ width: 1536, height: 1536, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
}

@Injectable()
export class DesignerService {
  private readonly logger = new Logger(DesignerService.name);

  constructor(private credentials: CredentialsService) {}

  async isAvailable(): Promise<boolean> {
    const [openai, anthropic] = await Promise.all([
      this.credentials.get('OPENAI_API_KEY'),
      this.credentials.get('ANTHROPIC_API_KEY'),
    ]);
    return !!(openai && anthropic);
  }

  async design(input: DesignerInput): Promise<DesignerResult> {
    const model = (await this.credentials.get('OPENAI_DESIGNER_MODEL')) || 'gpt-image-2.6-flare';
    const size = modelSize(input.spec);
    let fixes: string[] = [];
    let last: { buffer: Buffer; verification: Verification } | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const raw = await this.generate(model, composeDesignerPrompt(input, size, fixes), size, input);
      // Exact delivery size; the ratio already matches, so this is a scale, not a crop.
      const buffer = await sharp(raw).resize(input.spec.width, input.spec.height, { fit: 'cover' }).png().toBuffer();
      const verification = await this.verify(buffer, input);
      this.logger.log(`Designer ${model} attempt ${attempt}: ${verification.ok ? 'verified' : verification.problems.join('; ')}`);
      if (verification.ok) return { buffer, model, attempts: attempt, verification };
      last = { buffer, verification };
      fixes = verification.problems;
    }
    const error = new BadRequestException(`The designed image did not match the brief: ${last!.verification.problems.join('; ')}`);
    (error as any).verification = last!.verification;
    throw error;
  }

  private async generate(model: string, prompt: string, size: { width: number; height: number }, input: DesignerInput): Promise<Buffer> {
    const apiKey = await this.credentials.get('OPENAI_API_KEY');
    const base = ((await this.credentials.get('OPENAI_BASE_URL')) || 'https://api.openai.com/v1').replace(/\/+$/, '');
    // Order matters: the prompt refers to them as logo, then photo, then references.
    const images = [...(input.logo ? [input.logo] : []), ...(input.photo ? [input.photo] : []), ...(input.references || []).slice(0, 3)];
    let response: Response;
    if (images.length) {
      // Edits accept several input images: the logo first, then references.
      const form = new FormData();
      form.append('model', model);
      form.append('prompt', prompt);
      form.append('size', `${size.width}x${size.height}`);
      form.append('quality', 'high');
      images.forEach((img, i) => form.append('image[]', new Blob([new Uint8Array(img)], { type: 'image/png' }), `input-${i}.png`));
      response = await fetch(`${base}/images/edits`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(240000),
      });
    } else {
      response = await fetch(`${base}/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, prompt, size: `${size.width}x${size.height}`, quality: 'high', n: 1 }),
        signal: AbortSignal.timeout(240000),
      });
    }
    const data = (await response.json().catch(() => ({}))) as any;
    if (!response.ok || !data?.data?.[0]?.b64_json) {
      throw new BadRequestException(`Designer image failed: ${data?.error?.message || `HTTP ${response.status}`}`);
    }
    return Buffer.from(data.data[0].b64_json, 'base64');
  }

  /** Claude reads the image back and compares it with the brief. */
  async verify(image: Buffer, input: DesignerInput): Promise<Verification> {
    const apiKey = await this.credentials.get('ANTHROPIC_API_KEY');
    const client = new Anthropic({ apiKey });
    const preview = await sharp(image).resize({ width: 1400, height: 1400, fit: 'inside' }).png().toBuffer();
    const lines = copyLines(input.copy);
    const allowed = [input.businessName, 'logo lettering'].filter(Boolean);

    const response = await client.messages.create({
      model: (await this.credentials.get('VERIFIER_MODEL')) || 'claude-sonnet-5-5',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: preview.toString('base64') } },
            {
              type: 'text',
              text: [
                'You are proofreading a marketing image for a healthcare provider before it is published.',
                'Required text (each must appear, spelled exactly; line breaks, letter case and a separator such as "—", "-" or "•" may differ):',
                ...lines.map((l, i) => `${i + 1}. "${l.text}"`),
                `Also allowed: the business name${input.businessName ? ` "${input.businessName}"` : ''} and the lettering inside a logo${input.logo ? ' (a logo was supplied)' : ''}.`,
                'Report as problems: any required text that is missing, misspelt, cut off or unreadable; any number, price, phone number, date or percentage that differs; and any other words or numbers in the image that are not in the list above (for example invented offers, phone numbers, web addresses, "logo here" placeholders, badges or certifications). Ignore purely decorative marks.',
                input.reserveLogo && !input.logo
                  ? `Also check that ${LOGO_SPACE} is empty (plain background, nothing placed there); if anything is in it, report "the logo space is not empty".`
                  : '',
                'Also describe in one plain sentence what the picture shows (people, setting, main objects), as you see it.',
                'Reply with JSON only: {"transcript": "<all text you can read>", "imagery": "<one sentence>", "problems": ["<short description>", ...]}',
              ].filter(Boolean).join('\n'),
            },
          ],
        },
      ],
    });
    const text = response.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
    try {
      const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
      const problems = Array.isArray(json.problems) ? json.problems.map(String).filter(Boolean) : ['the proofreader returned no problem list'];
      return { ok: problems.length === 0, transcript: String(json.transcript || ''), imagery: String(json.imagery || ''), problems };
    } catch {
      return { ok: false, transcript: text.slice(0, 500), imagery: '', problems: ['the proofreader reply could not be read'] };
    }
  }
}
