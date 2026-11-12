import { stripPlaceholders } from './placeholders';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageGenerationService } from '../assets/image-generation.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { LibraryService } from '../library/library.service';
import { RendererService } from './renderer.service';
import { buildPostLayout, PostCopy, PostFormat, PostLayoutInput } from './post-layout';
import { CreativeSpec, CreativeSpecError, resolveSpec } from './creative-specs';
import { ArtDirection, composeArtPrompt, pickTheme, PostTheme, ThemeId, THEMES } from './post-themes';
import { DesignerService, fetchInputImage } from './designer.service';
import { campaignFromFolder, isBookableUrl, qrBox, qrPlatePage, qrSpaceWords, qrSvg, trackedUrl } from './qr';
import * as sharp from 'sharp';

type Artwork = { url: string; libraryId?: string; provider: string; cached: boolean; warnings: string[]; scene: string };

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
  /** The picture brief; preferred over scene. */
  artDirection?: ArtDirection;
  /** Visual theme; picked from the brief when omitted. */
  theme?: ThemeId;
  /** 'show' the clinic's logo, 'reserve' space for it, or 'none'. Default: show if one is on file. */
  logo?: 'show' | 'reserve' | 'none';
  /** A logo image to use instead of the one on file, e.g. one the provider attached. */
  logoUrl?: string;
  /** 'designer': the image model designs the whole creative and it is verified; 'layout' (default): exact-text layout. */
  mode?: 'layout' | 'designer';
  /** Style references for designer mode (never copied). */
  referenceUrls?: string[];
  /** Add a "Scan to book" QR code for the provider's booking page, tagged per size. */
  bookingQr?: boolean;
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
  /** How this size was made. */
  mode: 'layout' | 'designer';
  /**
   * What was actually made, for the assistant to describe - not what was planned.
   * text: the words on the image (designer: as the proofreader read them).
   */
  made: {
    text: string;
    picture: string;
    pictureSource: 'new' | 'library';
    logo: 'placed' | 'space reserved' | 'none';
    /** The tracked booking URL a "Scan to book" code on this size opens, if one was placed. */
    qr?: string;
  };
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
  /** The visual theme used; pass it again to keep a campaign consistent. */
  theme: ThemeId;
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
    private designer: DesignerService,
  ) {}

  async compose(userId: string, rawInput: PostImageInput): Promise<PostImageResult> {
    // "[Phone Number]"-style placeholders never reach an image; say which were missing.
    const { copy: input, removed: placeholders } = stripPlaceholders(rawInput);
    if (!input.headline?.trim()) throw new BadRequestException('A post image needs a headline.');
    const direction: ArtDirection | undefined = input.artDirection?.subject?.trim()
      ? input.artDirection
      : input.scene?.trim()
        ? { subject: input.scene, objective: input.artDirection?.objective, occasion: input.artDirection?.occasion }
        : undefined;
    if (!input.artworkId && !direction && input.mode !== 'designer') {
      throw new BadRequestException('Describe the picture (art direction or scene), or pass artworkId to reuse a library picture.');
    }
    const specs = requestedSpecs(input);
    const themeId = pickTheme({
      theme: input.theme,
      objective: direction?.objective,
      occasion: direction?.occasion,
      text: [copyText(input), direction?.subject, direction?.audience].filter(Boolean).join(' '),
      hasPrice: !!input.price,
    });
    const theme = THEMES[themeId];

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { businessName: true, industry: true, brandColors: true, logoUrl: true, bookingUrl: true },
    });
    const bookingUrl = input.bookingQr && isBookableUrl(profile?.bookingUrl) ? profile!.bookingUrl! : null;
    const colour = brandColour(profile?.brandColors);
    const filing = { folder: input.folder, tags: input.tags };

    const warnings: string[] = [];
    if (placeholders.length) {
      warnings.push(`Left off the image because they were placeholders, not real details: ${placeholders.join(', ')}. Ask the provider for them.`);
    }
    if (input.bookingQr && !bookingUrl) {
      warnings.push('No booking page is on file for this provider, so the "Scan to book" code was left off.');
    }
    if (input.logo === 'show' && !input.logoUrl && !profile?.logoUrl) {
      warnings.push('No logo is on file for this provider, so the logo space was left out.');
    }
    // The picture for the layout engine, made at most once and only if a size needs it
    // (designer-mode sizes that pass verification never do).
    let artworkPromise: Promise<Artwork> | null = null;
    const getArtwork = () => (artworkPromise ||= this.resolveArtwork(userId, input, direction, theme, themeId, profile, colour, filing));

    // Designer mode: the image model designs each size, text included; a size that
    // fails verification falls back to the layout engine below.
    const designerOn = input.mode === 'designer' && (await this.designer.isAvailable());
    if (input.mode === 'designer' && !designerOn) {
      warnings.push('Designer mode needs OPENAI_API_KEY and ANTHROPIC_API_KEY; used the standard layout instead.');
    }
    let designerInputs: { logo?: Buffer; references?: Buffer[]; picture?: string; photo?: Buffer; photoScene?: string } | null = null;
    if (designerOn) {
      const logoUrl = input.logoUrl || profile?.logoUrl || undefined;
      // A library picture being reused becomes the photograph the design is built around.
      const reused = input.artworkId ? await this.library.get(userId, input.artworkId) : null;
      if (reused && !['image', 'gif'].includes(reused.mediaType)) throw new BadRequestException('That library asset is not a picture.');
      const [logo, references, photo] = await Promise.all([
        logoUrl && input.logo !== 'none' ? fetchInputImage(logoUrl).catch((e) => { warnings.push(`The logo could not be used: ${e.message}`); return undefined; }) : undefined,
        Promise.all((input.referenceUrls || []).slice(0, 3).map((u) => fetchInputImage(u).catch(() => null))).then((list) => list.filter(Boolean) as Buffer[]),
        reused ? fetchInputImage(reused.url).catch((e) => { warnings.push(`The library picture could not be used (${e.message}); a new one was drawn.`); return undefined; }) : undefined,
      ]);
      const picture = direction
        ? composeArtPrompt({ ...direction, subject: this.imageGeneration.sanitiseSubject(direction.subject).subject }, theme)
        : undefined;
      designerInputs = { logo, references, picture, photo, photoScene: photo ? reused?.scene || undefined : undefined };
    }

    const sizes: RenderedSize[] = [];
    for (const spec of specs) {
      const title = `${input.title || input.headline.replace(/\n|\\n/g, ' ')}`;
      // Each size gets its own tags, so a booking shows which placement it came from.
      const qrUrl = bookingUrl
        ? trackedUrl(bookingUrl, { source: spec.platform || 'quickcare', medium: 'qr', campaign: campaignFromFolder(input.folder) })
        : undefined;
      const code = qrUrl ? await qrSvg(qrUrl) : undefined;
      if (designerInputs) {
        try {
          const designed = await this.designer.design({
            spec,
            copy: input,
            theme,
            picture: designerInputs.picture,
            businessName: profile?.businessName || undefined,
            brandColour: colour,
            logo: designerInputs.logo,
            reserveLogo: !designerInputs.logo && input.logo === 'reserve',
            photo: designerInputs.photo,
            references: designerInputs.references,
            qrSpace: code ? qrSpaceWords(spec) : undefined,
          });
          await this.subscriptions.consumeCredits(userId, 'DESIGN_GENERATE');
          // The code is stamped after proofreading: an image model cannot draw a scannable one.
          const finished = code ? await this.stampQr(designed.buffer, spec, code) : designed.buffer;
          const post = await this.library.store(
            userId,
            { buffer: finished, mimeType: 'image/png', extension: 'png', name: `${spec.id}-designer-${title}` },
            {
              kind: 'post',
              ...filing,
              tags: [...(input.tags || []), spec.platform, spec.placement, themeId, 'designer'],
              title: `${title} (${spec.label}, designer)`,
              notes: input.notes,
              source: designed.model,
              scene: direction?.subject,
              prompt: copyText(input),
              width: spec.width,
              height: spec.height,
              metadata: {
                mode: 'designer', spec: spec.id, category: spec.category, platform: spec.platform, placement: spec.placement,
                ratio: spec.ratio, theme: themeId, attempts: designed.attempts, transcript: designed.verification.transcript,
                copy: { ...input, scene: undefined },
              },
            },
          );
          if (designed.attempts > 1) warnings.push(`At ${spec.label} the first design had a text error and was redone; the final one was checked word for word.`);
          sizes.push({
            spec: spec.id, label: spec.label, url: post.url, libraryId: post.id, width: spec.width, height: spec.height, ratio: spec.ratio,
            dropped: [], mode: 'designer',
            made: {
              text: designed.verification.transcript,
              picture: designed.verification.imagery,
              pictureSource: designerInputs.photo ? 'library' : 'new',
              logo: designerInputs.logo ? 'placed' : !designerInputs.logo && input.logo === 'reserve' ? 'space reserved' : 'none',
              ...(qrUrl ? { qr: qrUrl } : {}),
            },
          });
          continue;
        } catch (error) {
          this.logger.warn(`Designer failed at ${spec.id}: ${(error as Error).message}`);
          warnings.push(`Designer mode could not produce a correct ${spec.label} (${(error as Error).message.replace(/^The designed image did not match the brief: /, 'text errors: ')}), so it was made with the standard layout instead.`);
        }
      }

      const artwork = await getArtwork();
      if (!warnings.includes(artwork.warnings[0])) warnings.push(...artwork.warnings);
      const html = buildPostLayout({
        ...input,
        spec,
        theme: themeId,
        businessName: profile?.businessName || undefined,
        colour,
        logoUrl: input.logoUrl || profile?.logoUrl || undefined,
        artworkUrl: artwork.url,
        qrSvg: code,
      });
      const rendered = await this.renderer.renderToImage(html, spec.width, spec.height, 'png');
      if (rendered.renderer !== 'puppeteer') {
        // A placeholder must never become the image a post points at.
        throw new BadRequestException(rendered.warning || 'The post image could not be rendered.');
      }
      const dropped = (rendered.fit?.dropped || []).map((cls) => DROPPED_NAMES[cls.split(' ')[0]] || cls);
      if (dropped.length) warnings.push(`At ${spec.label} (${spec.width}×${spec.height}) there was no room for ${dropped.join(', ')}.`);

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
          tags: [...(input.tags || []), spec.platform, spec.placement, themeId],
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
            theme: themeId,
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
        mode: 'layout',
        made: {
          // The layout places the copy exactly as given, minus anything the fit pass dropped.
          text: copyText(input) + (dropped.length ? ` (left out at this size: ${dropped.join(', ')})` : ''),
          picture: artwork.scene,
          pictureSource: input.artworkId ? 'library' : 'new',
          logo:
            (input.logoUrl || profile?.logoUrl) && input.logo !== 'none' && input.logo !== 'reserve'
              ? 'placed'
              : input.logo === 'reserve'
                ? 'space reserved'
                : 'none',
          ...(qrUrl ? { qr: qrUrl } : {}),
        },
      });
    }
    // Assigned inside getArtwork, which TypeScript's narrowing cannot see.
    const pending = artworkPromise as Promise<Artwork> | null;
    const usedArtwork = pending ? await pending : null;
    this.logger.log(`Post image (${sizes.map((s) => `${s.spec}:${s.mode}`).join(', ')}) for ${userId}`);

    const first = sizes[0];
    return {
      url: first.url,
      libraryId: first.libraryId,
      sizes,
      artworkId: usedArtwork?.libraryId,
      scene: usedArtwork?.scene || direction?.subject || '',
      spec: first.spec,
      theme: themeId,
      provider: usedArtwork?.provider || 'designer',
      width: first.width,
      height: first.height,
      warnings,
    };
  }

  /**
   * Stamps a "Scan to book" plate onto a finished image, in the corner the designer
   * kept clear. The plate is drawn by the renderer (real fonts) and given rounded
   * corners here, since the page behind it renders white.
   */
  private async stampQr(image: Buffer, spec: CreativeSpec, svg: string): Promise<Buffer> {
    const meta = await sharp(image).metadata();
    const canvas = { width: meta.width || spec.width, height: meta.height || spec.height, safe: spec.safe };
    const box = qrBox(canvas);
    const plate = await this.renderer.renderToImage(qrPlatePage(svg, box.side), box.side, box.height, 'png');
    if (plate.renderer !== 'puppeteer') throw new BadRequestException(plate.warning || 'The QR code could not be drawn.');
    const radius = Math.round(box.side * 0.08);
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${box.side}" height="${box.height}"><rect width="100%" height="100%" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`);
    const rounded = await sharp(plate.buffer)
      .resize(box.side, box.height)
      .ensureAlpha()
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();
    return sharp(image).composite([{ input: rounded, left: box.left, top: box.top }]).png().toBuffer();
  }

  /** The layout engine's picture: a library pick, or generated from the art direction. */
  private async resolveArtwork(
    userId: string,
    input: PostImageInput,
    direction: ArtDirection | undefined,
    theme: PostTheme,
    themeId: ThemeId,
    profile: { industry?: string | null } | null,
    colour: string,
    filing: { folder?: string; tags?: string[] },
  ): Promise<Artwork> {
    let artwork: Artwork;
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
      // Names come out of the subject before it is lowercased into the prompt,
      // so a real person is never depicted and "White Coat" is never taken for one.
      const { subject, strippedNames } = this.imageGeneration.sanitiseSubject(direction!.subject);
      const prompt = composeArtPrompt({ ...direction!, subject }, theme);
      const generated = await this.imageGeneration.generate(userId, {
        subject: prompt,
        style: direction!.style || theme.image.style,
        // Square for every size: the layout crops it around the centred subject.
        aspect: 'square',
        composition: 'subject-right',
        // The generic "calm, clinical" industry line would fight a festive or playful brief.
        industry: themeId === 'clinical-clean' || themeId === 'premium-editorial' ? profile?.industry || undefined : undefined,
        brandColor: colour,
        filing: {
          ...filing,
          tags: [...(input.tags || []), themeId],
          title: input.title ? `${input.title} (picture)` : undefined,
          metadata: { theme: themeId, artDirection: direction },
        },
      });
      if (!generated.cached) await this.subscriptions.consumeCredits(userId, 'ARTWORK_GENERATE');
      artwork = {
        ...generated,
        scene: direction!.subject,
        warnings: [
          ...generated.warnings,
          ...(strippedNames.length ? [`Removed a name from the picture brief (${strippedNames.join(', ')}); generated pictures never show a real, named person.`] : []),
          ...(generated.cached ? ['Reused the existing picture for this brief (no new image charge).'] : []),
        ],
      };
    }

    return artwork;
  }
}
