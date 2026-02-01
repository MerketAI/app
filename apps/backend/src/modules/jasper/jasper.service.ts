import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';

export interface ContentGenerationRequest {
  platform: 'instagram' | 'facebook' | 'blog';
  contentType: 'image_post' | 'video_post' | 'carousel' | 'article';
  topic?: string;
  tone?: 'professional' | 'casual' | 'humorous' | 'inspirational';
  length?: 'short' | 'medium' | 'long';
  includeMedia?: boolean;
  keywords?: string[];
  targetAudience?: string;
  brandContext?: {
    businessName?: string;
    industry?: string;
    services?: string[];
    products?: string[];
  };
}

export interface GeneratedContent {
  caption?: string;
  body?: string;
  hashtags: string[];
  title?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  mediaPrompt?: string;
  suggestions?: string[];
}

export interface TrendingTopic {
  topic: string;
  score: number;
  hashtags: string[];
  keywords: string[];
  category?: string;
}

@Injectable()
export class JasperService {
  private readonly DEFAULT_API_URL = 'https://api.jasper.ai/v1';

  constructor(
    private prisma: PrismaService,
    private credentialsService: CredentialsService,
  ) {}

  private async getApiConfig(): Promise<{ apiKey: string; apiUrl: string }> {
    const apiKey = await this.credentialsService.get('JASPER_API_KEY') || '';
    const apiUrl = await this.credentialsService.get('JASPER_API_URL') || this.DEFAULT_API_URL;
    return { apiKey, apiUrl };
  }

  async generateContent(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const prompt = this.buildPrompt(request);
    const { apiKey, apiUrl } = await this.getApiConfig();

    // If Jasper API is not configured, use a mock response
    if (!apiKey) {
      return this.getMockContent(request);
    }

    try {
      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'jasper-pro',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(request.platform),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new BadRequestException('Failed to generate content');
      }

      const data = await response.json();
      return this.parseResponse(data, request);
    } catch (error) {
      console.error('Jasper API error:', error);
      return this.getMockContent(request);
    }
  }

  async getTrendingTopics(
    industry?: string,
    location?: string,
  ): Promise<TrendingTopic[]> {
    // Check cache first
    const cachedTopics = await this.prisma.trendingTopic.findMany({
      where: {
        expiresAt: { gt: new Date() },
        ...(industry && { category: industry }),
        ...(location && { region: location }),
      },
      orderBy: { score: 'desc' },
      take: 10,
    });

    if (cachedTopics.length >= 5) {
      return cachedTopics.map((t) => ({
        topic: t.topic,
        score: t.score,
        hashtags: JSON.parse(t.hashtags) as string[],
        keywords: JSON.parse(t.keywords) as string[],
        category: t.category || undefined,
      }));
    }

    // Generate new trending topics
    return this.generateTrendingTopics(industry, location);
  }

  async generateImagePrompt(
    topic: string,
    brandContext?: ContentGenerationRequest['brandContext'],
  ): Promise<string> {
    const basePrompt = `Create a professional, visually appealing image for social media about: ${topic}`;
    const styleGuide = brandContext?.industry
      ? `Style should match ${brandContext.industry} industry aesthetics.`
      : 'Modern, clean, and professional style.';

    return `${basePrompt}. ${styleGuide} High quality, suitable for Instagram and Facebook.`;
  }

  async generateVariations(
    content: string,
    count: number = 3,
  ): Promise<string[]> {
    const { apiKey, apiUrl } = await this.getApiConfig();

    if (!apiKey) {
      return [
        content,
        `${content} (Variation 1)`,
        `${content} (Variation 2)`,
      ].slice(0, count);
    }

    try {
      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'jasper-pro',
          messages: [
            {
              role: 'user',
              content: `Create ${count} variations of this social media post while keeping the same meaning and tone:\n\n"${content}"\n\nReturn as JSON array of strings.`,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      const data = await response.json();
      return data.choices[0]?.message?.content
        ? JSON.parse(data.choices[0].message.content).variations
        : [content];
    } catch {
      return [content];
    }
  }

  private buildPrompt(request: ContentGenerationRequest): string {
    const { platform, contentType, topic, tone, length, brandContext, targetAudience } = request;

    let prompt = `Generate ${platform} content for a ${contentType}.`;

    if (topic) {
      prompt += ` Topic: ${topic}.`;
    }

    if (tone) {
      prompt += ` Tone: ${tone}.`;
    }

    if (length) {
      const lengthGuide = {
        short: 'Keep it brief (under 100 words for posts, under 300 for articles).',
        medium: 'Moderate length (100-200 words for posts, 500-800 for articles).',
        long: 'Comprehensive (200+ words for posts, 1000+ for articles).',
      };
      prompt += ` ${lengthGuide[length]}`;
    }

    if (brandContext) {
      if (brandContext.businessName) {
        prompt += ` Business: ${brandContext.businessName}.`;
      }
      if (brandContext.industry) {
        prompt += ` Industry: ${brandContext.industry}.`;
      }
      if (brandContext.services?.length) {
        prompt += ` Services: ${brandContext.services.join(', ')}.`;
      }
      if (brandContext.products?.length) {
        prompt += ` Products: ${brandContext.products.join(', ')}.`;
      }
    }

    if (targetAudience) {
      prompt += ` Target audience: ${targetAudience}.`;
    }

    prompt += ` Return JSON with: caption (for social), body (for blog), hashtags array, title, seoTitle, seoDescription, seoKeywords array, and mediaPrompt for image generation.`;

    return prompt;
  }

  private getSystemPrompt(platform: string): string {
    const prompts: Record<string, string> = {
      instagram: `You are a social media marketing expert specializing in Instagram content. Create engaging, visually-driven content that encourages interaction. Use relevant hashtags (max 30). Keep captions compelling but not too long.`,
      facebook: `You are a social media marketing expert specializing in Facebook content. Create content that drives engagement and shares. Balance informative content with calls to action. Use hashtags sparingly (3-5).`,
      blog: `You are a content marketing expert specializing in SEO-optimized blog posts. Create informative, well-structured content with proper headings, engaging introduction, and clear conclusion. Include SEO metadata.`,
    };

    return prompts[platform] || prompts.instagram;
  }

  private parseResponse(
    data: any,
    request: ContentGenerationRequest,
  ): GeneratedContent {
    try {
      const content = JSON.parse(data.choices[0]?.message?.content || '{}');
      return {
        caption: content.caption,
        body: content.body,
        hashtags: content.hashtags || [],
        title: content.title,
        seoTitle: content.seoTitle,
        seoDescription: content.seoDescription,
        seoKeywords: content.seoKeywords || [],
        mediaPrompt: content.mediaPrompt,
        suggestions: content.suggestions,
      };
    } catch {
      return this.getMockContent(request);
    }
  }

  private getMockContent(request: ContentGenerationRequest): GeneratedContent {
    const topic = request.topic || 'your business';
    const platformContent: Record<string, GeneratedContent> = {
      instagram: {
        caption: `Discover the amazing benefits of ${topic}! Our team is dedicated to delivering excellence every single day. What aspects matter most to you? Share in the comments below!`,
        hashtags: [
          'business',
          'success',
          'motivation',
          'entrepreneur',
          'growth',
          'innovation',
          'quality',
          'excellence',
          topic.toLowerCase().replace(/\s+/g, ''),
        ],
        mediaPrompt: `Professional photo showcasing ${topic}, modern aesthetic, bright lighting, clean background`,
      },
      facebook: {
        caption: `We're excited to share our thoughts on ${topic}! At our company, we believe in delivering value to our community. What do you think? Let us know in the comments!`,
        hashtags: ['business', 'community', 'value'],
        mediaPrompt: `Engaging image about ${topic}, suitable for Facebook, professional quality`,
      },
      blog: {
        title: `The Complete Guide to ${topic}`,
        body: `# Introduction to ${topic}\n\nIn today's competitive landscape, understanding ${topic} is more important than ever. This comprehensive guide will walk you through everything you need to know.\n\n## Why ${topic} Matters\n\nBusinesses of all sizes are discovering the benefits of ${topic}. Here's why it should be on your radar...\n\n## Key Benefits\n\n1. **Increased Efficiency** - Streamline your operations\n2. **Better Results** - Achieve your goals faster\n3. **Competitive Advantage** - Stay ahead of the competition\n\n## Getting Started\n\nReady to dive in? Here's how to get started with ${topic}...\n\n## Conclusion\n\n${topic} represents a significant opportunity for growth. Take the first step today!`,
        hashtags: [],
        seoTitle: `${topic}: A Complete Guide for 2024`,
        seoDescription: `Learn everything about ${topic}. This comprehensive guide covers benefits, strategies, and actionable tips to help you succeed.`,
        seoKeywords: [topic.toLowerCase(), 'guide', 'tips', 'strategy', 'business'],
        mediaPrompt: `Featured image for blog post about ${topic}, professional, informative style`,
      },
    };

    return platformContent[request.platform] || platformContent.instagram;
  }

  private async generateTrendingTopics(
    industry?: string,
    location?: string,
  ): Promise<TrendingTopic[]> {
    // Mock trending topics for demo
    const mockTopics: TrendingTopic[] = [
      {
        topic: 'AI in Business',
        score: 95,
        hashtags: ['AI', 'ArtificialIntelligence', 'FutureOfWork', 'TechTrends'],
        keywords: ['artificial intelligence', 'machine learning', 'automation'],
        category: 'Technology',
      },
      {
        topic: 'Sustainable Practices',
        score: 88,
        hashtags: ['Sustainability', 'GreenBusiness', 'EcoFriendly', 'ClimateAction'],
        keywords: ['sustainability', 'eco-friendly', 'green business'],
        category: 'Environment',
      },
      {
        topic: 'Remote Work Culture',
        score: 85,
        hashtags: ['RemoteWork', 'WFH', 'DigitalNomad', 'FutureOfWork'],
        keywords: ['remote work', 'work from home', 'hybrid work'],
        category: 'Business',
      },
      {
        topic: 'Customer Experience',
        score: 82,
        hashtags: ['CX', 'CustomerExperience', 'CustomerFirst', 'CustomerSuccess'],
        keywords: ['customer experience', 'customer service', 'customer satisfaction'],
        category: 'Marketing',
      },
      {
        topic: 'Digital Marketing Trends',
        score: 80,
        hashtags: ['DigitalMarketing', 'MarketingTips', 'ContentMarketing', 'SEO'],
        keywords: ['digital marketing', 'social media marketing', 'content strategy'],
        category: 'Marketing',
      },
    ];

    // Cache the topics
    for (const topic of mockTopics) {
      await this.prisma.trendingTopic.create({
        data: {
          topic: topic.topic,
          score: topic.score,
          hashtags: JSON.stringify(topic.hashtags),
          keywords: JSON.stringify(topic.keywords),
          category: topic.category,
          region: location,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });
    }

    return mockTopics;
  }
}
