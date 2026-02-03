import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { GeneratePageDto, PageBlock } from './dto';
import { v4 as uuidv4 } from 'uuid';

// Credit cost for AI page generation
const AI_PAGE_GENERATION_COST = 15;

// Type definitions for Anthropic SDK
interface AnthropicMessage {
  content: Array<{ type: string; text?: string }>;
}

interface AnthropicClient {
  messages: {
    create: (params: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
      system: string;
    }) => Promise<AnthropicMessage>;
  };
}

@Injectable()
export class AiPageService {
  private anthropic: AnthropicClient | null = null;
  private initialized = false;

  constructor(
    private prisma: PrismaService,
    private credentialsService: CredentialsService,
  ) {}

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    await this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    try {
      const apiKey = await this.credentialsService.get('ANTHROPIC_API_KEY');
      if (apiKey) {
        // Use require to avoid TypeScript module resolution errors
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Anthropic = require('@anthropic-ai/sdk').default;
        this.anthropic = new Anthropic({ apiKey }) as AnthropicClient;
      } else {
        this.anthropic = null;
      }
    } catch (error) {
      console.warn('Anthropic SDK not available. AI features will be disabled. Install with: npm install @anthropic-ai/sdk');
      this.anthropic = null;
    }
    this.initialized = true;
  }

  /**
   * Reinitialize the Anthropic client (call when credentials are updated)
   */
  async reinitialize(): Promise<void> {
    this.initialized = false;
    await this.initializeClient();
  }

  async generatePage(
    userId: string,
    dto: GeneratePageDto,
  ): Promise<{ blocks: PageBlock[]; htmlContent: string }> {
    await this.ensureInitialized();

    if (!this.anthropic) {
      throw new BadRequestException('AI service is not configured. Please set ANTHROPIC_API_KEY in Admin > API Credentials.');
    }

    // Check user credits
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || subscription.creditsRemaining < AI_PAGE_GENERATION_COST) {
      throw new BadRequestException(
        `Insufficient credits. AI page generation requires ${AI_PAGE_GENERATION_COST} credits.`,
      );
    }

    // Generate the page using Claude
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(dto);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        system: systemPrompt,
      });

      // Extract the response text
      const responseText = response.content
        .filter((block: { type: string; text?: string }) => block.type === 'text')
        .map((block: { type: string; text?: string }) => block.text || '')
        .join('');

      // Parse the JSON response
      const { blocks, htmlContent } = this.parseAiResponse(responseText);

      // Deduct credits
      await this.prisma.$transaction([
        this.prisma.subscription.update({
          where: { userId },
          data: {
            creditsRemaining: subscription.creditsRemaining - AI_PAGE_GENERATION_COST,
          },
        }),
        this.prisma.creditTransaction.create({
          data: {
            userId,
            type: 'CREDIT_USAGE',
            amount: -AI_PAGE_GENERATION_COST,
            balance: subscription.creditsRemaining - AI_PAGE_GENERATION_COST,
            description: 'AI page generation',
          },
        }),
      ]);

      return { blocks, htmlContent };
    } catch (error) {
      console.error('AI page generation error:', error);
      throw new BadRequestException('Failed to generate page. Please try again.');
    }
  }

  async generateSection(
    userId: string,
    sectionType: string,
    prompt: string,
  ): Promise<PageBlock> {
    await this.ensureInitialized();

    if (!this.anthropic) {
      throw new BadRequestException('AI service is not configured. Please set ANTHROPIC_API_KEY in Admin > API Credentials.');
    }

    const sectionCost = 5;

    // Check user credits
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || subscription.creditsRemaining < sectionCost) {
      throw new BadRequestException(
        `Insufficient credits. Section generation requires ${sectionCost} credits.`,
      );
    }

    const systemPrompt = `You are a web section generator. Generate a single page section/block with Tailwind CSS styling.
Return ONLY valid JSON in this exact format:
{
  "id": "unique-id",
  "type": "${sectionType}",
  "props": { /* section-specific properties */ },
  "html": "<section class=\"tailwind classes\">...</section>"
}

The HTML should be:
- Fully responsive (mobile-first with sm:, md:, lg: breakpoints)
- Use modern Tailwind CSS classes
- Include realistic placeholder content
- Be self-contained and complete`;

    const userPromptText = `Generate a ${sectionType} section with this description: ${prompt}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: userPromptText,
          },
        ],
        system: systemPrompt,
      });

      const responseText = response.content
        .filter((block: { type: string; text?: string }) => block.type === 'text')
        .map((block: { type: string; text?: string }) => block.text || '')
        .join('');

      const block = this.parseJsonFromResponse(responseText);

      // Deduct credits
      await this.prisma.$transaction([
        this.prisma.subscription.update({
          where: { userId },
          data: {
            creditsRemaining: subscription.creditsRemaining - sectionCost,
          },
        }),
        this.prisma.creditTransaction.create({
          data: {
            userId,
            type: 'CREDIT_USAGE',
            amount: -sectionCost,
            balance: subscription.creditsRemaining - sectionCost,
            description: `AI section generation: ${sectionType}`,
          },
        }),
      ]);

      return {
        id: block.id || uuidv4(),
        type: sectionType,
        props: block.props || {},
        html: block.html,
      };
    } catch (error) {
      console.error('AI section generation error:', error);
      throw new BadRequestException('Failed to generate section. Please try again.');
    }
  }

  private buildSystemPrompt(): string {
    return `You are an expert web page builder. Your task is to generate complete, professional web pages using HTML with Tailwind CSS.

OUTPUT FORMAT:
Return ONLY valid JSON in this exact structure:
{
  "blocks": [
    {
      "id": "unique-uuid",
      "type": "section-type",
      "props": { /* section-specific properties */ },
      "html": "<section>...</section>"
    }
  ],
  "htmlContent": "<!-- Full concatenated HTML of all blocks -->"
}

SECTION TYPES you can create:
- hero: Hero section with headline, subheadline, CTA buttons
- features: Feature grid (3-4 columns with icons)
- testimonials: Customer testimonials/reviews
- pricing: Pricing cards/tables
- cta: Call-to-action banner
- text: Rich text content section
- image: Full-width or contained image
- gallery: Image gallery grid
- faq: FAQ accordion section
- contact: Contact form section
- team: Team member cards
- stats: Statistics/numbers section
- logos: Client/partner logo grid
- services: Services overview
- about: About section
- footer: Page footer

REQUIREMENTS:
1. Use Tailwind CSS classes only (no custom CSS)
2. Make everything fully responsive (mobile-first approach)
3. Use semantic HTML5 elements
4. Include realistic placeholder content based on the request
5. Use consistent spacing (py-16, py-20, py-24)
6. Use a cohesive color scheme
7. Include hover states for interactive elements
8. Use modern design patterns
9. Images should use placeholder URLs like https://placehold.co/800x400
10. Icons can be represented with emoji or placeholder text like [icon]

COLOR CLASSES TO USE:
- Primary actions: bg-blue-600, hover:bg-blue-700, text-blue-600
- Text: text-gray-900 (headings), text-gray-600 (body)
- Backgrounds: bg-white, bg-gray-50, bg-gray-100
- Accents: Can vary based on style preference`;
  }

  private buildUserPrompt(dto: GeneratePageDto): string {
    const styleGuide = this.getStyleGuide(dto.style || 'modern');
    const pageTypeGuide = this.getPageTypeGuide(dto.pageType);

    return `Create a ${dto.pageType} page with the following requirements:

USER REQUEST: ${dto.prompt}

PAGE TYPE: ${dto.pageType}
${pageTypeGuide}

STYLE: ${dto.style || 'modern'}
${styleGuide}

Generate a complete page with appropriate sections. Include 4-7 sections that make sense for this page type.
Remember to output ONLY valid JSON with "blocks" and "htmlContent" fields.`;
  }

  private getStyleGuide(style: string): string {
    const guides: Record<string, string> = {
      modern:
        'Use clean lines, generous whitespace, subtle shadows, and rounded corners. Color palette should be vibrant but not overwhelming.',
      minimal:
        'Extremely clean with lots of whitespace. Limited color palette (black, white, one accent). Simple typography, no decorative elements.',
      bold: 'Strong colors, large typography, impactful visuals. Use gradients and strong contrasts. Make elements prominent.',
      corporate:
        'Professional and trustworthy. Use blues and grays. Structured layouts, clear hierarchy. Conservative design choices.',
      creative:
        'Unique and artistic. Can use asymmetric layouts, unusual color combinations, creative typography. Stand out from typical designs.',
      elegant:
        'Sophisticated and refined. Use serif fonts for headings, muted colors, subtle animations. Focus on typography and spacing.',
    };

    return guides[style] || guides.modern;
  }

  private getPageTypeGuide(pageType: string): string {
    const guides: Record<string, string> = {
      landing:
        'Include: Hero with strong headline and CTA, features/benefits section, social proof (testimonials/logos), pricing if applicable, final CTA.',
      about:
        'Include: Company story/mission section, team section if relevant, values or what we believe, timeline or history, contact info.',
      services:
        'Include: Overview of services, individual service cards with details, process or how it works, testimonials, CTA to get started.',
      contact:
        'Include: Contact form, multiple contact methods (email, phone, address), map placeholder, FAQ about contacting, response time info.',
      pricing:
        'Include: Pricing cards (3 tiers recommended), feature comparison, FAQ about billing, testimonials, CTA for each tier.',
      blog: 'Include: Featured post section, recent posts grid, categories/topics, newsletter signup, about the blog section.',
      portfolio:
        'Include: Portfolio grid or masonry layout, filtering by category, individual project showcases, about section, contact CTA.',
      team: 'Include: Team member cards with photos/bios, department groupings if needed, company culture section, careers CTA.',
    };

    return guides[pageType] || guides.landing;
  }

  private parseAiResponse(response: string): {
    blocks: PageBlock[];
    htmlContent: string;
  } {
    const parsed = this.parseJsonFromResponse(response);

    if (!parsed.blocks || !Array.isArray(parsed.blocks)) {
      throw new BadRequestException('Invalid AI response format');
    }

    // Ensure each block has required fields
    const blocks: PageBlock[] = parsed.blocks.map((block: any) => ({
      id: block.id || uuidv4(),
      type: block.type || 'custom',
      props: block.props || {},
      html: block.html || '',
    }));

    // Concatenate HTML if not provided
    const htmlContent =
      parsed.htmlContent || blocks.map((b) => b.html).join('\n');

    return { blocks, htmlContent };
  }

  private parseJsonFromResponse(response: string): any {
    // Try to extract JSON from the response
    // Sometimes Claude might include markdown code blocks
    let jsonStr = response;

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Try to find JSON object in the response
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Failed to parse AI response:', response);
      throw new BadRequestException('Failed to parse AI response');
    }
  }
}
