import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  CANVAS_FORMATS,
  TYPE_PAIRS,
  buildPalette,
  builtInTemplates,
  createRenderSnapshot,
  iconPaintPlan,
  renderPostToHtml,
  validateAndInjectFacts,
  type FormatId,
  type SlotValue,
  type TemplateDefinition,
  type VerifiedProfile,
} from '@jasper/post-renderer';

import { PrismaService } from '../../prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { PhotoIngestService } from '../assets/photo-ingest.service';
import { UploadService } from '../upload/upload.service';
import { LibraryService } from '../library/library.service';
import { parseJsonArray } from '../../common/utils/json-field.util';
import { RendererService } from './renderer.service';
import { candidateTemplates } from './art-direction';
import {
  ArtDirection,
  ArtDirectorBrief,
  ArtDirectorService,
  BusinessBrief,
} from './art-director.service';

/**
 * The versioned-template post pipeline.
 *
 *   brief -> Art Director -> fact injection -> React -> HTML -> Chromium -> R2
 *
 * Distinct from `DesignService`, which asks a model for a whole HTML document.
 * This one never lets a model near the markup: it writes copy into declared
 * slots in a template that has already been validated against an allow-list.
 */

export interface RenderPostRequest extends ArtDirectorBrief {
  /**
   * Identity the platform holds and Jasper does not store: practitioner name,
   * qualifications, registration number, specialty. Merged over the stored
   * profile. Platform-supplied, so trusted; a model's output never reaches here.
   */
  profile?: Partial<VerifiedProfile>;
  /** A photograph for photo-led layouts. Ingested into our own storage first. */
  photoUrl?: string;
  /** A transparent cutout of the practitioner, already background-removed. */
  cutoutUrl?: string;
  /** Overrides the brand colour on file. */
  brandColor?: string;
  /** Skip the model and render this plan directly. */
  direction?: ArtDirection;
  format?: FormatId;
}

export interface RenderedPost {
  designId: string;
  url: string | null;
  snapshotId: string;
  templateId: string;
  templateVersion: string;
  format: FormatId;
  direction: ArtDirection;
  /** Every issue fact validation raised, including attempts to author a fact. */
  factIssues: { slot: string; severity: string; message: string }[];
  omittedSlots: string[];
  /** The per-zone fit result, when the renderer could report one. */
  fit?: unknown;
  renderer: 'puppeteer' | 'placeholder';
  warning?: string;
}

@Injectable()
export class PostDesignService {
  private readonly logger = new Logger(PostDesignService.name);

  constructor(
    private prisma: PrismaService,
    private artDirector: ArtDirectorService,
    private assets: AssetsService,
    private photoIngest: PhotoIngestService,
    private renderer: RendererService,
    private upload: UploadService,
    private library: LibraryService,
  ) {}

  /** The catalogue, as the Art Director and the studio see it. */
  templates(): TemplateDefinition[] {
    return builtInTemplates();
  }

  /**
   * Asks for a plan without rendering it.
   *
   * Worth having separately: a plan is cheap, inspectable and the thing a
   * caller wants to iterate on, while a render costs a Chromium launch and a
   * credit. It is also how an integrator sees what the director was and was not
   * allowed to write.
   */
  async plan(userId: string, request: RenderPostRequest): Promise<ArtDirection> {
    const { business } = await this.context(userId);
    return this.artDirector.direct(
      request,
      business,
      this.candidates(request),
    );
  }

  async render(
    userId: string,
    request: RenderPostRequest,
  ): Promise<RenderedPost> {
    const { business, profile } = await this.context(userId, request.profile);

    const direction =
      request.direction ??
      (await this.artDirector.direct(request, business, this.candidates(request)));

    const template = this.templates().find((t) => t.id === direction.templateId);
    if (!template) {
      throw new BadRequestException(`Unknown template "${direction.templateId}".`);
    }

    const format = request.format ?? direction.format;
    if (!template.formats.includes(format)) {
      throw new BadRequestException(
        `${template.id} does not support "${format}". It supports: ${template.formats.join(', ')}.`,
      );
    }

    const palette = buildPalette(request.brandColor || business.brandColor);
    const type = TYPE_PAIRS[template.theme.mood ?? 'clinical'];

    // Imagery is resolved before fact injection so required image slots are
    // present or absent for real, rather than failing halfway through a render.
    const values: Record<string, SlotValue> = { ...direction.values };
    await this.attachImagery(userId, template, request, values);

    const icons = await this.resolveIcons(template, values, palette);

    // `visibleSlots` hides everything it does not list, so it is only passed
    // when the director actually expressed a preference - otherwise an empty
    // array would silently strip the contact details off the design. When it
    // did, the slots it wrote are unioned in: choosing to show a verified
    // field is the director's call, choosing to drop its own copy is not.
    const chosen = direction.visibleSlots;
    const facts = validateAndInjectFacts(template, profile, {
      values,
      visibleSlots:
        chosen.length > 0
          ? Array.from(new Set([...chosen, ...Object.keys(values)]))
          : undefined,
    });

    const errors = facts.issues.filter((i) => i.severity === 'error');
    if (errors.length > 0) {
      // These are not style problems. A required verified field is missing, or
      // something tried to write one - neither should reach a customer's feed.
      throw new BadRequestException(
        `This design cannot be rendered: ${errors.map((e) => `${e.slot}: ${e.message}`).join(' ')}`,
      );
    }

    const html = renderPostToHtml({
      template,
      format,
      content: facts.resolved,
      palette,
      type,
      icons,
      seed: this.seedFor(palette.brand),
    });

    const snapshot = createRenderSnapshot({
      template,
      format,
      profile,
      resolvedContent: facts.resolved,
      theme: { accent: palette.accent, ink: palette.ink },
    });

    const canvas = this.canvasFor(template, format);
    const result = await this.renderer.renderToImage(
      html,
      canvas.width,
      canvas.height,
      'png',
    );

    let url: string | null = null;
    if (result.renderer === 'puppeteer') {
      const stored = await this.upload.uploadBuffer(result.buffer, {
        folder: `post-designs/${userId}`,
        fileName: snapshot.snapshotId,
        extension: result.extension,
        contentType: result.contentType,
      });
      url = stored.url;
      await this.library.recordQuietly(userId, {
        kind: 'design',
        url: stored.url,
        storageKey: stored.key,
        mimeType: result.contentType,
        extension: result.extension,
        sizeBytes: result.buffer.length,
        width: canvas.width,
        height: canvas.height,
        source: 'post-renderer',
        metadata: {
          templateId: template.id,
          templateVersion: template.templateVersion,
          snapshotId: snapshot.snapshotId,
        },
      });
    } else {
      this.logger.warn(
        `Rendered "${template.id}" without a browser: ${result.warning ?? 'no renderer'}`,
      );
    }

    const design = await this.prisma.design.create({
      data: {
        userId,
        name: this.nameFor(request, facts.resolved),
        template: `${template.id}@${template.templateVersion}`,
        category: format.startsWith('a4') ? 'FLYER' : 'SOCIAL_POST',
        htmlContent: html,
        width: canvas.width,
        height: canvas.height,
        sizePreset: format.toUpperCase(),
        outputUrl: url,
        // Immutable: what this render was made from, so it can be reproduced or
        // audited after the template or the profile has moved on.
        renderSnapshot: JSON.stringify(snapshot),
        snapshotId: snapshot.snapshotId,
      },
      select: { id: true },
    });

    return {
      designId: design.id,
      url,
      snapshotId: snapshot.snapshotId,
      templateId: template.id,
      templateVersion: template.templateVersion,
      format,
      direction,
      factIssues: facts.issues.map((i) => ({
        slot: i.slot,
        severity: i.severity,
        message: i.message,
      })),
      omittedSlots: facts.omitted,
      fit: result.fit,
      renderer: result.renderer,
      warning: result.warning,
    };
  }

  // -------------------------------------------------------------------------
  // Context
  // -------------------------------------------------------------------------

  /**
   * Splits what is on file into two halves that must not mix.
   *
   * `business` is what the Art Director is told - industry, services, tone.
   * `profile` is what it is never told and never writes - the contact details
   * and identity, injected after it has finished.
   */
  private async context(
    userId: string,
    overrides?: Partial<VerifiedProfile>,
  ): Promise<{
    business: BusinessBrief & { brandColor?: string };
    profile: VerifiedProfile;
  }> {
    const [user, stored] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      }),
      this.prisma.userProfile.findUnique({ where: { userId } }),
    ]);

    const business: BusinessBrief & { brandColor?: string } = {
      businessName: stored?.businessName ?? undefined,
      industry: stored?.industry ?? undefined,
      subIndustry: stored?.subIndustry ?? undefined,
      description: stored?.description ?? undefined,
      city: stored?.city ?? undefined,
      services: parseJsonArray(stored?.services).map((s: any) =>
        typeof s === 'string' ? s : String(s?.name ?? ''),
      ).filter(Boolean),
      toneAttributes: parseJsonArray<string>(stored?.toneAttributes),
      tonePreference: stored?.tonePreference ?? undefined,
      brandKeywords: parseJsonArray<string>(stored?.brandKeywords),
      uniqueSellingPoints: parseJsonArray<string>(stored?.uniqueSellingPoints),
      brandDonts: parseJsonArray<string>(stored?.brandDonts),
      topicsToAvoid: parseJsonArray<string>(stored?.topicsToAvoid),
      brandColor: stored?.brandColors ?? undefined,
    };

    const profile: VerifiedProfile = {
      // Changing any verified value changes the render's identity, so the
      // version is derived from the values rather than from a row timestamp -
      // an override supplied on this call must move it too.
      profileVersion: '',
      clinicName: stored?.businessName ?? undefined,
      phone: stored?.contactPhone ?? undefined,
      email: user?.email ?? undefined,
      website: stored?.website ?? undefined,
      address: stored?.location ?? undefined,
      bookingUrl: stored?.bookingUrl ?? undefined,
      ...this.cleanOverrides(overrides),
    };
    profile.profileVersion = this.versionOf(profile);

    return { business, profile };
  }

  /** Blank strings must not shadow a stored value, so they are dropped. */
  private cleanOverrides(
    overrides?: Partial<VerifiedProfile>,
  ): Partial<VerifiedProfile> {
    if (!overrides) return {};
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(overrides)) {
      if (key === 'profileVersion') continue;
      if (typeof value === 'string' && value.trim()) clean[key] = value.trim();
    }
    return clean as Partial<VerifiedProfile>;
  }

  private versionOf(profile: VerifiedProfile): string {
    const material = Object.entries(profile)
      .filter(([key]) => key !== 'profileVersion')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value ?? ''}`)
      .join('|');
    return createHash('sha256').update(material).digest('hex').slice(0, 16);
  }

  // -------------------------------------------------------------------------
  // Template selection
  // -------------------------------------------------------------------------

  /**
   * The templates the director may choose from.
   *
   * A photo-led layout declares its photograph required with `overflow:
   * reject`, so offering one when no photograph exists guarantees a wasted call
   * and a failed render. Filtering first is both cheaper and clearer than
   * rejecting the answer afterwards.
   */
  private candidates(request: RenderPostRequest): TemplateDefinition[] {
    const templates = candidateTemplates(this.templates(), request);
    if (templates.length === 0 && request.templateId) {
      throw new BadRequestException(
        `"${request.templateId}" is not available for this brief. It may not exist, or it may need a photograph you have not supplied.`,
      );
    }
    return templates;
  }

  // -------------------------------------------------------------------------
  // Assets
  // -------------------------------------------------------------------------

  private async attachImagery(
    userId: string,
    template: TemplateDefinition,
    request: RenderPostRequest,
    values: Record<string, SlotValue>,
  ): Promise<void> {
    if (template.slots.heroImage && request.photoUrl) {
      const ingested = await this.photoIngest.ingest(userId, request.photoUrl, {
        fit: template.referenceFormat.startsWith('a4') ? 'wide' : 'hero',
      });
      values.heroImage = {
        kind: 'image',
        assetId: ingested.key,
        url: ingested.url,
      };
      if (template.slots.photoCredit && ingested.attribution) {
        values.photoCredit = { kind: 'text', value: ingested.attribution };
      }
    }

    if (template.slots.cutout && request.cutoutUrl) {
      values.cutout = {
        kind: 'image',
        assetId: request.cutoutUrl,
        url: request.cutoutUrl,
      };
    }
  }

  /**
   * Resolves every icon the design needs, in the colour of the surface it
   * lands on.
   *
   * Colour is baked into the SVG, so it has to be decided before fetching;
   * `iconPaintPlan` reads the surfaces from the template. Contact marks sit in
   * a panel that templates routinely invert, which is why they are fetched
   * separately rather than reusing the body colour.
   */
  private async resolveIcons(
    template: TemplateDefinition,
    values: Record<string, SlotValue>,
    palette: ReturnType<typeof buildPalette>,
  ): Promise<Record<string, string>> {
    const paint = iconPaintPlan(template, palette);
    const icons: Record<string, string> = {};

    const concepts = new Set<string>();
    for (const value of Object.values(values)) {
      if (value?.kind === 'list') {
        for (const item of value.items) if (item.icon) concepts.add(item.icon);
      }
    }

    const body = await this.assets.getIcons([...concepts], {
      color: paint.body,
      size: 64,
    });
    [...concepts].forEach((concept, i) => {
      if (body[i]?.resolved) icons[concept] = body[i].svg;
    });

    const contactFields = ['phone', 'email', 'website', 'address', 'bookingUrl'];
    const contact = await this.assets.getIcons(contactFields, {
      color: paint.contact,
      size: 64,
    });
    contactFields.forEach((field, i) => {
      if (contact[i]?.resolved) icons[field] = contact[i].svg;
    });

    return icons;
  }

  // -------------------------------------------------------------------------
  // Odds and ends
  // -------------------------------------------------------------------------

  private canvasFor(template: TemplateDefinition, format: FormatId) {
    return CANVAS_FORMATS[format] ?? CANVAS_FORMATS[template.referenceFormat];
  }

  /** Seeded from the brand so decorative shapes never shift between renders. */
  private seedFor(brand: string): number {
    let hash = 0;
    for (let i = 0; i < brand.length; i++) {
      hash = (hash * 31 + brand.charCodeAt(i)) >>> 0;
    }
    return hash % 1000;
  }

  private nameFor(
    request: RenderPostRequest,
    content: Record<string, SlotValue>,
  ): string {
    const headline = content.headline;
    if (headline?.kind === 'richtext') {
      return headline.runs.map((r) => r.text).join(' ').slice(0, 80);
    }
    if (headline?.kind === 'text') return headline.value.slice(0, 80);
    return request.occasion || request.campaignType || 'Untitled post';
  }
}
