import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
const ContentStatus = { PUBLISHED: 'PUBLISHED', FAILED: 'FAILED', SCHEDULED: 'SCHEDULED' } as const;
const Platform = { INSTAGRAM: 'INSTAGRAM', FACEBOOK: 'FACEBOOK' } as const;

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(userId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalContent,
      publishedThisMonth,
      scheduledContent,
      subscription,
      recentAnalytics,
      contentByPlatform,
    ] = await Promise.all([
      this.prisma.content.count({ where: { userId } }),
      this.prisma.content.count({
        where: {
          userId,
          status: ContentStatus.PUBLISHED,
          publishedAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.content.count({
        where: {
          userId,
          status: ContentStatus.SCHEDULED,
        },
      }),
      this.prisma.subscription.findUnique({
        where: { userId },
        select: {
          tier: true,
          creditsTotal: true,
          creditsRemaining: true,
          currentPeriodEnd: true,
        },
      }),
      this.prisma.contentAnalytics.aggregate({
        where: {
          content: {
            userId,
            publishedAt: { gte: sevenDaysAgo },
          },
        },
        _sum: {
          impressions: true,
          reach: true,
          likes: true,
          comments: true,
          shares: true,
          clicks: true,
        },
      }),
      this.prisma.content.groupBy({
        by: ['type'],
        where: { userId },
        _count: true,
      }),
    ]);

    return {
      overview: {
        totalContent,
        publishedThisMonth,
        scheduledContent,
        creditsRemaining: subscription?.creditsRemaining || 0,
        creditsTotal: subscription?.creditsTotal || 0,
      },
      engagement: {
        period: '7 days',
        impressions: recentAnalytics._sum.impressions || 0,
        reach: recentAnalytics._sum.reach || 0,
        likes: recentAnalytics._sum.likes || 0,
        comments: recentAnalytics._sum.comments || 0,
        shares: recentAnalytics._sum.shares || 0,
        clicks: recentAnalytics._sum.clicks || 0,
      },
      contentBreakdown: contentByPlatform.map((item) => ({
        type: item.type,
        count: item._count,
      })),
      subscription: subscription
        ? {
            tier: subscription.tier,
            renewsAt: subscription.currentPeriodEnd,
          }
        : null,
    };
  }

  async getContentAnalytics(userId: string, contentId: string) {
    const content = await this.prisma.content.findFirst({
      where: { id: contentId, userId },
      include: {
        analytics: true,
        connection: {
          select: { platform: true, accountName: true },
        },
      },
    });

    if (!content) {
      return null;
    }

    return {
      content: {
        id: content.id,
        type: content.type,
        title: content.title,
        publishedAt: content.publishedAt,
        platform: content.connection?.platform,
        platformPostUrl: content.platformPostUrl,
      },
      analytics: content.analytics || {
        impressions: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        clicks: 0,
        engagement: 0,
      },
    };
  }

  async getPerformanceReport(userId: string, startDate: Date, endDate: Date) {
    const contents = await this.prisma.content.findMany({
      where: {
        userId,
        status: ContentStatus.PUBLISHED,
        publishedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        analytics: true,
        connection: {
          select: { platform: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    const totals = contents.reduce(
      (acc, content) => {
        if (content.analytics) {
          acc.impressions += content.analytics.impressions;
          acc.reach += content.analytics.reach;
          acc.likes += content.analytics.likes;
          acc.comments += content.analytics.comments;
          acc.shares += content.analytics.shares;
          acc.clicks += content.analytics.clicks;
        }
        return acc;
      },
      { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0 },
    );

    const platformBreakdown = contents.reduce(
      (acc, content) => {
        const platform = content.connection?.platform || 'unknown';
        if (!acc[platform]) {
          acc[platform] = { count: 0, impressions: 0, engagement: 0 };
        }
        acc[platform].count++;
        if (content.analytics) {
          acc[platform].impressions += content.analytics.impressions;
          acc[platform].engagement +=
            content.analytics.likes +
            content.analytics.comments +
            content.analytics.shares;
        }
        return acc;
      },
      {} as Record<string, { count: number; impressions: number; engagement: number }>,
    );

    const topPerforming = contents
      .filter((c) => c.analytics)
      .sort((a, b) => {
        const engA =
          (a.analytics?.likes || 0) +
          (a.analytics?.comments || 0) +
          (a.analytics?.shares || 0);
        const engB =
          (b.analytics?.likes || 0) +
          (b.analytics?.comments || 0) +
          (b.analytics?.shares || 0);
        return engB - engA;
      })
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        title: c.title || c.caption?.substring(0, 50),
        platform: c.connection?.platform,
        publishedAt: c.publishedAt,
        engagement:
          (c.analytics?.likes || 0) +
          (c.analytics?.comments || 0) +
          (c.analytics?.shares || 0),
      }));

    return {
      period: { startDate, endDate },
      totalPosts: contents.length,
      totals,
      averageEngagement:
        contents.length > 0
          ? (totals.likes + totals.comments + totals.shares) / contents.length
          : 0,
      platformBreakdown,
      topPerforming,
    };
  }

  async syncAnalytics(contentId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { connection: true },
    });

    if (!content || !content.connection || !content.platformPostId) {
      return null;
    }

    let analytics;

    switch (content.connection.platform) {
      case Platform.INSTAGRAM:
        analytics = await this.fetchInstagramAnalytics(
          content.platformPostId,
          content.connection.accessToken,
        );
        break;
      case Platform.FACEBOOK:
        analytics = await this.fetchFacebookAnalytics(
          content.platformPostId,
          content.connection.accessToken,
        );
        break;
      default:
        return null;
    }

    if (analytics) {
      await this.prisma.contentAnalytics.upsert({
        where: { contentId },
        update: {
          ...analytics,
          lastSyncAt: new Date(),
        },
        create: {
          contentId,
          ...analytics,
          lastSyncAt: new Date(),
        },
      });
    }

    return analytics;
  }

  private async fetchInstagramAnalytics(mediaId: string, accessToken: string) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${mediaId}/insights?metric=impressions,reach,likes,comments,shares,saved&access_token=${accessToken}`,
      );
      const data = await response.json();

      if (data.error) {
        console.error('Instagram analytics error:', data.error);
        return null;
      }

      const metrics = data.data.reduce(
        (acc: any, metric: any) => {
          acc[metric.name] = metric.values[0]?.value || 0;
          return acc;
        },
        {},
      );

      return {
        impressions: metrics.impressions || 0,
        reach: metrics.reach || 0,
        likes: metrics.likes || 0,
        comments: metrics.comments || 0,
        shares: metrics.shares || 0,
        saves: metrics.saved || 0,
        engagement:
          ((metrics.likes || 0) +
            (metrics.comments || 0) +
            (metrics.shares || 0) +
            (metrics.saved || 0)) /
          Math.max(metrics.reach || 1, 1),
      };
    } catch (error) {
      console.error('Failed to fetch Instagram analytics:', error);
      return null;
    }
  }

  private async fetchFacebookAnalytics(postId: string, accessToken: string) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${postId}?fields=insights.metric(post_impressions,post_reach,post_reactions_by_type_total,post_clicks)&access_token=${accessToken}`,
      );
      const data = await response.json();

      if (data.error) {
        console.error('Facebook analytics error:', data.error);
        return null;
      }

      const insights = data.insights?.data || [];
      const metrics: any = {};

      for (const insight of insights) {
        metrics[insight.name] = insight.values[0]?.value || 0;
      }

      const reactions = metrics.post_reactions_by_type_total || {};
      const totalReactions = Object.values(reactions).reduce(
        (sum: number, val: any) => sum + (val || 0),
        0,
      ) as number;

      return {
        impressions: metrics.post_impressions || 0,
        reach: metrics.post_reach || 0,
        likes: totalReactions as number,
        comments: 0, // Would need separate query
        shares: 0, // Would need separate query
        clicks: metrics.post_clicks || 0,
        engagement:
          (totalReactions + (metrics.post_clicks || 0)) /
          Math.max(metrics.post_reach || 1, 1),
      };
    } catch (error) {
      console.error('Failed to fetch Facebook analytics:', error);
      return null;
    }
  }
}
