import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { parseJsonArray } from '../../common/utils/json-field.util';

export type AdSource = 'meta_ad_library' | 'google_ads_transparency';

export interface ObservedAd {
  source: AdSource;
  adId: string;
  advertiser: string | null;
  /** Deep link to the ad in the provider's public transparency UI. */
  permalink: string | null;
  creativeBodies: string[];
  creativeTitles: string[];
  /** Where the ad runs, e.g. facebook / instagram / search / youtube. */
  platforms: string[];
  format: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
  isActive: boolean | null;
  regions: string[];
}

export interface CompetitorAdsResult {
  competitorId: string;
  competitorName: string;
  observedAds: ObservedAd[];
  totalObserved: number;
  sources: AdSource[];
  /** Populated when a source was skipped, so partial data is never silently partial. */
  coverageNotes: string[];
  observedAt: Date;
}

/**
 * Pulls a competitor's *actually running* ads from public ad-transparency
 * sources.
 *
 * This deliberately does not use a language model. The rest of the competitor
 * record (SWOT, positioning, estimated spend) is model-generated and clearly
 * estimated; these records are observations, and conflating the two would let a
 * plausible-sounding guess be read as fact.
 *
 * Coverage is genuinely partial and callers are told so:
 *
 *   - Meta's Ad Library API returns all ad categories only for EU-targeted ads
 *     (a DSA requirement). Elsewhere, only social-issue/electoral/political ads
 *     are returned. An empty result therefore does not prove nothing is running.
 *   - Google has no public ads-transparency API. We read the Ads Transparency
 *     Center through SerpAPI when a key is configured.
 */
@Injectable()
export class CompetitorAdsService {
  private readonly logger = new Logger(CompetitorAdsService.name);

  constructor(
    private prisma: PrismaService,
    private credentialsService: CredentialsService,
  ) {}

  async refreshCompetitorAds(
    userId: string,
    competitorId: string,
    options: { countries?: string[] } = {},
  ): Promise<CompetitorAdsResult> {
    const competitor = await this.prisma.businessCompetitor.findFirst({
      where: { id: competitorId, profile: { userId } },
    });
    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    const countries =
      options.countries && options.countries.length > 0
        ? options.countries
        : ['IN', 'US', 'GB', 'DE'];

    const coverageNotes: string[] = [];
    const sources: AdSource[] = [];
    let observedAds: ObservedAd[] = [];

    const meta = await this.fetchMetaAds(competitor, countries);
    observedAds = observedAds.concat(meta.ads);
    if (meta.ads.length > 0) sources.push('meta_ad_library');
    if (meta.note) coverageNotes.push(meta.note);

    const google = await this.fetchGoogleAds(competitor);
    observedAds = observedAds.concat(google.ads);
    if (google.ads.length > 0) sources.push('google_ads_transparency');
    if (google.note) coverageNotes.push(google.note);

    const observedAt = new Date();

    await this.prisma.businessCompetitor.update({
      where: { id: competitorId },
      data: {
        observedAds: JSON.stringify(observedAds.slice(0, 100)),
        observedAdsCount: observedAds.length,
        adsSources: JSON.stringify(sources),
        adsObservedAt: observedAt,
        lastAnalyzedAt: observedAt,
      },
    });

    return {
      competitorId,
      competitorName: competitor.name,
      observedAds,
      totalObserved: observedAds.length,
      sources,
      coverageNotes,
      observedAt,
    };
  }

  /** Returns what was last observed, without hitting the providers again. */
  async getCompetitorAds(userId: string, competitorId: string) {
    const competitor = await this.prisma.businessCompetitor.findFirst({
      where: { id: competitorId, profile: { userId } },
    });
    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    const observedAds = parseJsonArray<ObservedAd>(competitor.observedAds);

    return {
      competitorId,
      competitorName: competitor.name,
      observedAds,
      totalObserved: competitor.observedAdsCount,
      sources: parseJsonArray<AdSource>(competitor.adsSources),
      observedAt: competitor.adsObservedAt,
      // The model-estimated view, kept explicitly labelled and separate.
      estimated: {
        adPlatforms: parseJsonArray<string>(competitor.adPlatforms),
        adStrategies: parseJsonArray<string>(competitor.adStrategies),
        adBudgetEstimate: competitor.adBudgetEstimate,
        topPerformingAds: competitor.topPerformingAds,
        disclaimer:
          'These fields are AI-estimated from public signals, not observed ad data. Use observedAds for what is verifiably running.',
      },
    };
  }

  // ---------------------------------------------------------------
  // Meta Ad Library
  // ---------------------------------------------------------------

  private async fetchMetaAds(
    competitor: { name: string; facebookUrl: string | null },
    countries: string[],
  ): Promise<{ ads: ObservedAd[]; note?: string }> {
    const accessToken =
      (await this.credentialsService.get('META_AD_LIBRARY_TOKEN')) ||
      (await this.credentialsService.get('META_APP_ACCESS_TOKEN'));

    if (!accessToken) {
      return {
        ads: [],
        note: 'Meta Ad Library was not queried: set META_AD_LIBRARY_TOKEN in admin credentials.',
      };
    }

    const params = new URLSearchParams({
      access_token: accessToken,
      search_terms: competitor.name,
      ad_reached_countries: JSON.stringify(countries),
      ad_active_status: 'ACTIVE',
      ad_type: 'ALL',
      limit: '50',
      fields: [
        'id',
        'page_name',
        'ad_snapshot_url',
        'ad_creative_bodies',
        'ad_creative_link_titles',
        'publisher_platforms',
        'ad_delivery_start_time',
        'ad_delivery_stop_time',
        'languages',
      ].join(','),
    });

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/ads_archive?${params.toString()}`,
      );
      const data = await response.json();

      if (data.error) {
        this.logger.warn(`Meta Ad Library error: ${data.error.message}`);
        return {
          ads: [],
          note: `Meta Ad Library returned an error: ${data.error.message}`,
        };
      }

      const ads: ObservedAd[] = (data.data || []).map((ad: any) => ({
        source: 'meta_ad_library' as const,
        adId: String(ad.id),
        advertiser: ad.page_name ?? null,
        permalink: ad.ad_snapshot_url ?? null,
        creativeBodies: ad.ad_creative_bodies || [],
        creativeTitles: ad.ad_creative_link_titles || [],
        platforms: ad.publisher_platforms || [],
        format: null,
        firstSeen: ad.ad_delivery_start_time ?? null,
        lastSeen: ad.ad_delivery_stop_time ?? null,
        isActive: !ad.ad_delivery_stop_time,
        regions: countries,
      }));

      const note =
        ads.length === 0
          ? `Meta Ad Library returned no ads for "${competitor.name}" in ${countries.join(', ')}. Outside the EU this API only covers social-issue, electoral and political ads, so this does not prove no ads are running.`
          : undefined;

      return { ads, note };
    } catch (error) {
      this.logger.error(
        `Meta Ad Library request failed: ${(error as Error).message}`,
      );
      return {
        ads: [],
        note: `Meta Ad Library request failed: ${(error as Error).message}`,
      };
    }
  }

  // ---------------------------------------------------------------
  // Google Ads Transparency Center (via SerpAPI - Google has no public API)
  // ---------------------------------------------------------------

  private async fetchGoogleAds(competitor: {
    name: string;
    website: string | null;
  }): Promise<{ ads: ObservedAd[]; note?: string }> {
    const apiKey = await this.credentialsService.get('SERPAPI_KEY');

    if (!apiKey) {
      return {
        ads: [],
        note: 'Google Ads Transparency Center was not queried: set SERPAPI_KEY in admin credentials. Google publishes no direct API for this.',
      };
    }

    const params = new URLSearchParams({
      engine: 'google_ads_transparency_center',
      text: competitor.name,
      api_key: apiKey,
    });

    try {
      const response = await fetch(
        `https://serpapi.com/search?${params.toString()}`,
      );

      if (!response.ok) {
        return {
          ads: [],
          note: `Google Ads Transparency lookup failed with status ${response.status}.`,
        };
      }

      const data = await response.json();
      if (data.error) {
        return {
          ads: [],
          note: `Google Ads Transparency lookup failed: ${data.error}`,
        };
      }

      const results = data.ad_creatives || data.ads_results || [];
      const ads: ObservedAd[] = results.map((ad: any, index: number) => ({
        source: 'google_ads_transparency' as const,
        adId: String(ad.advertiser_id ?? ad.creative_id ?? `google-${index}`),
        advertiser: ad.advertiser ?? ad.advertiser_name ?? null,
        permalink: ad.link ?? ad.details_link ?? null,
        creativeBodies: [ad.description, ad.body].filter(Boolean),
        creativeTitles: [ad.title].filter(Boolean),
        platforms: [ad.format === 'video' ? 'youtube' : 'google_search'],
        format: ad.format ?? null,
        firstSeen: ad.first_shown ?? null,
        lastSeen: ad.last_shown ?? null,
        isActive: null,
        regions: ad.region ? [ad.region] : [],
      }));

      const note =
        ads.length === 0
          ? `Google Ads Transparency Center returned no ads for "${competitor.name}".`
          : undefined;

      return { ads, note };
    } catch (error) {
      this.logger.error(
        `Google Ads Transparency request failed: ${(error as Error).message}`,
      );
      return {
        ads: [],
        note: `Google Ads Transparency request failed: ${(error as Error).message}`,
      };
    }
  }
}
