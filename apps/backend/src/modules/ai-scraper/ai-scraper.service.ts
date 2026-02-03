import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { PerplexityProvider } from './providers/perplexity.provider';
import { SerperClaudeProvider } from './providers/serper-claude.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { FirecrawlClaudeProvider } from './providers/firecrawl-claude.provider';
import { OrchestratorService } from './orchestrator.service';
import { MergerService, MergedResult } from './merger.service';
import {
  AiProvider,
  FetchCompetitorDto,
  FetchProductsDto,
  FetchServicesDto,
  FetchAudiencesDto,
  FetchBrandDto,
  ScanBusinessUrlDto,
  ProviderInfoDto,
  CREDIT_COSTS,
} from './dto/scraper.dto';
import {
  BaseAiScraperProvider,
  CompetitorResult,
  ProductResult,
  ServiceResult,
  AudienceResult,
  BrandResult,
  BusinessScanResult,
} from './providers/base-provider';

@Injectable()
export class AiScraperService {
  private providers: Map<string, BaseAiScraperProvider> = new Map();

  constructor(
    private prisma: PrismaService,
    private credentialsService: CredentialsService,
    private perplexityProvider: PerplexityProvider,
    private serperProvider: SerperClaudeProvider,
    private openaiProvider: OpenAIProvider,
    private firecrawlProvider: FirecrawlClaudeProvider,
    private orchestratorService: OrchestratorService,
    private mergerService: MergerService,
  ) {
    this.providers.set('perplexity', perplexityProvider);
    this.providers.set('serper', serperProvider);
    this.providers.set('openai', openaiProvider);
    this.providers.set('firecrawl', firecrawlProvider);
  }

  // Get available providers for the user
  async getAvailableProviders(userId: string): Promise<{
    providers: ProviderInfoDto[];
    defaultProvider: string;
  }> {
    const providerInfos: ProviderInfoDto[] = [
      {
        name: 'auto',
        displayName: 'Auto - Let AI Choose',
        description: 'Intelligently combines multiple providers for best results (Recommended)',
        available: true,
      },
    ];

    for (const [name, provider] of this.providers) {
      const available = await provider.isAvailable();
      providerInfos.push({
        name,
        displayName: provider.displayName,
        description: provider.description,
        available,
        reason: available ? undefined : 'API key not configured',
      });
    }

    // Check if at least one provider is available for auto mode
    const hasAvailableProvider = providerInfos.some(
      p => p.name !== 'auto' && p.available,
    );

    if (!hasAvailableProvider) {
      providerInfos[0].available = false;
      providerInfos[0].reason = 'No AI providers configured';
    }

    return {
      providers: providerInfos,
      defaultProvider: hasAvailableProvider ? 'auto' : '',
    };
  }

  // Check and deduct credits
  private async checkAndDeductCredits(
    userId: string,
    fetchType: string,
    isAutoMode: boolean,
  ): Promise<number> {
    const costs = isAutoMode ? CREDIT_COSTS.auto : CREDIT_COSTS.single;
    const cost = (costs as any)[fetchType] || 5;

    // Get user's subscription
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user?.subscription) {
      throw new BadRequestException('No active subscription');
    }

    if (user.subscription.creditsRemaining < cost) {
      throw new BadRequestException(
        `Insufficient credits. Required: ${cost}, Available: ${user.subscription.creditsRemaining}`,
      );
    }

    // Deduct credits
    await this.prisma.subscription.update({
      where: { id: user.subscription.id },
      data: {
        creditsRemaining: { decrement: cost },
      },
    });

    return cost;
  }

  // Fetch competitor data
  async fetchCompetitorData(
    userId: string,
    dto: FetchCompetitorDto,
  ): Promise<{
    success: boolean;
    data?: MergedResult<CompetitorResult> | CompetitorResult;
    creditsUsed: number;
    error?: string;
  }> {
    const isAutoMode = dto.provider === AiProvider.AUTO;
    const creditsUsed = await this.checkAndDeductCredits(userId, 'competitor', isAutoMode);

    try {
      if (isAutoMode) {
        // Use orchestrator for auto mode
        const orchestratedResults = await this.orchestratorService.executeCompetitorFetch({
          competitorName: dto.competitorName,
          competitorUrl: dto.competitorUrl,
          industry: dto.industry,
          includeSocial: dto.includeSocial,
          includeAds: dto.includeAds,
        });

        if (orchestratedResults.results.length === 0) {
          return {
            success: false,
            creditsUsed,
            error: 'No providers returned results',
          };
        }

        // Merge results
        const merged = await this.mergerService.mergeCompetitorResults(
          orchestratedResults.results,
        );

        return {
          success: true,
          data: merged,
          creditsUsed,
        };
      } else {
        // Use specific provider
        const provider = this.providers.get(dto.provider);
        if (!provider) {
          return {
            success: false,
            creditsUsed,
            error: 'Invalid provider',
          };
        }

        const available = await provider.isAvailable();
        if (!available) {
          return {
            success: false,
            creditsUsed,
            error: `${provider.displayName} is not available. Please configure the API key.`,
          };
        }

        const result = await provider.searchCompetitor({
          competitorName: dto.competitorName,
          competitorUrl: dto.competitorUrl,
          industry: dto.industry,
          includeSocial: dto.includeSocial,
          includeAds: dto.includeAds,
        });

        if (!result.success) {
          return {
            success: false,
            creditsUsed,
            error: result.error,
          };
        }

        return {
          success: true,
          data: result.data,
          creditsUsed,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        creditsUsed,
        error: error.message,
      };
    }
  }

  // Fetch product suggestions
  async fetchProductSuggestions(
    userId: string,
    dto: FetchProductsDto,
  ): Promise<{
    success: boolean;
    data?: MergedResult<ProductResult[]> | ProductResult[];
    creditsUsed: number;
    error?: string;
  }> {
    const isAutoMode = dto.provider === AiProvider.AUTO;
    const creditsUsed = await this.checkAndDeductCredits(userId, 'products', isAutoMode);

    try {
      if (isAutoMode) {
        const orchestratedResults = await this.orchestratorService.executeProductsFetch({
          businessDescription: dto.businessDescription,
          industry: dto.industry,
          targetMarket: dto.targetMarket,
          existingProducts: dto.existingProducts,
        });

        if (orchestratedResults.results.length === 0) {
          return {
            success: false,
            creditsUsed,
            error: 'No providers returned results',
          };
        }

        const merged = await this.mergerService.mergeProductResults(
          orchestratedResults.results,
        );

        return {
          success: true,
          data: merged,
          creditsUsed,
        };
      } else {
        const provider = this.providers.get(dto.provider);
        if (!provider) {
          return { success: false, creditsUsed, error: 'Invalid provider' };
        }

        const available = await provider.isAvailable();
        if (!available) {
          return {
            success: false,
            creditsUsed,
            error: `${provider.displayName} is not available`,
          };
        }

        const result = await provider.searchProducts({
          businessDescription: dto.businessDescription,
          industry: dto.industry,
          targetMarket: dto.targetMarket,
          existingProducts: dto.existingProducts,
        });

        return {
          success: result.success,
          data: result.data,
          creditsUsed,
          error: result.error,
        };
      }
    } catch (error: any) {
      return { success: false, creditsUsed, error: error.message };
    }
  }

  // Fetch service suggestions
  async fetchServiceSuggestions(
    userId: string,
    dto: FetchServicesDto,
  ): Promise<{
    success: boolean;
    data?: MergedResult<ServiceResult[]> | ServiceResult[];
    creditsUsed: number;
    error?: string;
  }> {
    const isAutoMode = dto.provider === AiProvider.AUTO;
    const creditsUsed = await this.checkAndDeductCredits(userId, 'services', isAutoMode);

    try {
      if (isAutoMode) {
        const orchestratedResults = await this.orchestratorService.executeServicesFetch({
          businessDescription: dto.businessDescription,
          industry: dto.industry,
          businessModel: dto.businessModel,
          existingServices: dto.existingServices,
        });

        if (orchestratedResults.results.length === 0) {
          return {
            success: false,
            creditsUsed,
            error: 'No providers returned results',
          };
        }

        const merged = await this.mergerService.mergeServiceResults(
          orchestratedResults.results,
        );

        return {
          success: true,
          data: merged,
          creditsUsed,
        };
      } else {
        const provider = this.providers.get(dto.provider);
        if (!provider) {
          return { success: false, creditsUsed, error: 'Invalid provider' };
        }

        const available = await provider.isAvailable();
        if (!available) {
          return {
            success: false,
            creditsUsed,
            error: `${provider.displayName} is not available`,
          };
        }

        const result = await provider.searchServices({
          businessDescription: dto.businessDescription,
          industry: dto.industry,
          businessModel: dto.businessModel,
          existingServices: dto.existingServices,
        });

        return {
          success: result.success,
          data: result.data,
          creditsUsed,
          error: result.error,
        };
      }
    } catch (error: any) {
      return { success: false, creditsUsed, error: error.message };
    }
  }

  // Fetch audience insights
  async fetchAudienceInsights(
    userId: string,
    dto: FetchAudiencesDto,
  ): Promise<{
    success: boolean;
    data?: MergedResult<AudienceResult[]> | AudienceResult[];
    creditsUsed: number;
    error?: string;
  }> {
    const isAutoMode = dto.provider === AiProvider.AUTO;
    const creditsUsed = await this.checkAndDeductCredits(userId, 'audiences', isAutoMode);

    try {
      if (isAutoMode) {
        const orchestratedResults = await this.orchestratorService.executeAudiencesFetch({
          businessDescription: dto.businessDescription,
          industry: dto.industry,
          products: dto.products,
          services: dto.services,
        });

        if (orchestratedResults.results.length === 0) {
          return {
            success: false,
            creditsUsed,
            error: 'No providers returned results',
          };
        }

        const merged = await this.mergerService.mergeAudienceResults(
          orchestratedResults.results,
        );

        return {
          success: true,
          data: merged,
          creditsUsed,
        };
      } else {
        const provider = this.providers.get(dto.provider);
        if (!provider) {
          return { success: false, creditsUsed, error: 'Invalid provider' };
        }

        const available = await provider.isAvailable();
        if (!available) {
          return {
            success: false,
            creditsUsed,
            error: `${provider.displayName} is not available`,
          };
        }

        const result = await provider.searchAudience({
          businessDescription: dto.businessDescription,
          industry: dto.industry,
          products: dto.products,
          services: dto.services,
        });

        return {
          success: result.success,
          data: result.data,
          creditsUsed,
          error: result.error,
        };
      }
    } catch (error: any) {
      return { success: false, creditsUsed, error: error.message };
    }
  }

  // Fetch brand suggestions
  async fetchBrandSuggestions(
    userId: string,
    dto: FetchBrandDto,
  ): Promise<{
    success: boolean;
    data?: MergedResult<BrandResult> | BrandResult;
    creditsUsed: number;
    error?: string;
  }> {
    const isAutoMode = dto.provider === AiProvider.AUTO;
    const creditsUsed = await this.checkAndDeductCredits(userId, 'brand', isAutoMode);

    try {
      if (isAutoMode) {
        const orchestratedResults = await this.orchestratorService.executeBrandFetch({
          businessName: dto.businessName,
          businessDescription: dto.businessDescription,
          industry: dto.industry,
          targetAudience: dto.targetAudience,
          existingBrandVoice: dto.existingBrandVoice,
        });

        if (orchestratedResults.results.length === 0) {
          return {
            success: false,
            creditsUsed,
            error: 'No providers returned results',
          };
        }

        const merged = await this.mergerService.mergeBrandResults(
          orchestratedResults.results,
        );

        return {
          success: true,
          data: merged,
          creditsUsed,
        };
      } else {
        const provider = this.providers.get(dto.provider);
        if (!provider) {
          return { success: false, creditsUsed, error: 'Invalid provider' };
        }

        const available = await provider.isAvailable();
        if (!available) {
          return {
            success: false,
            creditsUsed,
            error: `${provider.displayName} is not available`,
          };
        }

        const result = await provider.analyzeBrand({
          businessName: dto.businessName,
          businessDescription: dto.businessDescription,
          industry: dto.industry,
          targetAudience: dto.targetAudience,
          existingBrandVoice: dto.existingBrandVoice,
        });

        return {
          success: result.success,
          data: result.data,
          creditsUsed,
          error: result.error,
        };
      }
    } catch (error: any) {
      return { success: false, creditsUsed, error: error.message };
    }
  }

  // Scan business URL to extract company information
  async scanBusinessUrl(
    userId: string,
    dto: ScanBusinessUrlDto,
  ): Promise<{
    success: boolean;
    data?: MergedResult<BusinessScanResult> | BusinessScanResult;
    creditsUsed: number;
    error?: string;
  }> {
    const isAutoMode = dto.provider === AiProvider.AUTO;
    const creditsUsed = await this.checkAndDeductCredits(userId, 'scanUrl', isAutoMode);

    try {
      if (isAutoMode) {
        // For auto mode, use multiple providers and merge results
        const availableProviders: BaseAiScraperProvider[] = [];

        for (const provider of this.providers.values()) {
          if (await provider.isAvailable()) {
            availableProviders.push(provider);
          }
        }

        if (availableProviders.length === 0) {
          return {
            success: false,
            creditsUsed,
            error: 'No AI providers available',
          };
        }

        // Run all available providers in parallel
        const results = await Promise.allSettled(
          availableProviders.map(provider =>
            provider.scanBusinessUrl({
              url: dto.url,
              urlType: dto.urlType,
              context: dto.context,
            }),
          ),
        );

        const successfulResults = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.success)
          .map(r => r.value);

        if (successfulResults.length === 0) {
          return {
            success: false,
            creditsUsed,
            error: 'All providers failed to scan the URL',
          };
        }

        // Merge results from all providers
        const merged = await this.mergerService.mergeBusinessScanResults(successfulResults);

        return {
          success: true,
          data: merged,
          creditsUsed,
        };
      } else {
        // Use specific provider
        const provider = this.providers.get(dto.provider);
        if (!provider) {
          return { success: false, creditsUsed, error: 'Invalid provider' };
        }

        const available = await provider.isAvailable();
        if (!available) {
          return {
            success: false,
            creditsUsed,
            error: `${provider.displayName} is not available`,
          };
        }

        const result = await provider.scanBusinessUrl({
          url: dto.url,
          urlType: dto.urlType,
          context: dto.context,
        });

        return {
          success: result.success,
          data: result.data,
          creditsUsed,
          error: result.error,
        };
      }
    } catch (error: any) {
      return { success: false, creditsUsed, error: error.message };
    }
  }
}
