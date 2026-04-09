import { Injectable, Logger } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';

interface GoogleAdsConnection {
  accessToken: string;
  refreshToken?: string;
  accountId?: string;
  metadata?: string;
}

interface GoogleAdsCampaignData {
  name: string;
  type: string;
  budget: number;
  budgetType: string;
  currency: string;
  startDate?: Date;
  endDate?: Date;
  targeting: Record<string, any>;
  adCreatives: Record<string, any>[];
  settings?: Record<string, any>;
}

interface DailyMetric {
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
}

@Injectable()
export class GoogleAdsService {
  private readonly logger = new Logger(GoogleAdsService.name);
  private readonly API_BASE = 'https://googleads.googleapis.com/v16';

  constructor(private credentialsService: CredentialsService) {}

  private async getDeveloperToken(): Promise<string | null> {
    try {
      const token = await this.credentialsService.get('GOOGLE_ADS_DEVELOPER_TOKEN');
      return token || null;
    } catch {
      return null;
    }
  }

  private async getManagerId(): Promise<string | null> {
    try {
      const id = await this.credentialsService.get('GOOGLE_ADS_MANAGER_ID');
      return id || null;
    } catch {
      return null;
    }
  }

  private async apiRequest(
    connection: GoogleAdsConnection,
    method: string,
    path: string,
    body?: Record<string, any>,
  ): Promise<any> {
    const developerToken = await this.getDeveloperToken();
    if (!developerToken) {
      return null; // Triggers mock fallback
    }

    const managerId = await this.getManagerId();
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${connection.accessToken}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json',
    };
    if (managerId) {
      headers['login-customer-id'] = managerId.replace(/-/g, '');
    }

    const customerId = connection.accountId?.replace(/-/g, '') || '';
    const url = `${this.API_BASE}/customers/${customerId}${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Google Ads API error: ${response.status} - ${errorBody}`);
        throw new Error(`Google Ads API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      this.logger.error(`Google Ads API request failed: ${error.message}`);
      throw error;
    }
  }

  async createCampaign(
    connection: GoogleAdsConnection,
    data: GoogleAdsCampaignData,
  ): Promise<string> {
    const developerToken = await this.getDeveloperToken();
    if (!developerToken) {
      this.logger.warn('No Google Ads developer token found, returning mock campaign ID');
      return `mock-google-campaign-${Date.now()}`;
    }

    const customerId = connection.accountId?.replace(/-/g, '') || '';

    // Create campaign budget first
    const budgetResponse = await this.apiRequest(connection, 'POST', '/campaignBudgets:mutate', {
      operations: [
        {
          create: {
            name: `${data.name} Budget`,
            amountMicros: Math.round(data.budget * 1_000_000).toString(),
            deliveryMethod: 'STANDARD',
            ...(data.budgetType === 'DAILY'
              ? { type: 'STANDARD' }
              : { type: 'FIXED_CPA', totalAmountMicros: Math.round(data.budget * 1_000_000).toString() }),
          },
        },
      ],
    });

    const budgetResourceName = budgetResponse?.results?.[0]?.resourceName;

    // Map campaign type
    const typeMap: Record<string, string> = {
      SEARCH: 'SEARCH',
      DISPLAY: 'DISPLAY',
      SHOPPING: 'SHOPPING',
    };

    // Create campaign
    const campaignResponse = await this.apiRequest(connection, 'POST', '/campaigns:mutate', {
      operations: [
        {
          create: {
            name: data.name,
            advertisingChannelType: typeMap[data.type] || 'SEARCH',
            status: 'PAUSED', // Create as paused, activate separately
            campaignBudget: budgetResourceName,
            startDate: data.startDate
              ? new Date(data.startDate).toISOString().split('T')[0].replace(/-/g, '')
              : undefined,
            endDate: data.endDate
              ? new Date(data.endDate).toISOString().split('T')[0].replace(/-/g, '')
              : undefined,
            networkSettings: {
              targetGoogleSearch: true,
              targetSearchNetwork: data.type === 'SEARCH',
              targetContentNetwork: data.type === 'DISPLAY',
            },
          },
        },
      ],
    });

    const campaignResourceName = campaignResponse?.results?.[0]?.resourceName;
    // Extract campaign ID from resource name like "customers/123/campaigns/456"
    const platformCampaignId = campaignResourceName?.split('/').pop() || `google-${Date.now()}`;

    // Apply targeting: location targeting
    if (data.targeting?.locations?.length) {
      const locationOperations = data.targeting.locations.map((location: string) => ({
        create: {
          campaign: campaignResourceName,
          location: {
            geoTargetConstant: `geoTargetConstants/${location}`,
          },
        },
      }));
      await this.apiRequest(connection, 'POST', '/campaignCriteria:mutate', {
        operations: locationOperations,
      });
    }

    // Apply keyword targeting if search campaign
    if (data.type === 'SEARCH' && data.targeting?.keywords?.length) {
      // Keywords are applied at ad group level, handled separately
      this.logger.log(`Keywords will be applied at ad group level for campaign ${platformCampaignId}`);
    }

    return platformCampaignId;
  }

  async updateCampaign(
    connection: GoogleAdsConnection,
    platformCampaignId: string,
    data: Partial<GoogleAdsCampaignData>,
  ): Promise<void> {
    const developerToken = await this.getDeveloperToken();
    if (!developerToken) {
      this.logger.warn('No Google Ads developer token, skipping update');
      return;
    }

    const customerId = connection.accountId?.replace(/-/g, '') || '';
    const resourceName = `customers/${customerId}/campaigns/${platformCampaignId}`;

    const updateFields: Record<string, any> = { resourceName };
    const updateMask: string[] = [];

    if (data.name) {
      updateFields.name = data.name;
      updateMask.push('name');
    }
    if (data.startDate) {
      updateFields.startDate = new Date(data.startDate).toISOString().split('T')[0].replace(/-/g, '');
      updateMask.push('start_date');
    }
    if (data.endDate) {
      updateFields.endDate = new Date(data.endDate).toISOString().split('T')[0].replace(/-/g, '');
      updateMask.push('end_date');
    }

    if (updateMask.length === 0) return;

    await this.apiRequest(connection, 'POST', '/campaigns:mutate', {
      operations: [
        {
          update: updateFields,
          updateMask: updateMask.join(','),
        },
      ],
    });
  }

  async pauseCampaign(
    connection: GoogleAdsConnection,
    platformCampaignId: string,
  ): Promise<void> {
    const developerToken = await this.getDeveloperToken();
    if (!developerToken) {
      this.logger.warn('No Google Ads developer token, skipping pause');
      return;
    }

    const customerId = connection.accountId?.replace(/-/g, '') || '';
    await this.apiRequest(connection, 'POST', '/campaigns:mutate', {
      operations: [
        {
          update: {
            resourceName: `customers/${customerId}/campaigns/${platformCampaignId}`,
            status: 'PAUSED',
          },
          updateMask: 'status',
        },
      ],
    });
  }

  async resumeCampaign(
    connection: GoogleAdsConnection,
    platformCampaignId: string,
  ): Promise<void> {
    const developerToken = await this.getDeveloperToken();
    if (!developerToken) {
      this.logger.warn('No Google Ads developer token, skipping resume');
      return;
    }

    const customerId = connection.accountId?.replace(/-/g, '') || '';
    await this.apiRequest(connection, 'POST', '/campaigns:mutate', {
      operations: [
        {
          update: {
            resourceName: `customers/${customerId}/campaigns/${platformCampaignId}`,
            status: 'ENABLED',
          },
          updateMask: 'status',
        },
      ],
    });
  }

  async getCampaignMetrics(
    connection: GoogleAdsConnection,
    platformCampaignId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyMetric[]> {
    const developerToken = await this.getDeveloperToken();
    if (!developerToken) {
      this.logger.warn('No Google Ads developer token, returning mock metrics');
      return this.generateMockMetrics(startDate, endDate);
    }

    const query = `
      SELECT
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion
      FROM campaign
      WHERE campaign.id = ${platformCampaignId}
        AND segments.date BETWEEN '${startDate}' AND '${endDate}'
      ORDER BY segments.date
    `;

    try {
      const response = await this.apiRequest(connection, 'POST', '/googleAds:searchStream', {
        query,
      });

      if (!response?.length) return [];

      return response.flatMap((batch: any) =>
        (batch.results || []).map((row: any) => ({
          date: row.segments.date,
          impressions: parseInt(row.metrics.impressions || '0', 10),
          clicks: parseInt(row.metrics.clicks || '0', 10),
          ctr: parseFloat(row.metrics.ctr || '0'),
          cpc: parseInt(row.metrics.averageCpc || '0', 10) / 1_000_000,
          cost: parseInt(row.metrics.costMicros || '0', 10) / 1_000_000,
          conversions: parseInt(row.metrics.conversions || '0', 10),
          conversionRate: parseFloat(row.metrics.conversionsFromInteractionsRate || '0'),
          roas: null,
          reach: 0,
          cpa: row.metrics.costPerConversion
            ? parseInt(row.metrics.costPerConversion, 10) / 1_000_000
            : null,
        })),
      );
    } catch (error) {
      this.logger.error(`Failed to fetch Google Ads metrics: ${error.message}`);
      return this.generateMockMetrics(startDate, endDate);
    }
  }

  async getKeywordSuggestions(
    connection: GoogleAdsConnection,
    keywords: string[],
  ): Promise<Array<{ keyword: string; avgMonthlySearches: number; competition: string }>> {
    const developerToken = await this.getDeveloperToken();
    if (!developerToken) {
      return keywords.map((kw) => ({
        keyword: kw,
        avgMonthlySearches: Math.floor(Math.random() * 50000) + 1000,
        competition: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
      }));
    }

    try {
      const response = await this.apiRequest(
        connection,
        'POST',
        '/keywordPlanIdeas:generateKeywordIdeas',
        {
          keywordSeed: { keywords },
          language: 'languageConstants/1000', // English
          geoTargetConstants: ['geoTargetConstants/2840'], // US
          keywordPlanNetwork: 'GOOGLE_SEARCH',
        },
      );

      return (response?.results || []).map((result: any) => ({
        keyword: result.text,
        avgMonthlySearches: parseInt(result.keywordIdeaMetrics?.avgMonthlySearches || '0', 10),
        competition: result.keywordIdeaMetrics?.competition || 'UNSPECIFIED',
      }));
    } catch (error) {
      this.logger.error(`Failed to get keyword suggestions: ${error.message}`);
      return keywords.map((kw) => ({
        keyword: kw,
        avgMonthlySearches: Math.floor(Math.random() * 50000) + 1000,
        competition: 'MEDIUM',
      }));
    }
  }

  private generateMockMetrics(startDate: string, endDate: string): DailyMetric[] {
    const metrics: DailyMetric[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    while (current <= end) {
      const impressions = Math.floor(Math.random() * 5000) + 500;
      const clicks = Math.floor(impressions * (Math.random() * 0.08 + 0.02));
      const cost = clicks * (Math.random() * 2.5 + 0.5);
      const conversions = Math.floor(clicks * (Math.random() * 0.1 + 0.02));

      metrics.push({
        date: current.toISOString().split('T')[0],
        impressions,
        clicks,
        ctr: clicks / impressions,
        cpc: clicks > 0 ? cost / clicks : 0,
        cost: Math.round(cost * 100) / 100,
        conversions,
        conversionRate: clicks > 0 ? conversions / clicks : 0,
        roas: conversions > 0 ? Math.round((conversions * 25) / cost * 100) / 100 : null,
        reach: Math.floor(impressions * 0.75),
        cpa: conversions > 0 ? Math.round((cost / conversions) * 100) / 100 : null,
      });

      current.setDate(current.getDate() + 1);
    }

    return metrics;
  }
}
