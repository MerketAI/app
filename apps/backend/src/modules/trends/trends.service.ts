import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';

interface TrendsFilter {
  category?: string;
  region?: string;
  limit?: number;
}

export interface ContentSuggestion {
  topic: string;
  type: string;
  platform: string;
  reason: string;
}

interface SerpApiTrendResult {
  query: string;
  value?: number;
  extracted_value?: number;
  link?: string;
}

@Injectable()
export class TrendsService {
  private readonly logger = new Logger(TrendsService.name);

  constructor(
    private prisma: PrismaService,
    private credentialsService: CredentialsService,
  ) {}

  async getTrends(filters: TrendsFilter) {
    const { category, region, limit = 20 } = filters;
    const now = new Date();

    // Build where clause for cached trends
    const where: any = {
      expiresAt: { gt: now },
    };

    if (category) {
      where.category = category;
    }

    if (region) {
      where.region = region;
    }

    // Try cache first
    const cached = await this.prisma.trendingTopic.findMany({
      where,
      orderBy: { score: 'desc' },
      take: limit,
    });

    if (cached.length > 0) {
      return {
        trends: cached.map((t) => ({
          id: t.id,
          topic: t.topic,
          category: t.category,
          score: t.score,
          hashtags: this.parseJson(t.hashtags, []),
          keywords: this.parseJson(t.keywords, []),
          region: t.region,
          source: t.source,
          expiresAt: t.expiresAt,
        })),
        source: 'cache',
        count: cached.length,
      };
    }

    // Cache is stale or empty, fetch new trends
    await this.syncTrends();

    // Return freshly fetched trends
    const fresh = await this.prisma.trendingTopic.findMany({
      where: {
        expiresAt: { gt: now },
        ...(category ? { category } : {}),
        ...(region ? { region } : {}),
      },
      orderBy: { score: 'desc' },
      take: limit,
    });

    return {
      trends: fresh.map((t) => ({
        id: t.id,
        topic: t.topic,
        category: t.category,
        score: t.score,
        hashtags: this.parseJson(t.hashtags, []),
        keywords: this.parseJson(t.keywords, []),
        region: t.region,
        source: t.source,
        expiresAt: t.expiresAt,
      })),
      source: 'fresh',
      count: fresh.length,
    };
  }

  async getIndustryTrends(userId: string) {
    // Get user profile to determine industry
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const industry = profile?.industry || 'marketing';
    const subIndustry = profile?.subIndustry;

    // Map industry to relevant trend categories
    const categoryMap: Record<string, string[]> = {
      marketing: ['digital_marketing', 'social_media', 'advertising', 'content'],
      technology: ['technology', 'software', 'ai', 'saas'],
      ecommerce: ['ecommerce', 'retail', 'shopping', 'consumer'],
      healthcare: ['healthcare', 'wellness', 'medical', 'health'],
      finance: ['finance', 'fintech', 'banking', 'investment'],
      education: ['education', 'edtech', 'learning', 'training'],
      food: ['food', 'restaurant', 'delivery', 'cooking'],
      travel: ['travel', 'hospitality', 'tourism', 'destination'],
      real_estate: ['real_estate', 'property', 'housing', 'construction'],
      fitness: ['fitness', 'gym', 'wellness', 'health'],
    };

    const relevantCategories = categoryMap[industry.toLowerCase()] || ['marketing', 'business'];

    const now = new Date();
    const trends = await this.prisma.trendingTopic.findMany({
      where: {
        expiresAt: { gt: now },
        category: { in: relevantCategories },
      },
      orderBy: { score: 'desc' },
      take: 15,
    });

    // If no category-specific trends, return general trends
    if (trends.length === 0) {
      const generalTrends = await this.prisma.trendingTopic.findMany({
        where: { expiresAt: { gt: now } },
        orderBy: { score: 'desc' },
        take: 15,
      });

      return {
        industry,
        subIndustry,
        trends: generalTrends.map((t) => ({
          id: t.id,
          topic: t.topic,
          category: t.category,
          score: t.score,
          hashtags: this.parseJson(t.hashtags, []),
          keywords: this.parseJson(t.keywords, []),
          relevance: 'general',
        })),
        count: generalTrends.length,
      };
    }

    return {
      industry,
      subIndustry,
      trends: trends.map((t) => ({
        id: t.id,
        topic: t.topic,
        category: t.category,
        score: t.score,
        hashtags: this.parseJson(t.hashtags, []),
        keywords: this.parseJson(t.keywords, []),
        relevance: 'industry',
      })),
      count: trends.length,
    };
  }

  async getContentSuggestions(userId: string): Promise<{
    suggestions: ContentSuggestion[];
    basedOn: string[];
  }> {
    // Get user profile
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const industry = profile?.industry || 'marketing';
    const businessName = profile?.businessName || 'your business';
    const targetAudience = profile?.targetAudience || 'general audience';

    // Get current trending topics
    const now = new Date();
    const trends = await this.prisma.trendingTopic.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { score: 'desc' },
      take: 10,
    });

    const trendTopics = trends.map((t) => t.topic);

    // Generate suggestions based on trends + user profile
    const suggestions: ContentSuggestion[] = [];

    for (const trend of trends.slice(0, 5)) {
      // Instagram post suggestion
      suggestions.push({
        topic: `${trend.topic} - Tips for ${targetAudience}`,
        type: 'INSTAGRAM_IMAGE',
        platform: 'INSTAGRAM',
        reason: `"${trend.topic}" is trending with a score of ${trend.score}. Create visual content to capture attention from ${targetAudience}.`,
      });

      // Blog post suggestion
      suggestions.push({
        topic: `How ${businessName} Leverages ${trend.topic}: A Complete Guide`,
        type: 'BLOG_POST',
        platform: 'WORDPRESS',
        reason: `Long-form content about "${trend.topic}" can drive organic traffic. This topic is currently trending in the ${trend.category || industry} space.`,
      });

      // Facebook post suggestion
      suggestions.push({
        topic: `${trend.topic}: What ${industry} Professionals Need to Know`,
        type: 'FACEBOOK_IMAGE',
        platform: 'FACEBOOK',
        reason: `Share insights about "${trend.topic}" to position ${businessName} as an industry thought leader.`,
      });
    }

    // Add LinkedIn suggestions for top trends
    for (const trend of trends.slice(0, 3)) {
      suggestions.push({
        topic: `Industry Insight: The Impact of ${trend.topic} on ${industry}`,
        type: 'LINKEDIN_POST',
        platform: 'LINKEDIN',
        reason: `Professional commentary on "${trend.topic}" performs well on LinkedIn for B2B engagement.`,
      });
    }

    // Add TikTok suggestions for most popular trends
    for (const trend of trends.slice(0, 2)) {
      suggestions.push({
        topic: `Quick Take: ${trend.topic} in 60 Seconds`,
        type: 'TIKTOK_VIDEO',
        platform: 'TIKTOK',
        reason: `Short-form video about "${trend.topic}" can go viral on TikTok. This is one of the top trending topics right now.`,
      });
    }

    return {
      suggestions,
      basedOn: trendTopics,
    };
  }

  async syncTrends(): Promise<{ synced: number; source: string }> {
    const apiKey = await this.credentialsService.get('SERPAPI_KEY');

    if (apiKey) {
      return this.fetchFromSerpApi(apiKey);
    }

    // No API key, use mock data
    this.logger.warn('No SERPAPI_KEY found, using mock trending data');
    return this.insertMockTrends();
  }

  private async fetchFromSerpApi(apiKey: string): Promise<{ synced: number; source: string }> {
    const categories = [
      { query: 'digital marketing trends', category: 'digital_marketing' },
      { query: 'social media marketing', category: 'social_media' },
      { query: 'content marketing', category: 'content' },
      { query: 'ecommerce trends', category: 'ecommerce' },
      { query: 'AI marketing', category: 'ai' },
      { query: 'SEO trends', category: 'seo' },
    ];

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h expiry
    let synced = 0;

    for (const { query, category } of categories) {
      try {
        const url = `https://serpapi.com/search?engine=google_trends&q=${encodeURIComponent(query)}&api_key=${apiKey}&data_type=RELATED_QUERIES`;
        const response = await fetch(url);

        if (!response.ok) {
          this.logger.warn(`SerpAPI request failed for "${query}": ${response.status}`);
          continue;
        }

        const data = await response.json();

        // Process rising queries
        const risingQueries: SerpApiTrendResult[] = data.related_queries?.rising || [];
        const topQueries: SerpApiTrendResult[] = data.related_queries?.top || [];

        const allQueries = [
          ...risingQueries.map((q) => ({
            topic: q.query,
            score: q.extracted_value || q.value || 50,
            source: 'serpapi_rising',
          })),
          ...topQueries.map((q) => ({
            topic: q.query,
            score: q.extracted_value || q.value || 30,
            source: 'serpapi_top',
          })),
        ];

        for (const item of allQueries.slice(0, 10)) {
          const hashtags = this.generateHashtags(item.topic);
          const keywords = item.topic.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

          await this.prisma.trendingTopic.upsert({
            where: {
              id: await this.findExistingTrendId(item.topic, category),
            },
            update: {
              score: item.score,
              hashtags: JSON.stringify(hashtags),
              keywords: JSON.stringify(keywords),
              expiresAt,
              source: item.source,
            },
            create: {
              topic: item.topic,
              category,
              score: item.score,
              hashtags: JSON.stringify(hashtags),
              keywords: JSON.stringify(keywords),
              region: 'global',
              source: item.source,
              expiresAt,
            },
          });
          synced++;
        }
      } catch (error) {
        this.logger.error(`Failed to fetch trends for "${query}":`, (error as Error).message);
      }
    }

    return { synced, source: 'serpapi' };
  }

  private async findExistingTrendId(topic: string, category: string): Promise<string> {
    const existing = await this.prisma.trendingTopic.findFirst({
      where: { topic, category },
      select: { id: true },
    });
    return existing?.id || 'non-existent-id-for-create';
  }

  private async insertMockTrends(): Promise<{ synced: number; source: string }> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const mockTrends = [
      { topic: 'AI-Powered Content Creation', category: 'ai', score: 95, region: 'global' },
      { topic: 'Short-Form Video Marketing', category: 'social_media', score: 92, region: 'global' },
      { topic: 'Personalized Email Campaigns', category: 'digital_marketing', score: 88, region: 'global' },
      { topic: 'Voice Search Optimization', category: 'seo', score: 85, region: 'global' },
      { topic: 'Social Commerce Integration', category: 'ecommerce', score: 83, region: 'global' },
      { topic: 'User-Generated Content Strategy', category: 'content', score: 80, region: 'global' },
      { topic: 'Interactive Content Marketing', category: 'content', score: 78, region: 'global' },
      { topic: 'Influencer Marketing ROI', category: 'social_media', score: 76, region: 'global' },
      { topic: 'Zero-Click Search Strategies', category: 'seo', score: 74, region: 'global' },
      { topic: 'Sustainability Marketing', category: 'digital_marketing', score: 72, region: 'global' },
      { topic: 'Augmented Reality Shopping', category: 'ecommerce', score: 70, region: 'global' },
      { topic: 'Community-Led Growth', category: 'digital_marketing', score: 68, region: 'global' },
      { topic: 'LinkedIn B2B Marketing', category: 'social_media', score: 66, region: 'global' },
      { topic: 'Conversational Marketing', category: 'ai', score: 64, region: 'global' },
      { topic: 'Data Privacy Marketing', category: 'digital_marketing', score: 62, region: 'global' },
      { topic: 'Podcast Marketing Strategy', category: 'content', score: 60, region: 'global' },
      { topic: 'TikTok Shop Integration', category: 'ecommerce', score: 58, region: 'global' },
      { topic: 'Micro-Influencer Partnerships', category: 'social_media', score: 56, region: 'global' },
      { topic: 'AI Chatbot Marketing', category: 'ai', score: 54, region: 'global' },
      { topic: 'Google SGE Optimization', category: 'seo', score: 52, region: 'global' },
    ];

    // Delete expired trends
    await this.prisma.trendingTopic.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    let synced = 0;

    for (const trend of mockTrends) {
      const hashtags = this.generateHashtags(trend.topic);
      const keywords = trend.topic.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

      const existing = await this.prisma.trendingTopic.findFirst({
        where: { topic: trend.topic, category: trend.category },
      });

      if (existing) {
        await this.prisma.trendingTopic.update({
          where: { id: existing.id },
          data: {
            score: trend.score,
            hashtags: JSON.stringify(hashtags),
            keywords: JSON.stringify(keywords),
            expiresAt,
            source: 'mock',
          },
        });
      } else {
        await this.prisma.trendingTopic.create({
          data: {
            topic: trend.topic,
            category: trend.category,
            score: trend.score,
            hashtags: JSON.stringify(hashtags),
            keywords: JSON.stringify(keywords),
            region: trend.region,
            source: 'mock',
            expiresAt,
          },
        });
      }
      synced++;
    }

    return { synced, source: 'mock' };
  }

  private generateHashtags(topic: string): string[] {
    const words = topic.toLowerCase().split(/\s+/);
    const hashtags: string[] = [];

    // Create camelCase hashtag from full topic
    const camelCase = words
      .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join('');
    hashtags.push(camelCase);

    // Add individual meaningful words as hashtags
    for (const word of words) {
      if (word.length > 3 && !['the', 'and', 'for', 'with', 'from'].includes(word)) {
        hashtags.push(word);
      }
    }

    // Add common marketing hashtags
    hashtags.push('marketing', 'digitalmarketing', 'trends');

    return [...new Set(hashtags)].slice(0, 8);
  }

  private parseJson(value: string, fallback: any): any {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
}
