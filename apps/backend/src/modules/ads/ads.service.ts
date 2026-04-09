import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { GoogleAdsService } from './google-ads.service';
import { MetaAdsService } from './meta-ads.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignFilterDto,
  AdPlatform,
  CampaignStatus,
} from './dto/ads.dto';

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
    private googleAdsService: GoogleAdsService,
    private metaAdsService: MetaAdsService,
  ) {}

  async createCampaign(userId: string, dto: CreateCampaignDto) {
    // Verify the platform connection belongs to this user
    const connection = await this.prisma.platformConnection.findFirst({
      where: { id: dto.connectionId, userId },
    });
    if (!connection) {
      throw new NotFoundException('Platform connection not found');
    }

    // Consume credits for campaign creation
    await this.subscriptionsService.consumeCredits(userId, 'AD_CAMPAIGN_CREATE');

    const campaign = await this.prisma.adCampaign.create({
      data: {
        userId,
        connectionId: dto.connectionId,
        platform: dto.platform,
        name: dto.name,
        type: dto.type,
        objective: dto.objective || null,
        status: CampaignStatus.DRAFT,
        budget: dto.budget,
        budgetType: dto.budgetType,
        currency: dto.currency || 'USD',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        targeting: JSON.stringify(dto.targeting),
        adCreatives: JSON.stringify(dto.adCreatives),
        settings: dto.settings ? JSON.stringify(dto.settings) : '{}',
        creditsConsumed: 25,
      },
      include: {
        connection: {
          select: { id: true, platform: true, accountName: true },
        },
        metrics: { take: 1, orderBy: { date: 'desc' } },
      },
    });

    return this.formatCampaign(campaign);
  }

  async updateCampaign(userId: string, campaignId: string, dto: UpdateCampaignDto) {
    const campaign = await this.findCampaignOrFail(campaignId);
    this.assertOwnership(campaign, userId);

    const updateData: Record<string, any> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.objective !== undefined) updateData.objective = dto.objective;
    if (dto.budget !== undefined) updateData.budget = dto.budget;
    if (dto.budgetType !== undefined) updateData.budgetType = dto.budgetType;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);
    if (dto.targeting !== undefined) updateData.targeting = JSON.stringify(dto.targeting);
    if (dto.adCreatives !== undefined) updateData.adCreatives = JSON.stringify(dto.adCreatives);
    if (dto.settings !== undefined) updateData.settings = JSON.stringify(dto.settings);

    // If campaign is active on platform, push updates
    if (campaign.status === CampaignStatus.ACTIVE && campaign.platformCampaignId) {
      try {
        const connection = await this.prisma.platformConnection.findUnique({
          where: { id: campaign.connectionId },
        });
        if (connection) {
          if (campaign.platform === AdPlatform.GOOGLE_ADS) {
            await this.googleAdsService.updateCampaign(
              { accessToken: connection.accessToken, accountId: connection.accountId || undefined },
              campaign.platformCampaignId,
              {
                ...dto,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                endDate: dto.endDate ? new Date(dto.endDate) : undefined,
              } as any,
            );
          }
          // Meta Ads updates are applied via re-creation at ad set level
        }
      } catch (error) {
        this.logger.error(`Failed to push update to platform: ${error.message}`);
      }
    }

    const updated = await this.prisma.adCampaign.update({
      where: { id: campaignId },
      data: updateData,
      include: {
        connection: {
          select: { id: true, platform: true, accountName: true },
        },
        metrics: { take: 1, orderBy: { date: 'desc' } },
      },
    });

    return this.formatCampaign(updated);
  }

  async launchCampaign(userId: string, campaignId: string) {
    const campaign = await this.findCampaignOrFail(campaignId);
    this.assertOwnership(campaign, userId);

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException(
        `Campaign cannot be launched from ${campaign.status} status. Must be DRAFT or PAUSED.`,
      );
    }

    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: campaign.connectionId },
    });
    if (!connection) {
      throw new NotFoundException('Platform connection no longer exists');
    }

    const targeting = this.parseJson(campaign.targeting, {});
    const adCreatives = this.parseJson(campaign.adCreatives, []);
    const settings = this.parseJson(campaign.settings, {});

    let platformCampaignId = campaign.platformCampaignId;

    try {
      if (campaign.platform === AdPlatform.GOOGLE_ADS) {
        if (!platformCampaignId) {
          platformCampaignId = await this.googleAdsService.createCampaign(
            {
              accessToken: connection.accessToken,
              refreshToken: connection.refreshToken || undefined,
              accountId: connection.accountId || undefined,
              metadata: connection.metadata || undefined,
            },
            {
              name: campaign.name,
              type: campaign.type,
              budget: campaign.budget,
              budgetType: campaign.budgetType,
              currency: campaign.currency,
              startDate: campaign.startDate || undefined,
              endDate: campaign.endDate || undefined,
              targeting,
              adCreatives,
              settings,
            },
          );
        } else {
          await this.googleAdsService.resumeCampaign(
            { accessToken: connection.accessToken, accountId: connection.accountId || undefined },
            platformCampaignId,
          );
        }
      } else if (campaign.platform === AdPlatform.META_ADS) {
        if (!platformCampaignId) {
          platformCampaignId = await this.metaAdsService.createCampaign(
            {
              accessToken: connection.accessToken,
              refreshToken: connection.refreshToken || undefined,
              accountId: connection.accountId || undefined,
              metadata: connection.metadata || undefined,
            },
            {
              name: campaign.name,
              type: campaign.type,
              objective: campaign.objective || undefined,
              budget: campaign.budget,
              budgetType: campaign.budgetType,
              currency: campaign.currency,
              startDate: campaign.startDate || undefined,
              endDate: campaign.endDate || undefined,
              targeting,
              adCreatives,
              settings,
            },
          );

          // Create ad set and ads for Meta
          if (platformCampaignId) {
            const adSetId = await this.metaAdsService.createAdSet(
              {
                accessToken: connection.accessToken,
                accountId: connection.accountId || undefined,
                metadata: connection.metadata || undefined,
              },
              platformCampaignId,
              {
                name: campaign.name,
                type: campaign.type,
                budget: campaign.budget,
                budgetType: campaign.budgetType,
                currency: campaign.currency,
                startDate: campaign.startDate || undefined,
                endDate: campaign.endDate || undefined,
                targeting,
                adCreatives,
              },
            );

            // Create ads from creatives
            if (adSetId && adCreatives.length) {
              for (let i = 0; i < adCreatives.length; i++) {
                await this.metaAdsService.createAd(
                  {
                    accessToken: connection.accessToken,
                    accountId: connection.accountId || undefined,
                    metadata: connection.metadata || undefined,
                  },
                  adSetId,
                  {
                    name: `${campaign.name} - Ad ${i + 1}`,
                    creative: adCreatives[i],
                  },
                );
              }
            }
          }
        } else {
          await this.metaAdsService.resumeCampaign(
            {
              accessToken: connection.accessToken,
              metadata: connection.metadata || undefined,
            },
            platformCampaignId,
          );
        }
      } else {
        throw new BadRequestException(`Unsupported platform: ${campaign.platform}`);
      }

      const updated = await this.prisma.adCampaign.update({
        where: { id: campaignId },
        data: {
          status: CampaignStatus.ACTIVE,
          platformCampaignId,
        },
        include: {
          connection: {
            select: { id: true, platform: true, accountName: true },
          },
        },
      });

      return this.formatCampaign(updated);
    } catch (error) {
      this.logger.error(`Failed to launch campaign: ${error.message}`);
      await this.prisma.adCampaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.FAILED },
      });
      throw new BadRequestException(`Failed to launch campaign: ${error.message}`);
    }
  }

  async pauseCampaign(userId: string, campaignId: string) {
    const campaign = await this.findCampaignOrFail(campaignId);
    this.assertOwnership(campaign, userId);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Only active campaigns can be paused');
    }

    if (campaign.platformCampaignId) {
      const connection = await this.prisma.platformConnection.findUnique({
        where: { id: campaign.connectionId },
      });
      if (connection) {
        try {
          if (campaign.platform === AdPlatform.GOOGLE_ADS) {
            await this.googleAdsService.pauseCampaign(
              { accessToken: connection.accessToken, accountId: connection.accountId || undefined },
              campaign.platformCampaignId,
            );
          } else if (campaign.platform === AdPlatform.META_ADS) {
            await this.metaAdsService.pauseCampaign(
              { accessToken: connection.accessToken, metadata: connection.metadata || undefined },
              campaign.platformCampaignId,
            );
          }
        } catch (error) {
          this.logger.error(`Failed to pause campaign on platform: ${error.message}`);
        }
      }
    }

    const updated = await this.prisma.adCampaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.PAUSED },
      include: {
        connection: {
          select: { id: true, platform: true, accountName: true },
        },
      },
    });

    return this.formatCampaign(updated);
  }

  async resumeCampaign(userId: string, campaignId: string) {
    const campaign = await this.findCampaignOrFail(campaignId);
    this.assertOwnership(campaign, userId);

    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Only paused campaigns can be resumed');
    }

    if (campaign.platformCampaignId) {
      const connection = await this.prisma.platformConnection.findUnique({
        where: { id: campaign.connectionId },
      });
      if (connection) {
        try {
          if (campaign.platform === AdPlatform.GOOGLE_ADS) {
            await this.googleAdsService.resumeCampaign(
              { accessToken: connection.accessToken, accountId: connection.accountId || undefined },
              campaign.platformCampaignId,
            );
          } else if (campaign.platform === AdPlatform.META_ADS) {
            await this.metaAdsService.resumeCampaign(
              { accessToken: connection.accessToken, metadata: connection.metadata || undefined },
              campaign.platformCampaignId,
            );
          }
        } catch (error) {
          this.logger.error(`Failed to resume campaign on platform: ${error.message}`);
        }
      }
    }

    const updated = await this.prisma.adCampaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.ACTIVE },
      include: {
        connection: {
          select: { id: true, platform: true, accountName: true },
        },
      },
    });

    return this.formatCampaign(updated);
  }

  async getCampaigns(userId: string, filters: CampaignFilterDto) {
    const where: Record<string, any> = { userId };

    if (filters.platform) where.platform = filters.platform;
    if (filters.status) where.status = filters.status;

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    const [campaigns, total] = await Promise.all([
      this.prisma.adCampaign.findMany({
        where,
        include: {
          connection: {
            select: { id: true, platform: true, accountName: true },
          },
          metrics: {
            take: 7,
            orderBy: { date: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.adCampaign.count({ where }),
    ]);

    return {
      data: campaigns.map((c) => this.formatCampaign(c)),
      total,
      limit,
      offset,
    };
  }

  async getCampaignById(userId: string, id: string) {
    const campaign = await this.prisma.adCampaign.findUnique({
      where: { id },
      include: {
        connection: {
          select: { id: true, platform: true, accountName: true },
        },
        metrics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        adGroups: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    this.assertOwnership(campaign, userId);

    return this.formatCampaign(campaign);
  }

  async getCampaignMetrics(
    userId: string,
    campaignId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const campaign = await this.findCampaignOrFail(campaignId);
    this.assertOwnership(campaign, userId);

    const where: Record<string, any> = { campaignId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const metrics = await this.prisma.adCampaignMetric.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    // Compute summary
    const summary = metrics.reduce(
      (acc, m) => {
        acc.totalImpressions += m.impressions;
        acc.totalClicks += m.clicks;
        acc.totalCost += m.cost;
        acc.totalConversions += m.conversions;
        acc.totalReach += m.reach;
        return acc;
      },
      {
        totalImpressions: 0,
        totalClicks: 0,
        totalCost: 0,
        totalConversions: 0,
        totalReach: 0,
      },
    );

    return {
      campaignId,
      startDate: startDate || null,
      endDate: endDate || null,
      summary: {
        ...summary,
        totalCost: Math.round(summary.totalCost * 100) / 100,
        avgCtr: summary.totalImpressions > 0
          ? Math.round((summary.totalClicks / summary.totalImpressions) * 10000) / 100
          : 0,
        avgCpc: summary.totalClicks > 0
          ? Math.round((summary.totalCost / summary.totalClicks) * 100) / 100
          : 0,
        avgConversionRate: summary.totalClicks > 0
          ? Math.round((summary.totalConversions / summary.totalClicks) * 10000) / 100
          : 0,
        avgCpa: summary.totalConversions > 0
          ? Math.round((summary.totalCost / summary.totalConversions) * 100) / 100
          : null,
      },
      daily: metrics,
    };
  }

  async syncMetrics(userId: string, campaignId: string) {
    const campaign = await this.findCampaignOrFail(campaignId);
    this.assertOwnership(campaign, userId);

    if (!campaign.platformCampaignId) {
      throw new BadRequestException('Campaign has not been launched to a platform yet');
    }

    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: campaign.connectionId },
    });
    if (!connection) {
      throw new NotFoundException('Platform connection no longer exists');
    }

    // Determine date range: last sync to now, or last 30 days
    const endDate = new Date().toISOString().split('T')[0];
    const startDateObj = campaign.lastSyncAt
      ? new Date(campaign.lastSyncAt)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const startDate = startDateObj.toISOString().split('T')[0];

    let dailyMetrics: Array<{
      date: string;
      impressions: number;
      clicks: number;
      ctr: number;
      cpc: number;
      cost: number;
      conversions: number;
      conversionRate: number;
      roas: number | null;
      reach: number;
      cpa: number | null;
    }> = [];

    if (campaign.platform === AdPlatform.GOOGLE_ADS) {
      dailyMetrics = await this.googleAdsService.getCampaignMetrics(
        {
          accessToken: connection.accessToken,
          accountId: connection.accountId || undefined,
        },
        campaign.platformCampaignId,
        startDate,
        endDate,
      );
    } else if (campaign.platform === AdPlatform.META_ADS) {
      dailyMetrics = await this.metaAdsService.getCampaignInsights(
        {
          accessToken: connection.accessToken,
          metadata: connection.metadata || undefined,
        },
        campaign.platformCampaignId,
        startDate,
        endDate,
      );
    }

    // Upsert metrics
    for (const metric of dailyMetrics) {
      const metricDate = new Date(metric.date);
      await this.prisma.adCampaignMetric.upsert({
        where: {
          campaignId_date: {
            campaignId,
            date: metricDate,
          },
        },
        create: {
          campaignId,
          date: metricDate,
          impressions: metric.impressions,
          clicks: metric.clicks,
          ctr: metric.ctr,
          cpc: metric.cpc,
          cost: metric.cost,
          conversions: metric.conversions,
          conversionRate: metric.conversionRate,
          roas: metric.roas,
          reach: metric.reach,
          cpa: metric.cpa,
        },
        update: {
          impressions: metric.impressions,
          clicks: metric.clicks,
          ctr: metric.ctr,
          cpc: metric.cpc,
          cost: metric.cost,
          conversions: metric.conversions,
          conversionRate: metric.conversionRate,
          roas: metric.roas,
          reach: metric.reach,
          cpa: metric.cpa,
        },
      });
    }

    // Update last sync timestamp
    await this.prisma.adCampaign.update({
      where: { id: campaignId },
      data: { lastSyncAt: new Date() },
    });

    return {
      campaignId,
      syncedMetrics: dailyMetrics.length,
      dateRange: { startDate, endDate },
      lastSyncAt: new Date().toISOString(),
    };
  }

  async deleteCampaign(userId: string, id: string) {
    const campaign = await this.findCampaignOrFail(id);
    this.assertOwnership(campaign, userId);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Only draft campaigns can be deleted. Pause or complete active campaigns first.');
    }

    // Refund credits
    if (campaign.creditsConsumed > 0) {
      await this.subscriptionsService.refundCredits(
        userId,
        campaign.creditsConsumed,
        `Refund for deleted draft campaign: ${campaign.name}`,
      );
    }

    await this.prisma.adCampaign.delete({ where: { id } });

    return { deleted: true, refundedCredits: campaign.creditsConsumed };
  }

  async getSuggestions(userId: string) {
    const campaigns = await this.prisma.adCampaign.findMany({
      where: {
        userId,
        status: { in: [CampaignStatus.ACTIVE, CampaignStatus.PAUSED] },
      },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 7,
        },
      },
    });

    const suggestions: Array<{
      campaignId: string;
      campaignName: string;
      type: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      message: string;
    }> = [];

    for (const campaign of campaigns) {
      if (campaign.metrics.length === 0) continue;

      const recentMetrics = campaign.metrics;
      const avgCtr =
        recentMetrics.reduce((sum, m) => sum + m.ctr, 0) / recentMetrics.length;
      const avgCpc =
        recentMetrics.reduce((sum, m) => sum + m.cpc, 0) / recentMetrics.length;
      const avgConvRate =
        recentMetrics.reduce((sum, m) => sum + m.conversionRate, 0) / recentMetrics.length;
      const totalCost = recentMetrics.reduce((sum, m) => sum + m.cost, 0);
      const totalConversions = recentMetrics.reduce((sum, m) => sum + m.conversions, 0);

      // Low CTR suggestion
      if (avgCtr < 0.02) {
        suggestions.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          type: 'LOW_CTR',
          priority: 'HIGH',
          message: `CTR is ${(avgCtr * 100).toFixed(2)}%, which is below the 2% benchmark. Consider revising ad copy, testing new headlines, or refining your targeting to improve click-through rates.`,
        });
      }

      // High CPC suggestion
      if (avgCpc > 5) {
        suggestions.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          type: 'HIGH_CPC',
          priority: 'MEDIUM',
          message: `Average CPC is $${avgCpc.toFixed(2)}. Consider adding negative keywords, improving quality score, or adjusting bid strategy to reduce cost per click.`,
        });
      }

      // Low conversion rate
      if (avgConvRate < 0.01 && totalCost > 50) {
        suggestions.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          type: 'LOW_CONVERSIONS',
          priority: 'HIGH',
          message: `Conversion rate is ${(avgConvRate * 100).toFixed(2)}% with $${totalCost.toFixed(2)} spent. Review your landing page, ensure tracking is set up correctly, and consider audience refinement.`,
        });
      }

      // Budget optimization
      if (totalConversions > 0 && totalCost / totalConversions > 50) {
        suggestions.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          type: 'HIGH_CPA',
          priority: 'MEDIUM',
          message: `Cost per acquisition is $${(totalCost / totalConversions).toFixed(2)}. Consider reallocating budget to higher-performing ad sets or testing new audiences.`,
        });
      }

      // Paused campaign reminder
      if (campaign.status === CampaignStatus.PAUSED) {
        suggestions.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          type: 'PAUSED_CAMPAIGN',
          priority: 'LOW',
          message: `This campaign is currently paused. If performance was satisfactory, consider resuming it to maintain momentum. If not, review changes before reactivating.`,
        });
      }
    }

    // Sort by priority
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return { suggestions, totalCampaigns: campaigns.length };
  }

  // --- Private helpers ---

  private async findCampaignOrFail(id: string) {
    const campaign = await this.prisma.adCampaign.findUnique({ where: { id } });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }

  private assertOwnership(campaign: { userId: string }, userId: string) {
    if (campaign.userId !== userId) {
      throw new ForbiddenException('You do not have access to this campaign');
    }
  }

  private parseJson<T>(value: string | null | undefined, fallback: T): T {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  private formatCampaign(campaign: any) {
    return {
      ...campaign,
      targeting: this.parseJson(campaign.targeting, {}),
      adCreatives: this.parseJson(campaign.adCreatives, []),
      settings: this.parseJson(campaign.settings, {}),
      adGroups: campaign.adGroups?.map((group: any) => ({
        ...group,
        keywords: this.parseJson(group.keywords, []),
        negativeKeywords: this.parseJson(group.negativeKeywords, []),
        ads: this.parseJson(group.ads, []),
      })),
    };
  }
}
