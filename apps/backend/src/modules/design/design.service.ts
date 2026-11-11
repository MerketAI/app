import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { RendererService } from './renderer.service';
import { UploadService } from '../upload/upload.service';
import { LibraryService } from '../library/library.service';
import { AssetsService } from '../assets/assets.service';
import { DecorativeService } from '../assets/decorative.service';
import { buildPalette, moodForIndustry, TYPE_PAIRS } from './templates/tokens';
import { seedFrom } from './templates/shapes';
import { selectTemplate } from './templates/registry';
import { TemplateContext, FeatureItem, ContactLine } from './templates/types';
import {
  GenerateDesignDto,
  UpdateDesignDto,
  RenderDesignDto,
  DesignFilterDto,
} from './dto/design.dto';

const SIZE_PRESETS: Record<
  string,
  { width: number; height: number; label: string }
> = {
  INSTAGRAM_POST: { width: 1080, height: 1080, label: 'Instagram Post' },
  INSTAGRAM_STORY: { width: 1080, height: 1920, label: 'Instagram Story' },
  FACEBOOK_COVER: { width: 820, height: 312, label: 'Facebook Cover' },
  FACEBOOK_POST: { width: 1200, height: 630, label: 'Facebook Post' },
  TWITTER_HEADER: { width: 1500, height: 500, label: 'Twitter Header' },
  LINKEDIN_COVER: { width: 1584, height: 396, label: 'LinkedIn Cover' },
  A4_FLYER: { width: 2480, height: 3508, label: 'A4 Flyer' },
  A5_FLYER: { width: 1748, height: 2480, label: 'A5 Flyer' },
  YOUTUBE_THUMBNAIL: { width: 1280, height: 720, label: 'YouTube Thumbnail' },
};

const DESIGN_TEMPLATES = [
  {
    id: 'sale-flyer',
    name: 'Sale Announcement Flyer',
    category: 'FLYER',
    sizePreset: 'A4_FLYER',
    style: 'bold',
    thumbnail: '/templates/sale-flyer-thumb.png',
    description: 'Eye-catching sale announcement with bold typography and vibrant colors',
  },
  {
    id: 'social-promo',
    name: 'Social Media Promo',
    category: 'SOCIAL_POST',
    sizePreset: 'INSTAGRAM_POST',
    style: 'modern',
    thumbnail: '/templates/social-promo-thumb.png',
    description: 'Clean promotional post for Instagram and Facebook',
  },
  {
    id: 'story-announcement',
    name: 'Story Announcement',
    category: 'STORY',
    sizePreset: 'INSTAGRAM_STORY',
    style: 'creative',
    thumbnail: '/templates/story-announcement-thumb.png',
    description: 'Vertical story format for announcements and updates',
  },
  {
    id: 'corporate-banner',
    name: 'Corporate Banner',
    category: 'BANNER',
    sizePreset: 'LINKEDIN_COVER',
    style: 'corporate',
    thumbnail: '/templates/corporate-banner-thumb.png',
    description: 'Professional banner for LinkedIn and corporate pages',
  },
  {
    id: 'youtube-thumb',
    name: 'YouTube Thumbnail',
    category: 'BANNER',
    sizePreset: 'YOUTUBE_THUMBNAIL',
    style: 'bold',
    thumbnail: '/templates/youtube-thumb-thumb.png',
    description: 'Attention-grabbing YouTube video thumbnail',
  },
  {
    id: 'event-poster',
    name: 'Event Poster',
    category: 'POSTER',
    sizePreset: 'A4_FLYER',
    style: 'elegant',
    thumbnail: '/templates/event-poster-thumb.png',
    description: 'Elegant event poster with date and venue details',
  },
  {
    id: 'facebook-ad',
    name: 'Facebook Ad',
    category: 'AD',
    sizePreset: 'FACEBOOK_POST',
    style: 'modern',
    thumbnail: '/templates/facebook-ad-thumb.png',
    description: 'Optimized ad layout for Facebook campaigns',
  },
  {
    id: 'minimal-post',
    name: 'Minimal Quote Post',
    category: 'SOCIAL_POST',
    sizePreset: 'INSTAGRAM_POST',
    style: 'minimal',
    thumbnail: '/templates/minimal-post-thumb.png',
    description: 'Clean minimal design for quotes and text posts',
  },
];

@Injectable()
export class DesignService {
  private readonly logger = new Logger(DesignService.name);

  constructor(
    private prisma: PrismaService,
    private credentialsService: CredentialsService,
    private subscriptionsService: SubscriptionsService,
    private rendererService: RendererService,
    private uploadService: UploadService,
    private assetsService: AssetsService,
    private decorativeService: DecorativeService,
    private library: LibraryService,
  ) {}

  // ---- AI Generation ----

  async generateDesign(userId: string, dto: GenerateDesignDto) {
    // Consume credits for generation
    await this.subscriptionsService.consumeCredits(userId, 'DESIGN_GENERATE');

    const preset = dto.sizePreset
      ? SIZE_PRESETS[dto.sizePreset]
      : SIZE_PRESETS.INSTAGRAM_POST;
    const width = preset.width;
    const height = preset.height;

    let suppliedContext: Record<string, any> = {};
    if (dto.businessContext) {
      try {
        suppliedContext = JSON.parse(dto.businessContext);
      } catch {
        throw new BadRequestException(
          'businessContext must be a valid JSON string',
        );
      }
    }

    // The tenant's brand already lives in their profile, so a partner should not
    // have to resend it on every call. Anything passed explicitly still wins.
    const businessContext = {
      ...(await this.loadBrandContext(userId)),
      ...suppliedContext,
    };

    const htmlContent = await this.callAnthropicForDesign(
      dto.prompt,
      width,
      height,
      dto.category || 'SOCIAL_POST',
      dto.style || 'modern',
      businessContext,
    );

    // Derive a name from the prompt
    const name =
      dto.prompt.length > 60
        ? dto.prompt.substring(0, 57) + '...'
        : dto.prompt;

    const design = await this.prisma.design.create({
      data: {
        userId,
        name,
        category: dto.category || 'SOCIAL_POST',
        sizePreset: dto.sizePreset || 'INSTAGRAM_POST',
        width,
        height,
        htmlContent,
        cssContent: null,
        creditsConsumed: 10,
      },
    });

    return { design };
  }

  /**
   * Assembles the brand context a design needs from what the tenant has already
   * stored: profile, services and account contact details.
   */
  private async loadBrandContext(userId: string): Promise<Record<string, any>> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: {
        businessServices: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          // Load up to the densest template's capacity; each template slices
          // down to what it can show. Capping here silently starved the
          // two-column layouts of the rows they were designed for.
          take: 10,
          select: { name: true },
        },
      },
    });

    if (!profile) return {};

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });

    const usps = this.parseJsonArray(profile.uniqueSellingPoints);
    const services = profile.businessServices.map((svc) => svc.name);

    return {
      businessName: profile.businessName,
      tagline: profile.tagline,
      valueProposition: profile.valueProposition,
      description: profile.description,
      industry: profile.industry,
      brandColors: profile.brandColors || profile.primaryColors,
      logoUrl: profile.logoUrl,
      website: profile.website,
      address: profile.location,
      city: profile.city,
      country: profile.country,
      email: user?.email,
      phone: user?.phone,
      // Services are the natural bullet list on a flyer; fall back to USPs.
      highlights: services.length > 0 ? services : usps,
    };
  }

  private parseJsonArray(value: unknown): string[] {
    if (Array.isArray(value)) return value as string[];
    if (typeof value !== 'string' || !value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  private async callAnthropicForDesign(
    prompt: string,
    width: number,
    height: number,
    category: string,
    style: string,
    businessContext: Record<string, any>,
  ): Promise<string> {
    const apiKey = await this.credentialsService.get('ANTHROPIC_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'No ANTHROPIC_API_KEY configured. Returning mock design template.',
      );
      return await this.generateMockTemplate(
        prompt,
        width,
        height,
        category,
        style,
        businessContext,
      );
    }

    const brandSection = Object.keys(businessContext).length
      ? `Brand context:
- Business name: ${businessContext.businessName || 'N/A'}
- Brand colors: ${businessContext.brandColors || 'Use professional defaults'}
- Tagline: ${businessContext.tagline || 'N/A'}
- Industry: ${businessContext.industry || 'General'}`
      : 'No specific brand context provided. Use professional, appealing defaults.';

    const systemPrompt = `You are an expert graphic designer who creates beautiful marketing designs as HTML with inline CSS.
You output ONLY the raw HTML code with no markdown fences, no explanation, no commentary.
The HTML must be a single self-contained page with all styles inline or in a <style> tag in the <head>.
Use modern CSS features: flexbox, grid, gradients, shadows, rounded corners, and Google Fonts via @import.
The design must look like a professional marketing asset, NOT a web page.
Do NOT include any interactive elements, scripts, or form elements.
All text must use web-safe fonts or Google Fonts loaded via @import.
Use vivid, high-contrast colors appropriate for marketing materials.
Include decorative elements like geometric shapes, gradients, and visual hierarchy.`;

    const userPrompt = `Create a ${category.toLowerCase().replace('_', ' ')} design with these specifications:

Dimensions: exactly ${width}px wide and ${height}px tall.
Style: ${style}
Content request: ${prompt}

${brandSection}

Requirements:
1. The <body> must have margin:0, padding:0, overflow:hidden
2. The root container must be exactly ${width}px x ${height}px
3. Use a visually striking layout with clear hierarchy
4. Include placeholder text that matches the content request
5. Use high-quality typography with varied font weights and sizes
6. Add decorative visual elements (shapes, gradients, patterns) to make it visually rich
7. Ensure all text is readable with proper contrast
8. The design should look print-ready and professional

Output the complete HTML document only.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `Anthropic API error: ${response.status} - ${errorBody}`,
        );
        return await this.generateMockTemplate(
        prompt,
        width,
        height,
        category,
        style,
        businessContext,
      );
      }

      const data = (await response.json()) as {
        content: Array<{ type: string; text?: string }>;
      };

      const textBlock = data.content?.find((block) => block.type === 'text');
      if (!textBlock?.text) {
        this.logger.error('No text content in Anthropic response');
        return await this.generateMockTemplate(
        prompt,
        width,
        height,
        category,
        style,
        businessContext,
      );
      }

      // Clean up response - remove markdown fences if present
      let html = textBlock.text.trim();
      if (html.startsWith('```html')) {
        html = html.slice(7);
      } else if (html.startsWith('```')) {
        html = html.slice(3);
      }
      if (html.endsWith('```')) {
        html = html.slice(0, -3);
      }
      return html.trim();
    } catch (error) {
      this.logger.error('Failed to call Anthropic API for design generation', error);
      return await this.generateMockTemplate(
        prompt,
        width,
        height,
        category,
        style,
        businessContext,
      );
    }
  }

  private async generateMockTemplate(
    prompt: string,
    width: number,
    height: number,
    category: string,
    style: string,
    businessContext: Record<string, any>,
  ): Promise<string> {
    const brandName = businessContext.businessName || 'Your Brand';

    // The prompt is an instruction to a designer, not copy. Putting it on the
    // artwork leaks wording like "Clinic introduction post for..." into the
    // finished asset, so prefer real brand copy and fall back to the prompt
    // only when there is nothing else.
    const headline =
      businessContext.tagline ||
      this.deriveHeadline(prompt, category);
    const tagline =
      businessContext.valueProposition ||
      businessContext.description ||
      (businessContext.tagline ? this.deriveHeadline(prompt, category) : prompt);

    const stylePresets: Record<string, { bg: string; accent: string; font: string }> = {
      modern: { bg: '#0f172a', accent: '#6366f1', font: "'Inter', sans-serif" },
      minimal: { bg: '#ffffff', accent: '#18181b', font: "'Helvetica Neue', sans-serif" },
      bold: { bg: '#dc2626', accent: '#fbbf24', font: "'Montserrat', sans-serif" },
      corporate: { bg: '#1e3a5f', accent: '#60a5fa', font: "'Roboto', sans-serif" },
      creative: { bg: '#7c3aed', accent: '#f472b6', font: "'Poppins', sans-serif" },
      elegant: { bg: '#1c1917', accent: '#d4af37', font: "'Playfair Display', serif" },
    };

    const preset = stylePresets[style] || stylePresets.modern;
    // A supplied brand colour should win over the generic style accent.
    const brandAccent = this.firstHexColor(businessContext.brandColors);
    const s = brandAccent ? { ...preset, accent: brandAccent } : preset;
    const isTall = height > width;

    // Flyers and posters go through the template system: tokens, real
    // typography, a shape language and a dense archetype. The centred hero
    // below is only a fallback for sizes no archetype covers yet.
    if (
      category === 'FLYER' ||
      category === 'POSTER' ||
      category === 'SOCIAL_POST' ||
      category === 'AD'
    ) {
      return this.renderFromTemplate(
        businessContext.templateId,
        width,
        height,
        headline,
        tagline,
        { ...businessContext, category },
      );
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Montserrat:wght@400;700;900&family=Poppins:wght@400;600;800&family=Playfair+Display:wght@400;700&family=Roboto:wght@400;500;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { margin: 0; padding: 0; overflow: hidden; }
  .design-container {
    width: ${width}px;
    height: ${height}px;
    background: ${s.bg};
    font-family: ${s.font};
    color: #ffffff;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .bg-shape-1 {
    position: absolute;
    top: -${Math.round(height * 0.15)}px;
    right: -${Math.round(width * 0.1)}px;
    width: ${Math.round(width * 0.5)}px;
    height: ${Math.round(width * 0.5)}px;
    background: ${s.accent};
    border-radius: 50%;
    opacity: 0.15;
  }
  .bg-shape-2 {
    position: absolute;
    bottom: -${Math.round(height * 0.1)}px;
    left: -${Math.round(width * 0.08)}px;
    width: ${Math.round(width * 0.35)}px;
    height: ${Math.round(width * 0.35)}px;
    background: ${s.bg === '#ffffff' ? s.accent : '#ffffff'};
    border-radius: 50%;
    opacity: 0.08;
  }
  .content {
    position: relative;
    z-index: 2;
    padding: ${isTall ? '60px 40px' : '40px 60px'};
    max-width: 90%;
  }
  .brand-name {
    font-size: ${Math.round(width * 0.04)}px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: ${s.accent};
    margin-bottom: ${Math.round(height * 0.03)}px;
  }
  .headline {
    font-size: ${Math.round(width * 0.065)}px;
    font-weight: 800;
    line-height: 1.15;
    margin-bottom: ${Math.round(height * 0.03)}px;
    color: #ffffff;
  }
  .tagline {
    font-size: ${Math.round(width * 0.028)}px;
    font-weight: 400;
    opacity: 0.85;
    line-height: 1.5;
    margin-bottom: ${Math.round(height * 0.04)}px;
  }
  .cta-button {
    display: inline-block;
    padding: ${Math.round(height * 0.02)}px ${Math.round(width * 0.06)}px;
    background: ${s.accent};
    color: #ffffff;
    font-size: ${Math.round(width * 0.025)}px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-radius: ${Math.round(width * 0.008)}px;
  }
  .divider {
    width: ${Math.round(width * 0.12)}px;
    height: 4px;
    background: ${s.accent};
    margin: ${Math.round(height * 0.025)}px auto;
    border-radius: 2px;
  }
</style>
</head>
<body>
<div class="design-container">
  <div class="bg-shape-1"></div>
  <div class="bg-shape-2"></div>
  <div class="content">
    <div class="brand-name">${this.escapeHtml(brandName)}</div>
    <div class="divider"></div>
    <h1 class="headline">${this.escapeHtml(headline)}</h1>
    <p class="tagline">${this.escapeHtml(tagline)}</p>
    <div class="cta-button">Learn More</div>
  </div>
</div>
</body>
</html>`;
  }

  /**
   * brandColors is free text ("Deep blue (#1a365d), White"), so pull the first
   * usable hex value out of it rather than trusting the whole string.
   */
  /**
   * Assembles a TemplateContext and renders one archetype.
   *
   * All I/O - icon resolution above all - happens here, so templates stay
   * synchronous and pure.
   */
  private async renderFromTemplate(
    templateId: string | undefined,
    width: number,
    height: number,
    headline: string,
    subheadline: string,
    ctx: Record<string, any>,
  ): Promise<string> {
    const template = selectTemplate({
      templateId: templateId || ctx.templateId,
      hasPhoto: Boolean(ctx.heroImageUrl),
      category: ctx.category,
    });

    const palette = buildPalette(this.firstHexColor(ctx.brandColors));
    const mood = moodForIndustry(ctx.industry, ctx.subIndustry);
    const type = TYPE_PAIRS[mood];
    const brandName = ctx.businessName || 'Your Brand';
    const seed = seedFrom(brandName);

    const highlights: string[] = Array.isArray(ctx.highlights)
      ? ctx.highlights.slice(0, template.featureCapacity)
      : [];

    // Marks must contrast with whatever the template puts behind them.
    const iconColor =
      template.surface === 'accent' ? palette.onAccent : palette.accent;
    const contactIconColor =
      template.surface === 'accent' ? palette.accent : palette.accentAlt;

    const featureIcons = await this.assetsService.iconsForFeatures(highlights, {
      industry: ctx.industry,
      color: iconColor,
      size: 48,
    });
    const features: FeatureItem[] = highlights.map((text, i) => ({
      text,
      iconSvg: featureIcons[i]?.svg ?? '',
    }));

    const contactSpec: { concept: string; text: string }[] = [];
    if (ctx.address) contactSpec.push({ concept: 'location', text: String(ctx.address) });
    if (ctx.phone) contactSpec.push({ concept: 'phone', text: String(ctx.phone) });
    if (ctx.email) contactSpec.push({ concept: 'email', text: String(ctx.email) });
    if (ctx.website) {
      contactSpec.push({
        concept: 'website',
        text: String(ctx.website).replace(/^https?:[/][/]/, ''),
      });
    }
    const contactIcons = await this.assetsService.getIcons(
      contactSpec.map((c) => c.concept),
      { color: contactIconColor, size: 40 },
    );
    const contact: ContactLine[] = contactSpec.map((c, i) => ({
      text: c.text,
      iconSvg: contactIcons[i]?.svg ?? '',
    }));

    // Trust markers: explicit if supplied, otherwise the brand's own USPs.
    const badgeTexts: string[] = Array.isArray(ctx.badges)
      ? ctx.badges.slice(0, 4)
      : Array.isArray(ctx.uniqueSellingPoints)
        ? ctx.uniqueSellingPoints.slice(0, 4)
        : [];
    const badgeIcons = await this.assetsService.iconsForFeatures(badgeTexts, {
      industry: ctx.industry,
      color: palette.accent,
      size: 40,
    });
    const badges: FeatureItem[] = badgeTexts.map((text, i) => ({
      text,
      iconSvg: badgeIcons[i]?.svg ?? '',
    }));

    const context: TemplateContext = {
      width,
      height,
      palette,
      type,
      seed,
      brandName,
      headline,
      subheadline,
      featuresTitle: ctx.featuresTitle,
      features,
      contact,
      timings: Array.isArray(ctx.timings) ? ctx.timings.slice(0, 4) : [],
      badges,
      ctaText: ctx.ctaText || 'Book your appointment today',
      heroImageUrl: ctx.heroImageUrl,
      cutoutUrl: ctx.cutoutUrl,
      photoCredit: ctx.photoCredit,
      logoUrl: ctx.logoUrl,
      escape: (v: string) => this.escapeHtml(v),
    };

    return template.render(context);
  }

  private firstHexColor(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const match = value.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
    return match ? match[0] : null;
  }

  private deriveHeadline(prompt: string, category: string): string {
    // Create a shorter headline from the prompt
    if (prompt.length <= 40) return prompt;
    const words = prompt.split(' ');
    let headline = '';
    for (const word of words) {
      if ((headline + ' ' + word).trim().length > 40) break;
      headline = (headline + ' ' + word).trim();
    }
    return headline || prompt.substring(0, 40);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ---- CRUD ----

  async getDesigns(userId: string, filters: DesignFilterDto) {
    const { category, limit = 20, offset = 0 } = filters;

    const where: any = { userId };
    if (category) where.category = category;

    const [designs, total] = await Promise.all([
      this.prisma.design.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      this.prisma.design.count({ where }),
    ]);

    return { designs, total, limit: Number(limit), offset: Number(offset) };
  }

  async getDesignById(userId: string, designId: string) {
    const design = await this.prisma.design.findUnique({
      where: { id: designId },
    });

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    if (design.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return design;
  }

  async updateDesign(userId: string, designId: string, dto: UpdateDesignDto) {
    const design = await this.getDesignById(userId, designId);

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.htmlContent !== undefined) updateData.htmlContent = dto.htmlContent;
    if (dto.cssContent !== undefined) updateData.cssContent = dto.cssContent;

    return this.prisma.design.update({
      where: { id: designId },
      data: updateData,
    });
  }

  async deleteDesign(userId: string, designId: string) {
    await this.getDesignById(userId, designId);

    await this.prisma.design.delete({
      where: { id: designId },
    });

    return { message: 'Design deleted successfully' };
  }

  // ---- Render ----

  /**
   * Renders a design and, when S3 is configured, stores it so the result has a
   * public URL. Social platforms download media by URL, so a design that is only
   * streamed back to the browser can never be attached to a post.
   */
  async renderDesign(userId: string, designId: string, dto: RenderDesignDto) {
    const design = await this.getDesignById(userId, designId);

    await this.subscriptionsService.consumeCredits(
      userId,
      'DESIGN_RENDER',
      designId,
    );

    const format = (dto.format || 'PNG').toLowerCase() as 'png' | 'pdf';

    const rendered = await this.rendererService.renderToImage(
      design.htmlContent,
      design.width,
      design.height,
      format,
    );

    // Only a real render is worth storing - a placeholder must never end up as
    // the asset a post points at.
    let hostedUrl: string | null = null;
    let storageWarning: string | undefined;

    if (rendered.renderer === 'puppeteer') {
      try {
        const upload = await this.uploadService.uploadBuffer(rendered.buffer, {
          folder: `designs/${userId}`,
          extension: rendered.extension,
          contentType: rendered.contentType,
        });
        hostedUrl = upload.url;

        // File the render and its editable HTML source, so either can be reused.
        const designFolder = `designs/${String(design.category || 'other').toLowerCase()}`;
        const source = await this.library
          .store(
            userId,
            {
              buffer: Buffer.from(design.htmlContent, 'utf-8'),
              mimeType: 'text/html',
              extension: 'html',
              name: `${design.name}-source`,
            },
            { kind: 'design', folder: designFolder, title: `${design.name} (HTML source)`, source: 'designer', metadata: { designId } },
          )
          .catch(() => null);
        await this.library.recordQuietly(userId, {
          kind: 'design',
          folder: designFolder,
          title: design.name,
          url: upload.url,
          storageKey: upload.key,
          mimeType: rendered.contentType,
          extension: rendered.extension,
          sizeBytes: rendered.buffer.length,
          width: design.width,
          height: design.height,
          source: 'render',
          parentId: source?.id,
          metadata: { designId, template: design.template },
        });
      } catch (error) {
        storageWarning = `Rendered successfully but could not be stored: ${(error as Error).message}`;
        this.logger.warn(storageWarning);
      }
    }

    await this.prisma.design.update({
      where: { id: designId },
      data: {
        // Keep the previous URL if this render could not be stored, rather than
        // overwriting a good asset with nothing.
        ...(hostedUrl ? { outputUrl: hostedUrl } : {}),
        creditsConsumed: design.creditsConsumed + 5,
      },
    });

    return {
      buffer: rendered.buffer,
      format,
      contentType: rendered.contentType,
      extension: rendered.extension,
      url: hostedUrl,
      renderer: rendered.renderer,
      warning: rendered.warning ?? storageWarning,
    };
  }

  /**
   * Renders, stores and returns just the public URL - the shape the content and
   * publishing endpoints need for `mediaUrls`.
   */
  async exportDesignAsset(
    userId: string,
    designId: string,
    dto: RenderDesignDto,
  ) {
    const result = await this.renderDesign(userId, designId, dto);

    if (!result.url) {
      throw new BadRequestException(
        result.warning ||
          'The design could not be stored, so it has no public URL. Check the server S3 credentials and that Puppeteer is installed.',
      );
    }

    const design = await this.getDesignById(userId, designId);
    return {
      designId,
      url: result.url,
      format: result.format,
      width: design.width,
      height: design.height,
    };
  }

  // ---- Duplicate ----

  async duplicateDesign(userId: string, designId: string) {
    const design = await this.getDesignById(userId, designId);

    const duplicate = await this.prisma.design.create({
      data: {
        userId,
        name: `${design.name} (Copy)`,
        template: design.template,
        category: design.category,
        htmlContent: design.htmlContent,
        cssContent: design.cssContent,
        width: design.width,
        height: design.height,
        sizePreset: design.sizePreset,
        creditsConsumed: 0,
      },
    });

    return { design: duplicate };
  }

  // ---- Presets & Templates ----

  getPresets() {
    return {
      presets: Object.entries(SIZE_PRESETS).map(([key, value]) => ({
        id: key,
        ...value,
      })),
    };
  }

  getTemplates() {
    return { templates: DESIGN_TEMPLATES };
  }
}
