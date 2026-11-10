import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageGenerationService } from '../assets/image-generation.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { LibraryService } from '../library/library.service';
import { RendererService } from './renderer.service';
import { buildPostLayout, POST_FORMATS, PostCopy, PostFormat, PostLayoutInput } from './post-layout';

export interface PostImageInput extends PostCopy {
  /** What the picture shows. Drawn by the image model, which never draws text. */
  scene?: string;
  /** Reuse a picture already in the library instead of drawing a new one. */
  artworkId?: string;
  /** square 1080x1080, portrait 1080x1350, story 1080x1920, landscape 1200x630. */
  format?: PostFormat;
  /** 'show' the clinic's logo, 'reserve' space for it, or 'none'. Default: show if one is on file. */
  logo?: 'show' | 'reserve' | 'none';
  /** Where to file the post and its picture, e.g. "campaigns/eye-test-camp". */
  folder?: string;
  title?: string;
  tags?: string[];
  notes?: string;
}

export interface PostImageResult {
  url: string;
  /** The finished post in the library. */
  libraryId?: string;
  /** The picture it was built on; pass as artworkId to reuse it. */
  artworkId?: string;
  /** Echoed so a text-only revision can pass it back and reuse the same picture. */
  scene: string;
  format: PostFormat;
  provider: string;
  width: number;
  height: number;
  warnings: string[];
}

const DEFAULT_COLOUR = '#0f766e';

/** First #rrggbb in whatever shape brandColors was stored in; teal otherwise. */
export function brandColour(stored: unknown): string {
  const match = JSON.stringify(stored ?? '').match(/#[0-9a-fA-F]{6}\b/);
  return match ? match[0] : DEFAULT_COLOUR;
}

/** Kept for callers of the original single-card layout; now the full engine. */
export function buildPostImageHtml(input: PostLayoutInput): string {
  return buildPostLayout(input);
}

/** Every piece of copy, in reading order, for the library's search text. */
function copyText(input: PostCopy): string {
  return [
    input.headline?.replace(/\n|\\n/g, ' '),
    input.subheading,
    input.price,
    input.priceNote,
    ...(input.items || []).map((i) => [i.label, i.detail].filter(Boolean).join(' - ')),
    input.itemsNote,
    ...(input.points || []),
    input.cta,
    ...(input.footerLines || []),
    input.footer,
    input.finePrint,
  ]
    .filter(Boolean)
    .join(' | ');
}

/**
 * A finished social post image: the configured image model (Magnific first)
 * draws the scene with no text, and the exact copy is laid out over it
 * (post-layout.ts) and rendered with Puppeteer. Splitting it this way is what
 * keeps offers, prices, dates and names spelled right - image models garble
 * lettering.
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
    const format: PostFormat = input.format && POST_FORMATS[input.format] ? input.format : 'square';
    const size = POST_FORMATS[format];

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { businessName: true, industry: true, brandColors: true, logoUrl: true },
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
        aspect: size.artwork,
        // The text column sits left (top, for stories); keep the subject clear of it.
        composition: format === 'story' ? 'subject-bottom' : 'subject-right',
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

    const html = buildPostLayout({
      ...input,
      format,
      businessName: profile?.businessName || undefined,
      colour,
      logoUrl: profile?.logoUrl || undefined,
      artworkUrl: artwork.url,
    });
    const rendered = await this.renderer.renderToImage(html, size.width, size.height, 'png');
    if (rendered.renderer !== 'puppeteer') {
      // A placeholder must never become the image a post points at.
      throw new BadRequestException(rendered.warning || 'The post image could not be rendered.');
    }
    const warnings = [...artwork.warnings];
    if (input.logo === 'show' && !profile?.logoUrl) {
      warnings.push('No logo is on file for this provider, so the logo space was left out.');
    }

    // The layout itself is reusable: re-render it with new copy or a new picture.
    const template = await this.library
      .store(
        userId,
        { buffer: Buffer.from(html, 'utf-8'), mimeType: 'text/html', extension: 'html', name: `${input.title || input.headline}-layout` },
        { kind: 'template', ...filing, title: `${input.title || input.headline} (layout)`, source: 'post-image', parentId: artwork.libraryId, metadata: { format } },
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
        prompt: copyText(input),
        parentId: artwork.libraryId,
        width: size.width,
        height: size.height,
        metadata: { format, templateId: template?.id ?? null, copy: { ...input, scene: undefined } },
      },
    );
    this.logger.log(`Post image (${format}) for ${userId} via ${artwork.provider}`);

    return {
      url: post.url,
      libraryId: post.id,
      artworkId: artwork.libraryId,
      scene: artwork.scene,
      format,
      provider: artwork.provider,
      width: size.width,
      height: size.height,
      warnings,
    };
  }
}
