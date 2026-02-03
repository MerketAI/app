import { Injectable } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';
import {
  CompetitorResult,
  ProductResult,
  ServiceResult,
  AudienceResult,
  BrandResult,
  BusinessScanResult,
  ProviderResult,
} from './providers/base-provider';
import { SourceAttribution, ConflictResolution } from './dto/scraper.dto';

export interface MergedResult<T> {
  data: T;
  sources: Record<string, SourceAttribution[]>;
  conflicts: ConflictResolution[];
}

// Provider reliability scores for conflict resolution
const PROVIDER_RELIABILITY: Record<string, number> = {
  firecrawl: 0.95, // Direct website scraping is most reliable
  perplexity: 0.85, // Real-time web search
  serper: 0.8, // Google search + Claude analysis
  openai: 0.7, // Knowledge-based (may be outdated)
};

@Injectable()
export class MergerService {
  private Anthropic: any = null;
  private anthropicApiKey: string | null = null;

  constructor(private credentialsService: CredentialsService) {}

  // Merge competitor results from multiple providers
  async mergeCompetitorResults(
    results: ProviderResult<CompetitorResult>[],
  ): Promise<MergedResult<CompetitorResult>> {
    const successfulResults = results.filter(r => r.success && r.data);
    const sources: Record<string, SourceAttribution[]> = {};
    const conflicts: ConflictResolution[] = [];

    if (successfulResults.length === 0) {
      return {
        data: {} as CompetitorResult,
        sources,
        conflicts,
      };
    }

    if (successfulResults.length === 1) {
      const result = successfulResults[0];
      return {
        data: result.data!,
        sources: this.createSingleSource(result.data!, result.provider),
        conflicts: [],
      };
    }

    // Merge basic info
    const mergedBasicInfo = this.mergeObjects(
      successfulResults.map(r => ({
        provider: r.provider,
        data: r.data?.basicInfo || {},
      })),
      'basicInfo',
      sources,
      conflicts,
    );

    // Merge social media
    const mergedSocialMedia = this.mergeObjects(
      successfulResults.map(r => ({
        provider: r.provider,
        data: r.data?.socialMedia || {},
      })),
      'socialMedia',
      sources,
      conflicts,
    );

    // Merge market position
    const mergedMarketPosition = this.mergeObjects(
      successfulResults.map(r => ({
        provider: r.provider,
        data: r.data?.marketPosition || {},
      })),
      'marketPosition',
      sources,
      conflicts,
    );

    // Merge SWOT (combine arrays, deduplicate)
    const mergedSwot = this.mergeSwot(
      successfulResults.map(r => ({
        provider: r.provider,
        data: r.data?.swot,
      })),
      sources,
    );

    // Merge products (combine and deduplicate)
    const mergedProducts = this.mergeArrays(
      successfulResults.map(r => ({
        provider: r.provider,
        data: r.data?.products || [],
      })),
      'products',
      sources,
    );

    // Merge services
    const mergedServices = this.mergeArrays(
      successfulResults.map(r => ({
        provider: r.provider,
        data: r.data?.services || [],
      })),
      'services',
      sources,
    );

    // Merge ad intelligence
    const mergedAdIntelligence = this.mergeObjects(
      successfulResults.map(r => ({
        provider: r.provider,
        data: r.data?.adIntelligence || {},
      })),
      'adIntelligence',
      sources,
      conflicts,
    );

    const mergedData: CompetitorResult = {
      basicInfo: mergedBasicInfo,
      socialMedia: mergedSocialMedia,
      marketPosition: mergedMarketPosition,
      swot: mergedSwot,
      products: mergedProducts,
      services: mergedServices,
      adIntelligence: mergedAdIntelligence,
    };

    return { data: mergedData, sources, conflicts };
  }

  // Merge product results from multiple providers
  async mergeProductResults(
    results: ProviderResult<ProductResult[]>[],
  ): Promise<MergedResult<ProductResult[]>> {
    const successfulResults = results.filter(r => r.success && r.data);
    const sources: Record<string, SourceAttribution[]> = {};

    if (successfulResults.length === 0) {
      return { data: [], sources, conflicts: [] };
    }

    // Combine all products and deduplicate by name similarity
    const allProducts: { product: ProductResult; provider: string }[] = [];

    for (const result of successfulResults) {
      for (const product of result.data || []) {
        allProducts.push({ product, provider: result.provider });
      }
    }

    const mergedProducts = this.deduplicateByName(
      allProducts.map(p => ({ item: p.product, provider: p.provider })),
      'name',
    );

    // Track sources
    for (let i = 0; i < mergedProducts.length; i++) {
      const key = `products[${i}]`;
      const item = allProducts.find(p => p.product.name === mergedProducts[i].name);
      if (item) {
        sources[key] = [
          {
            provider: item.provider,
            confidence: PROVIDER_RELIABILITY[item.provider] || 0.5,
            rawValue: item.product,
          },
        ];
      }
    }

    return { data: mergedProducts, sources, conflicts: [] };
  }

  // Merge service results from multiple providers
  async mergeServiceResults(
    results: ProviderResult<ServiceResult[]>[],
  ): Promise<MergedResult<ServiceResult[]>> {
    const successfulResults = results.filter(r => r.success && r.data);
    const sources: Record<string, SourceAttribution[]> = {};

    if (successfulResults.length === 0) {
      return { data: [], sources, conflicts: [] };
    }

    const allServices: { service: ServiceResult; provider: string }[] = [];

    for (const result of successfulResults) {
      for (const service of result.data || []) {
        allServices.push({ service, provider: result.provider });
      }
    }

    const mergedServices = this.deduplicateByName(
      allServices.map(s => ({ item: s.service, provider: s.provider })),
      'name',
    );

    for (let i = 0; i < mergedServices.length; i++) {
      const key = `services[${i}]`;
      const item = allServices.find(s => s.service.name === mergedServices[i].name);
      if (item) {
        sources[key] = [
          {
            provider: item.provider,
            confidence: PROVIDER_RELIABILITY[item.provider] || 0.5,
            rawValue: item.service,
          },
        ];
      }
    }

    return { data: mergedServices, sources, conflicts: [] };
  }

  // Merge audience results from multiple providers
  async mergeAudienceResults(
    results: ProviderResult<AudienceResult[]>[],
  ): Promise<MergedResult<AudienceResult[]>> {
    const successfulResults = results.filter(r => r.success && r.data);
    const sources: Record<string, SourceAttribution[]> = {};

    if (successfulResults.length === 0) {
      return { data: [], sources, conflicts: [] };
    }

    const allAudiences: { audience: AudienceResult; provider: string }[] = [];

    for (const result of successfulResults) {
      for (const audience of result.data || []) {
        allAudiences.push({ audience, provider: result.provider });
      }
    }

    const mergedAudiences = this.deduplicateByName(
      allAudiences.map(a => ({ item: a.audience, provider: a.provider })),
      'name',
    );

    for (let i = 0; i < mergedAudiences.length; i++) {
      const key = `audiences[${i}]`;
      const item = allAudiences.find(a => a.audience.name === mergedAudiences[i].name);
      if (item) {
        sources[key] = [
          {
            provider: item.provider,
            confidence: PROVIDER_RELIABILITY[item.provider] || 0.5,
            rawValue: item.audience,
          },
        ];
      }
    }

    return { data: mergedAudiences, sources, conflicts: [] };
  }

  // Merge brand results from multiple providers
  async mergeBrandResults(
    results: ProviderResult<BrandResult>[],
  ): Promise<MergedResult<BrandResult>> {
    const successfulResults = results.filter(r => r.success && r.data);
    const sources: Record<string, SourceAttribution[]> = {};
    const conflicts: ConflictResolution[] = [];

    if (successfulResults.length === 0) {
      return { data: {} as BrandResult, sources, conflicts };
    }

    if (successfulResults.length === 1) {
      const result = successfulResults[0];
      return {
        data: result.data!,
        sources: this.createSingleSource(result.data!, result.provider),
        conflicts: [],
      };
    }

    // Merge brand data
    const mergedData = this.mergeObjects(
      successfulResults.map(r => ({
        provider: r.provider,
        data: r.data || {},
      })),
      'brand',
      sources,
      conflicts,
    );

    // Merge array fields specially
    const arrayFields = ['toneAttributes', 'keyMessages', 'contentThemes'];
    for (const field of arrayFields) {
      const merged = this.mergeArrays(
        successfulResults.map(r => ({
          provider: r.provider,
          data: (r.data as any)?.[field] || [],
        })),
        field,
        sources,
      );
      (mergedData as any)[field] = merged;
    }

    return { data: mergedData as BrandResult, sources, conflicts };
  }

  // Merge business scan results from multiple providers
  async mergeBusinessScanResults(
    results: ProviderResult<BusinessScanResult>[],
  ): Promise<MergedResult<BusinessScanResult>> {
    const successfulResults = results.filter(r => r.success && r.data);
    const sources: Record<string, SourceAttribution[]> = {};
    const conflicts: ConflictResolution[] = [];

    if (successfulResults.length === 0) {
      return { data: {} as BusinessScanResult, sources, conflicts };
    }

    if (successfulResults.length === 1) {
      const result = successfulResults[0];
      return {
        data: result.data!,
        sources: this.createSingleSource(result.data!, result.provider),
        conflicts: [],
      };
    }

    // Merge all fields
    const mergedData = this.mergeObjects(
      successfulResults.map(r => ({
        provider: r.provider,
        data: r.data || {},
      })),
      'profile',
      sources,
      conflicts,
    );

    // Merge array fields specially (products, services, etc.)
    const arrayFields = ['products', 'services', 'uniqueSellingPoints', 'brandKeywords', 'categories'];
    for (const field of arrayFields) {
      const merged = this.mergeArrays(
        successfulResults.map(r => ({
          provider: r.provider,
          data: (r.data as any)?.[field] || [],
        })),
        field,
        sources,
      );
      (mergedData as any)[field] = merged;
    }

    // Merge social links
    const socialLinksData = successfulResults
      .filter(r => r.data?.socialLinks)
      .map(r => ({
        provider: r.provider,
        data: r.data!.socialLinks || {},
      }));

    if (socialLinksData.length > 0) {
      mergedData.socialLinks = this.mergeObjects(
        socialLinksData,
        'socialLinks',
        sources,
        conflicts,
      );
    }

    // Merge social stats
    const socialStatsData = successfulResults
      .filter(r => r.data?.socialStats)
      .map(r => ({
        provider: r.provider,
        data: r.data!.socialStats || {},
      }));

    if (socialStatsData.length > 0) {
      mergedData.socialStats = this.mergeObjects(
        socialStatsData,
        'socialStats',
        sources,
        conflicts,
      );
    }

    return { data: mergedData as BusinessScanResult, sources, conflicts };
  }

  // Helper: Create source attribution for single provider result
  private createSingleSource(data: any, provider: string): Record<string, SourceAttribution[]> {
    const sources: Record<string, SourceAttribution[]> = {};
    const traverse = (obj: any, path: string) => {
      if (obj === null || obj === undefined) return;
      if (typeof obj !== 'object') {
        sources[path] = [
          {
            provider,
            confidence: PROVIDER_RELIABILITY[provider] || 0.5,
            rawValue: obj,
          },
        ];
        return;
      }
      for (const key of Object.keys(obj)) {
        traverse(obj[key], path ? `${path}.${key}` : key);
      }
    };
    traverse(data, '');
    return sources;
  }

  // Helper: Merge objects from multiple providers
  private mergeObjects(
    items: { provider: string; data: any }[],
    basePath: string,
    sources: Record<string, SourceAttribution[]>,
    conflicts: ConflictResolution[],
  ): any {
    const result: any = {};
    const allKeys = new Set<string>();

    for (const item of items) {
      if (item.data && typeof item.data === 'object') {
        Object.keys(item.data).forEach(k => allKeys.add(k));
      }
    }

    for (const key of allKeys) {
      const values = items
        .filter(item => item.data?.[key] !== null && item.data?.[key] !== undefined)
        .map(item => ({
          provider: item.provider,
          value: item.data[key],
          confidence: PROVIDER_RELIABILITY[item.provider] || 0.5,
        }));

      if (values.length === 0) continue;

      const fieldPath = `${basePath}.${key}`;

      if (values.length === 1) {
        result[key] = values[0].value;
        sources[fieldPath] = [
          {
            provider: values[0].provider,
            confidence: values[0].confidence,
            rawValue: values[0].value,
          },
        ];
      } else {
        // Check for conflicts
        const uniqueValues = this.getUniqueValues(values.map(v => v.value));

        if (uniqueValues.length === 1) {
          // All agree
          result[key] = uniqueValues[0];
          sources[fieldPath] = values.map(v => ({
            provider: v.provider,
            confidence: v.confidence,
            rawValue: v.value,
          }));
        } else {
          // Conflict - use highest confidence value
          const sorted = [...values].sort((a, b) => b.confidence - a.confidence);
          result[key] = sorted[0].value;

          sources[fieldPath] = values.map(v => ({
            provider: v.provider,
            confidence: v.confidence,
            rawValue: v.value,
          }));

          conflicts.push({
            field: fieldPath,
            values: values.map(v => ({ provider: v.provider, value: v.value })),
            resolved: sorted[0].value,
          });
        }
      }
    }

    return result;
  }

  // Helper: Merge SWOT analysis
  private mergeSwot(
    items: { provider: string; data: any }[],
    sources: Record<string, SourceAttribution[]>,
  ): any {
    const result: any = {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
    };

    for (const category of ['strengths', 'weaknesses', 'opportunities', 'threats']) {
      const allItems: string[] = [];
      const itemSources: { item: string; provider: string }[] = [];

      for (const item of items) {
        const categoryData = item.data?.[category] || [];
        for (const value of categoryData) {
          if (typeof value === 'string' && !allItems.includes(value.toLowerCase())) {
            allItems.push(value.toLowerCase());
            result[category].push(value);
            itemSources.push({ item: value, provider: item.provider });
          }
        }
      }

      // Track sources for SWOT items
      for (let i = 0; i < result[category].length; i++) {
        const source = itemSources[i];
        if (source) {
          sources[`swot.${category}[${i}]`] = [
            {
              provider: source.provider,
              confidence: PROVIDER_RELIABILITY[source.provider] || 0.5,
              rawValue: source.item,
            },
          ];
        }
      }
    }

    return result;
  }

  // Helper: Merge arrays and deduplicate
  private mergeArrays(
    items: { provider: string; data: any[] }[],
    basePath: string,
    sources: Record<string, SourceAttribution[]>,
  ): any[] {
    const result: any[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      for (const value of item.data || []) {
        const key = typeof value === 'string' ? value.toLowerCase() : JSON.stringify(value);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(value);
          sources[`${basePath}[${result.length - 1}]`] = [
            {
              provider: item.provider,
              confidence: PROVIDER_RELIABILITY[item.provider] || 0.5,
              rawValue: value,
            },
          ];
        }
      }
    }

    return result;
  }

  // Helper: Deduplicate items by name similarity
  private deduplicateByName<T extends { name: string }>(
    items: { item: T; provider: string }[],
    nameField: string = 'name',
  ): T[] {
    const result: T[] = [];
    const seen = new Set<string>();

    for (const { item } of items) {
      const name = (item as any)[nameField]?.toLowerCase() || '';
      if (!seen.has(name)) {
        seen.add(name);
        result.push(item);
      }
    }

    return result;
  }

  // Helper: Get unique values
  private getUniqueValues(values: any[]): any[] {
    const unique: any[] = [];
    const seen = new Set<string>();

    for (const value of values) {
      const key = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(value);
      }
    }

    return unique;
  }
}
