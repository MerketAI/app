import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageGenerationService } from '../assets/image-generation.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { LibraryService } from '../library/library.service';
import { RendererService } from './renderer.service';

export interface PostImageInput {
  /** What the picture shows. Drawn by the image model, which never draws text. */
  scene?: string;
  /** Reuse a picture already in the library instead of drawing a new one. */
  artworkId?: string;
  /** Where to file the post and its picture, e.g. "campaigns/eye-test-camp". */
  folder?: string;
  title?: string;
  tags?: string[];
  notes?: string;
  /** Exact copy, laid over the picture as HTML so it is never misspelt. */
  headline: string;
  subheading?: string;
  points?: string[];
  footer?: string;
  finePrint?: string;
}

export interface PostImageResult {
  url: string;
  /** The finished post in the library. */
  libraryId?: string;
  /** The picture it was built on; pass as artworkId to reuse it. */
  artworkId?: string;
  /** Echoed so a text-only revision can pass it back and reuse the same picture. */
  scene: string;
  provider: string;
  width: number;
  height: number;
  warnings: string[];
}

const SIZE = 1080;
const DEFAULT_COLOUR = '#0f766e';

const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** First #rrggbb in whatever shape brandColors was stored in; teal otherwise. */
export function brandColour(stored: unknown): string {
  const match = JSON.stringify(stored ?? '').match(/#[0-9a-fA-F]{6}\b/);
  return match ? match[0] : DEFAULT_COLOUR;
}

/**
 * The text card laid over generated artwork. A "NN%" (or "FREE") at the start
 * of a point becomes a badge, so offers read at a glance on a phone.
 */
export function buildPostImageHtml(
  input: PostImageInput & { businessName?: string; colour?: string; artworkUrl: string },
): string {
  const colour = input.colour || DEFAULT_COLOUR;
  const points = (input.points || []).slice(0, 6).map((point) => {
    const badge = point.match(/^\s*(\d{1,3}\s?%|free)\s*(?:off\b)?\s*/i);
    if (!badge) return `<div class="row"><span class="dot"></span>${escapeHtml(point.trim())}</div>`;
    const rest = point.slice(badge[0].length).trim();
    const label = /off\b/i.test(badge[0]) ? `off ${rest}` : rest;
    return `<div class="row"><span class="badge">${escapeHtml(badge[1].toUpperCase().replace(/\s/g, ''))}</span>${escapeHtml(label)}</div>`;
  });

  return `<!doctype html><html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap');
html,body{margin:0;padding:0;overflow:hidden}
body{width:${SIZE}px;height:${SIZE}px;font-family:Poppins,Arial,sans-serif}
.stage{position:relative;width:${SIZE}px;height:${SIZE}px;background:#e8f1f0 url("${escapeHtml(input.artworkUrl)}") center/cover no-repeat}
.card{position:absolute;left:56px;top:56px;width:600px;box-sizing:border-box;padding:44px 44px 34px;background:rgba(255,255,255,.94);border-radius:28px;box-shadow:0 18px 50px rgba(0,40,40,.18)}
.brand{color:${colour};font-weight:600;letter-spacing:.14em;font-size:20px;text-transform:uppercase}
h1{margin:10px 0 6px;font-size:60px;line-height:1.04;color:#10302f;font-weight:800}
.sub{font-size:26px;color:${colour};font-weight:600;margin-bottom:20px}
.rows{display:grid;gap:12px}
.row{display:flex;align-items:center;gap:16px;font-size:22px;color:#1d2b2b;line-height:1.25}
.badge{flex:none;min-width:88px;text-align:center;background:${colour};color:#fff;font-weight:800;border-radius:12px;padding:6px 10px;font-size:22px}
.dot{flex:none;width:12px;height:12px;border-radius:50%;background:${colour};margin:0 6px}
.foot{margin-top:22px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;font-size:19px;color:#2d4040}
.fine{font-size:14px;color:#5d6f6f;white-space:nowrap}
</style></head><body><div class="stage"><div class="card">
${input.businessName ? `<div class="brand">${escapeHtml(input.businessName)}</div>` : ''}
<h1>${escapeHtml(input.headline)}</h1>
${input.subheading ? `<div class="sub">${escapeHtml(input.subheading)}</div>` : ''}
${points.length ? `<div class="rows">${points.join('')}</div>` : ''}
${input.footer || input.finePrint ? `<div class="foot"><div>${escapeHtml(input.footer || '')}</div><div class="fine">${escapeHtml(input.finePrint || '')}</div></div>` : ''}
</div></div></body></html>`;
}

/**
 * A finished social post image: the configured image model (Magnific first)
 * draws the scene with no text, and the exact copy is composited on top and
 * rendered with Puppeteer. Splitting it this way is what keeps offers, dates
 * and names spelled right - image models garble lettering.
 */
@Injectable()
export class PostImageService {
  private readonly logger = new Logger(PostImageService.name);

  constructor(
    private prisma: PrismaService,
    private imageGeneration: ImageGenerationService,
    private renderer: RendererService,
    private library: LibraryService,
    private subscriptions: SubscriptionsService,
  ) {}

  async compose(userId: string, input: PostImageInput): Promise<PostImageResult> {
    if (!input.headline?.trim()) throw new BadRequestException('A post image needs a headline.');
    if (!input.artworkId && !input.scene?.trim()) {
      throw new BadRequestException('Describe a scene, or pass artworkId to reuse a library picture.');
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { businessName: true, industry: true, brandColors: true },
    });
    const colour = brandColour(profile?.brandColors);
    const filing = { folder: input.folder, tags: input.tags };

    // Reuse costs nothing: no image-model call, no credits.
    let artwork: { url: string; libraryId?: string; provider: string; cached: boolean; warnings: string[]; scene: string };
    if (input.artworkId) {
      const picked = await this.library.get(userId, input.artworkId);
      if (!['image', 'gif'].includes(picked.mediaType)) {
        throw new BadRequestException('That library asset is not a picture.');
      }
      artwork = {
        url: picked.url,
        libraryId: picked.id,
        provider: 'library',
        cached: true,
        warnings: ['Reused a picture from the library (no new image charge).'],
        scene: picked.scene || input.scene || '',
      };
    } else {
      const generated = await this.imageGeneration.generate(userId, {
        subject: input.scene!,
        style: 'photographic',
        aspect: 'square',
        industry: profile?.industry || undefined,
        brandColor: colour,
        filing: { ...filing, title: input.title ? `${input.title} (picture)` : undefined },
      });
      if (!generated.cached) await this.subscriptions.consumeCredits(userId, 'ARTWORK_GENERATE');
      artwork = {
        ...generated,
        scene: input.scene!,
        warnings: generated.cached
          ? [...generated.warnings, 'Reused the existing picture for this scene (no new image charge).']
          : generated.warnings,
      };
    }

    const html = buildPostImageHtml({
      ...input,
      businessName: profile?.businessName || undefined,
      colour,
      artworkUrl: artwork.url,
    });
    const rendered = await this.renderer.renderToImage(html, SIZE, SIZE, 'png');
    if (rendered.renderer !== 'puppeteer') {
      // A placeholder must never become the image a post points at.
      throw new BadRequestException(rendered.warning || 'The post image could not be rendered.');
    }

    const copy = [input.headline, input.subheading, ...(input.points || []), input.footer, input.finePrint]
      .filter(Boolean)
      .join(' | ');
    // The layout itself is reusable: re-render it with new copy or a new picture.
    const template = await this.library
      .store(
        userId,
        { buffer: Buffer.from(html, 'utf-8'), mimeType: 'text/html', extension: 'html', name: `${input.title || input.headline}-layout` },
        { kind: 'template', ...filing, title: `${input.title || input.headline} (layout)`, source: 'post-image', parentId: artwork.libraryId },
      )
      .catch(() => null);
    const post = await this.library.store(
      userId,
      { buffer: rendered.buffer, mimeType: 'image/png', extension: 'png', name: input.title || input.headline },
      {
        kind: 'post',
        ...filing,
        title: input.title || input.headline,
        notes: input.notes,
        source: artwork.provider,
        scene: artwork.scene,
        prompt: copy,
        parentId: artwork.libraryId,
        width: SIZE,
        height: SIZE,
        metadata: { templateId: template?.id ?? null, copy: { ...input, scene: undefined } },
      },
    );
    this.logger.log(`Post image for ${userId} via ${artwork.provider}`);

    return {
      url: post.url,
      libraryId: post.id,
      artworkId: artwork.libraryId,
      scene: artwork.scene,
      provider: artwork.provider,
      width: SIZE,
      height: SIZE,
      warnings: artwork.warnings,
    };
  }
}
