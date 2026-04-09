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

    let businessContext: Record<string, any> = {};
    if (dto.businessContext) {
      try {
        businessContext = JSON.parse(dto.businessContext);
      } catch {
        throw new BadRequestException('businessContext must be a valid JSON string');
      }
    }

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
      return this.generateMockTemplate(prompt, width, height, category, style, businessContext);
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
        return this.generateMockTemplate(prompt, width, height, category, style, businessContext);
      }

      const data = (await response.json()) as {
        content: Array<{ type: string; text?: string }>;
      };

      const textBlock = data.content?.find((block) => block.type === 'text');
      if (!textBlock?.text) {
        this.logger.error('No text content in Anthropic response');
        return this.generateMockTemplate(prompt, width, height, category, style, businessContext);
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
      return this.generateMockTemplate(prompt, width, height, category, style, businessContext);
    }
  }

  private generateMockTemplate(
    prompt: string,
    width: number,
    height: number,
    category: string,
    style: string,
    businessContext: Record<string, any>,
  ): string {
    const brandName = businessContext.businessName || 'Your Brand';
    const brandColor = businessContext.brandColors || '#6366f1';
    const tagline = businessContext.tagline || prompt;

    const stylePresets: Record<string, { bg: string; accent: string; font: string }> = {
      modern: { bg: '#0f172a', accent: '#6366f1', font: "'Inter', sans-serif" },
      minimal: { bg: '#ffffff', accent: '#18181b', font: "'Helvetica Neue', sans-serif" },
      bold: { bg: '#dc2626', accent: '#fbbf24', font: "'Montserrat', sans-serif" },
      corporate: { bg: '#1e3a5f', accent: '#60a5fa', font: "'Roboto', sans-serif" },
      creative: { bg: '#7c3aed', accent: '#f472b6', font: "'Poppins', sans-serif" },
      elegant: { bg: '#1c1917', accent: '#d4af37', font: "'Playfair Display', serif" },
    };

    const s = stylePresets[style] || stylePresets.modern;
    const isTall = height > width;

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
    background: ${brandColor};
    border-radius: 50%;
    opacity: 0.2;
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
    <h1 class="headline">${this.escapeHtml(this.deriveHeadline(prompt, category))}</h1>
    <p class="tagline">${this.escapeHtml(tagline)}</p>
    <div class="cta-button">Learn More</div>
  </div>
</div>
</body>
</html>`;
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

  async renderDesign(userId: string, designId: string, dto: RenderDesignDto) {
    const design = await this.getDesignById(userId, designId);

    // Consume credits for rendering
    await this.subscriptionsService.consumeCredits(userId, 'DESIGN_RENDER', designId);

    const format = (dto.format || 'PNG').toLowerCase() as 'png' | 'pdf';

    const buffer = await this.rendererService.renderToImage(
      design.htmlContent,
      design.width,
      design.height,
      format,
    );

    // Update outputUrl field to indicate render has occurred
    await this.prisma.design.update({
      where: { id: designId },
      data: {
        outputUrl: `rendered:${format}:${new Date().toISOString()}`,
        creditsConsumed: design.creditsConsumed + 5,
      },
    });

    return { buffer, format };
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
