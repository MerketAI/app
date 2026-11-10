import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageGenerationService } from '../assets/image-generation.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { LibraryService } from '../library/library.service';
import { RendererService } from './renderer.service';
import { buildPostLayout, PostCopy, PostFormat, PostLayoutInput } from './post-layout';
import { CreativeSpec, CreativeSpecError, resolveSpec } from './creative-specs';

export interface PostImageInput extends PostCopy {
  /** What the picture shows. Drawn by the image model, which never draws text. */
  scene?: string;
  /** Reuse a picture already in the library instead of drawing a new one. */
  artworkId?: string;
  /** One placement from creative-specs (e.g. "instagram-feed-portrait"). */
  spec?: string;
  /** Several placements, all rendered from the same picture. */
  specs?: string[];
  /** The platform's default feed size, when no spec is given. */
  platform?: string;
  /** A custom size, validated against SIZE_LIMITS. */
  width?: number;
  height?: number;
  /** Legacy: square | portrait | story | landscape. */
  format?: PostFormat;
  /** 'show' the clinic's logo, 'reserve' space for it, or 'none'. Default: show if one is on file. */
  logo?: 'show' | 'reserve' | 'none';
  /** Where to file the post and its picture, e.g. "campaigns/eye-test-camp". */
  folder?: string;
  title?: string;
  tags?: string[];
  notes?: string;
}

export interface RenderedSize {
  spec: string;
  label: string;
  url: string;
  libraryId?: string;
  width: number;
  height: number;
  ratio: string;
  /** Lines the fit pass had to leave out at this size. */
  dropped: string[];
}

export interface PostImageResult {
  /** The first size's URL, for single-size callers. */
  url: string;
  libraryId?: string;
  /** Every size rendered, in the order asked for. */
  sizes: RenderedSize[];
  /** The picture it was built on; pass as artworkId to reuse it. */
  artworkId?: string;
  /** Echoed so a text-only revision can pass it back and reuse the same picture. */
  scene: string;
  spec: string;
  provider: string;
  width: number;
  height: number;
  warnings: string[];
}

const DEFAULT_COLOUR = '#0f766e';
const MAX_SIZES_PER_CALL = 6;

/** First #rrggbb in whatever shape brandColors was stored in; teal otherwise. */
export function brandColour(stored: unknown): string {
  const match = JSON.stringify(stored ?? '').match(/#[0-9a-fA-F]{6}\b/);
  return match ? match[0] : DEFAULT_COLOUR;
}

/** Kept for callers of the original single-card layout; now the full engine. */
export function buildPostImageHtml(input: PostLayoutInput): string {
  return buildPostLayout(input);
}

/** The placements a request asks for, de-duplicated by size. */
export function requestedSpecs(input: PostImageInput): CreativeSpec[] {
  try {
    const asked = input.specs?.length
      ? input.specs.map((spec) => resolveSpec({ spec }))
      : [resolveSpec({ spec: input.spec || input.format, platform: input.platform, width: input.width, height: input.height })];
    const seen = new Set<string>();
    return asked
      .filter((s) => {
        const key = `${s.width}x${s.height}:${JSON.stringify(s.safe || {})}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX_SIZES_PER_CALL);
  } catch (error) {
    if (error instanceof CreativeSpecError) throw new BadRequestException(error.message);
    throw error;
  }
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

const DROPPED_NAMES: Record<string, string> = {
  'items-note': 'the line under the cards',
  'price-note': 'the line under the price',
  cards: 'the item cards',
  rows: 'the list',
  sub: 'the subheading',
  brand: 'the business name',
};

/**
 * Finished post images: the configured image model (Magnific first) draws the
 * scene once, with no text, and the exact copy is laid out over it
 * (post-layout.ts) at every requested size and rendered with Puppeteer.
 * Splitting it this way keeps offers, prices, dates and names spelled right -
 * image models garble lettering - and one picture serves every size.
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
    const specs = requestedSpecs(input);

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
        // Square for every size: the layout crops it around the centred subject.
        aspect: 'square',
        composition: 'subject-right',
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

    const warnings = [...artwork.warnings];
    if (input.logo === 'show' && !profile?.logoUrl) {
      warnings.push('No logo is on file for this provider, so the logo space was left out.');
    }

    const sizes: RenderedSize[] = [];
    for (const spec of specs) {
      const html = buildPostLayout({
        ...input,
        spec,
        businessName: profile?.businessName || undefined,
        colour,
        logoUrl: profile?.logoUrl || undefined,
        artworkUrl: artwork.url,
      });
      const rendered = await this.renderer.renderToImage(html, spec.width, spec.height, 'png');
      if (rendered.renderer !== 'puppeteer') {
        // A placeholder must never become the image a post points at.
        throw new BadRequestException(rendered.warning || 'The post image could not be rendered.');
      }
      const dropped = (rendered.fit?.dropped || []).map((cls) => DROPPED_NAMES[cls.split(' ')[0]] || cls);
      if (dropped.length) warnings.push(`At ${spec.label} (${spec.width}×${spec.height}) there was no room for ${dropped.join(', ')}.`);

      const title = `${input.title || input.headline.replace(/\n|\\n/g, ' ')}`;
      // The layout itself is reusable: re-render it with new copy or a new picture.
      const template = await this.library
        .store(
          userId,
          // Placement first: file names are truncated, and the size must survive.
          { buffer: Buffer.from(html, 'utf-8'), mimeType: 'text/html', extension: 'html', name: `${spec.id}-layout-${title}` },
          { kind: 'template', ...filing, title: `${title} (${spec.label}, layout)`, source: 'post-image', parentId: artwork.libraryId, metadata: { spec: spec.id } },
        )
        .catch(() => null);
      const post = await this.library.store(
        userId,
        { buffer: rendered.buffer, mimeType: 'image/png', extension: 'png', name: `${spec.id}-${title}` },
        {
          kind: 'post',
          ...filing,
          tags: [...(input.tags || []), spec.platform, spec.placement],
          title: `${title} (${spec.label})`,
          notes: input.notes,
          source: artwork.provider,
          scene: artwork.scene,
          prompt: copyText(input),
          parentId: artwork.libraryId,
          width: spec.width,
          height: spec.height,
          metadata: {
            spec: spec.id,
            category: spec.category,
            platform: spec.platform,
            placement: spec.placement,
            ratio: spec.ratio,
            templateId: template?.id ?? null,
            copy: { ...input, scene: undefined },
          },
        },
      );
      sizes.push({
        spec: spec.id,
        label: spec.label,
        url: post.url,
        libraryId: post.id,
        width: spec.width,
        height: spec.height,
        ratio: spec.ratio,
        dropped,
      });
    }
    this.logger.log(`Post image (${specs.map((s) => s.id).join(', ')}) for ${userId} via ${artwork.provider}`);

    const first = sizes[0];
    return {
      url: first.url,
      libraryId: first.libraryId,
      sizes,
      artworkId: artwork.libraryId,
      scene: artwork.scene,
      spec: first.spec,
      provider: artwork.provider,
      width: first.width,
      height: first.height,
      warnings,
    };
  }
}
