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

  /**
   * Trends for the tenant's own industry and country.
   *
   * Categories come from INDUSTRY_QUERIES so they always match what the sync
   * actually wrote - the previous hand-written map listed categories that were
   * never populated, so every lookup silently fell back to general trends.
   */
  async getIndustryTrends(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const industry = (profile?.industry || 'marketing').toLowerCase().trim();
    const subIndustry = profile?.subIndustry;

    const queries =
      TrendsService.INDUSTRY_QUERIES[industry] ||
      TrendsService.INDUSTRY_QUERIES.marketing;
    const relevantCategories = queries.map((q) => q.category);

    const geo = this.resolveGeo(profile?.country);
    const region = geo ? geo.toLowerCase() : null;
    const now = new Date();

    // Prefer trends for the tenant's own country, then fall back outward, so a
    // sparse local cache still returns something useful.
    const attempts: { where: any; relevance: string }[] = [];
    if (region) {
      attempts.push({
        where: {
          expiresAt: { gt: now },
          category: { in: relevantCategories },
          region,
        },
        relevance: 'industry_local',
      });
    }
    attempts.push({
      where: {
        expiresAt: { gt: now },
        category: { in: relevantCategories },
      },
      relevance: 'industry',
    });
    attempts.push({
      where: { expiresAt: { gt: now } },
      relevance: 'general',
    });

    for (const attempt of attempts) {
      const trends = await this.prisma.trendingTopic.findMany({
        where: attempt.where,
        orderBy: { score: 'desc' },
        take: 15,
      });

      if (trends.length === 0) continue;

      return {
        industry,
        subIndustry,
        region: region || 'global',
        trends: trends.map((t) => ({
          id: t.id,
          topic: t.topic,
          category: t.category,
          score: t.score,
          region: t.region,
          hashtags: this.parseJson(t.hashtags, []),
          keywords: this.parseJson(t.keywords, []),
          relevance: attempt.relevance,
        })),
        count: trends.length,
      };
    }

    // Nothing cached at all - the sync has not run yet.
    return {
      industry,
      subIndustry,
      region: region || 'global',
      trends: [],
      count: 0,
      message:
        'No trending topics cached yet. They refresh every 6 hours, or an admin can trigger POST /api/v1/admin/scheduler/run/sync-trends.',
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

  /**
   * Industry -> the Google Trends seed queries that populate it. The keys here
   * must stay in step with the category map used by getIndustryTrends,
   * otherwise an industry can never match anything that was actually synced.
   */
  private static readonly INDUSTRY_QUERIES: Record<
    string,
    { query: string; category: string }[]
  > = {
    marketing: [
      { query: 'digital marketing trends', category: 'digital_marketing' },
      { query: 'social media marketing', category: 'social_media' },
      { query: 'content marketing', category: 'content' },
      { query: 'online advertising', category: 'advertising' },
    ],
    technology: [
      { query: 'software trends', category: 'software' },
      { query: 'AI tools', category: 'ai' },
      { query: 'SaaS products', category: 'saas' },
      { query: 'technology trends', category: 'technology' },
    ],
    ecommerce: [
      { query: 'ecommerce trends', category: 'ecommerce' },
      { query: 'online shopping', category: 'shopping' },
      { query: 'retail trends', category: 'retail' },
      { query: 'consumer trends', category: 'consumer' },
    ],
    healthcare: [
      { query: 'healthcare trends', category: 'healthcare' },
      { query: 'wellness trends', category: 'wellness' },
      { query: 'medical technology', category: 'medical' },
      { query: 'health tips', category: 'health' },
    ],
    finance: [
      { query: 'fintech trends', category: 'fintech' },
      { query: 'personal finance', category: 'finance' },
      { query: 'banking technology', category: 'banking' },
      { query: 'investment trends', category: 'investment' },
    ],
    education: [
      { query: 'edtech trends', category: 'edtech' },
      { query: 'online learning', category: 'learning' },
      { query: 'education trends', category: 'education' },
      { query: 'professional training', category: 'training' },
    ],
    food: [
      { query: 'food trends', category: 'food' },
      { query: 'restaurant trends', category: 'restaurant' },
      { query: 'food delivery', category: 'delivery' },
      { query: 'recipe ideas', category: 'cooking' },
    ],
    travel: [
      { query: 'travel trends', category: 'travel' },
      { query: 'hospitality trends', category: 'hospitality' },
      { query: 'tourism', category: 'tourism' },
      { query: 'holiday destinations', category: 'destination' },
    ],
    real_estate: [
      { query: 'real estate trends', category: 'real_estate' },
      { query: 'property market', category: 'property' },
      { query: 'housing market', category: 'housing' },
      { query: 'construction trends', category: 'construction' },
    ],
    fitness: [
      { query: 'fitness trends', category: 'fitness' },
      { query: 'gym workouts', category: 'gym' },
      { query: 'wellness routines', category: 'wellness' },
      { query: 'health and fitness', category: 'health' },
    ],
  };

  /** ISO-3166 country codes Google Trends accepts as its `geo` parameter. */
  private static readonly COUNTRY_GEO: Record<string, string> = {
    india: 'IN',
    'united states': 'US',
    usa: 'US',
    us: 'US',
    'united kingdom': 'GB',
    uk: 'GB',
    canada: 'CA',
    australia: 'AU',
    singapore: 'SG',
    'united arab emirates': 'AE',
    uae: 'AE',
    germany: 'DE',
    france: 'FR',
    spain: 'ES',
    italy: 'IT',
    netherlands: 'NL',
    brazil: 'BR',
    mexico: 'MX',
    japan: 'JP',
    'south africa': 'ZA',
    nigeria: 'NG',
    kenya: 'KE',
    indonesia: 'ID',
    philippines: 'PH',
    malaysia: 'MY',
  };

  private resolveGeo(country?: string | null): string | null {
    if (!country) return null;
    const key = country.trim().toLowerCase();
    if (TrendsService.COUNTRY_GEO[key]) return TrendsService.COUNTRY_GEO[key];
    // Already an ISO code?
    if (/^[A-Za-z]{2}$/.test(country.trim())) {
      return country.trim().toUpperCase();
    }
    return null;
  }

  /**
   * Works out which industries and regions to sync from the tenants that
   * actually exist, so a restaurant chain does not end up with SEO trends.
   * Marketing is always included as a baseline.
   */
  private async resolveSyncTargets(): Promise<
    { industry: string; geo: string | null; region: string }[]
  > {
    const profiles = await this.prisma.userProfile.findMany({
      where: { industry: { not: null } },
      select: { industry: true, country: true },
      take: 500,
    });

    const seen = new Map<
      string,
      { industry: string; geo: string | null; region: string }
    >();

    // Baseline so the trends page is never empty for a brand-new tenant.
    seen.set('marketing|global', {
      industry: 'marketing',
      geo: null,
      region: 'global',
    });

    for (const profile of profiles) {
      const industry = (profile.industry || '').toLowerCase().trim();
      if (!TrendsService.INDUSTRY_QUERIES[industry]) continue;

      const geo = this.resolveGeo(profile.country);
      const region = geo ? geo.toLowerCase() : 'global';
      seen.set(industry + '|' + region, { industry, geo, region });
    }

    return Array.from(seen.values());
  }

  private async fetchFromSerpApi(
    apiKey: string,
  ): Promise<{ synced: number; source: string }> {
    const targets = await this.resolveSyncTargets();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    let synced = 0;

    for (const target of targets) {
      const queries = TrendsService.INDUSTRY_QUERIES[target.industry] || [];

      for (const { query, category } of queries) {
        try {
          const params = new URLSearchParams({
            engine: 'google_trends',
            q: query,
            api_key: apiKey,
            data_type: 'RELATED_QUERIES',
          });
          // Scoping to a country is what makes these trends "local"; without a
          // geo, Google Trends returns worldwide interest.
          if (target.geo) params.set('geo', target.geo);

          const response = await fetch(
            `https://serpapi.com/search?${params.toString()}`,
          );

          if (!response.ok) {
            this.logger.warn(
              `SerpAPI request failed for "${query}" (${target.region}): ${response.status}`,
            );
            continue;
          }

          const data = await response.json();
          const risingQueries: SerpApiTrendResult[] =
            data.related_queries?.rising || [];
          const topQueries: SerpApiTrendResult[] =
            data.related_queries?.top || [];

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
            if (!item.topic) continue;
            const hashtags = this.generateHashtags(item.topic);
            const keywords = item.topic
              .toLowerCase()
              .split(/\s+/)
              .filter((w) => w.length > 2);

            const payload = {
              score: item.score,
              hashtags: JSON.stringify(hashtags),
              keywords: JSON.stringify(keywords),
              expiresAt,
              source: item.source,
            };

            // Same topic can legitimately trend in several regions, so the
            // region is part of the identity of a cached trend.
            const existing = await this.prisma.trendingTopic.findFirst({
              where: { topic: item.topic, category, region: target.region },
              select: { id: true },
            });

            if (existing) {
              await this.prisma.trendingTopic.update({
                where: { id: existing.id },
                data: payload,
              });
            } else {
              await this.prisma.trendingTopic.create({
                data: {
                  topic: item.topic,
                  category,
                  region: target.region,
                  ...payload,
                },
              });
            }
            synced++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to fetch trends for "${query}" (${target.region}): ${(error as Error).message}`,
          );
        }
      }
    }

    return { synced, source: 'serpapi' };
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
