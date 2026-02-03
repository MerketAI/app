import { Injectable } from '@nestjs/common';
import { PerplexityProvider } from './providers/perplexity.provider';
import { SerperClaudeProvider } from './providers/serper-claude.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { FirecrawlClaudeProvider } from './providers/firecrawl-claude.provider';
import {
  BaseAiScraperProvider,
  CompetitorQuery,
  CompetitorResult,
  ProductQuery,
  ProductResult,
  ServiceQuery,
  ServiceResult,
  AudienceQuery,
  AudienceResult,
  BrandQuery,
  BrandResult,
  ProviderResult,
} from './providers/base-provider';

export interface ExecutionTask {
  provider: string;
  dataTypes: string[];
  priority: number;
}

export interface ExecutionPlan {
  tasks: ExecutionTask[];
  totalProviders: number;
}

export interface OrchestratedResult<T> {
  results: ProviderResult<T>[];
  completedProviders: string[];
  failedProviders: string[];
}

// Provider strength matrix for different data types
const PROVIDER_STRENGTHS: Record<string, Record<string, number>> = {
  perplexity: {
    overview: 0.9,
    news: 0.95,
    social: 0.8,
    market_analysis: 0.7,
    products: 0.7,
    services: 0.7,
    audiences: 0.7,
    brand: 0.7,
  },
  serper: {
    overview: 0.8,
    news: 0.85,
    social: 0.7,
    reviews: 0.9,
    market_analysis: 0.75,
    products: 0.75,
    services: 0.75,
    audiences: 0.7,
    brand: 0.7,
    ads: 0.8,
  },
  openai: {
    overview: 0.6,
    swot: 0.95,
    market_analysis: 0.9,
    products: 0.85,
    services: 0.85,
    audiences: 0.9,
    brand: 0.9,
  },
  firecrawl: {
    website: 0.95,
    products: 0.9,
    pricing: 0.9,
    services: 0.85,
    overview: 0.8,
  },
};

// Data types needed for each fetch type
const FETCH_DATA_NEEDS: Record<string, string[]> = {
  competitor: ['overview', 'website', 'social', 'swot', 'market_analysis', 'products', 'services', 'ads'],
  products: ['products', 'market_analysis'],
  services: ['services', 'market_analysis'],
  audiences: ['audiences', 'market_analysis'],
  brand: ['brand'],
};

@Injectable()
export class OrchestratorService {
  private providers: Map<string, BaseAiScraperProvider> = new Map();

  constructor(
    private perplexityProvider: PerplexityProvider,
    private serperProvider: SerperClaudeProvider,
    private openaiProvider: OpenAIProvider,
    private firecrawlProvider: FirecrawlClaudeProvider,
  ) {
    this.providers.set('perplexity', perplexityProvider);
    this.providers.set('serper', serperProvider);
    this.providers.set('openai', openaiProvider);
    this.providers.set('firecrawl', firecrawlProvider);
  }

  async getAvailableProviders(): Promise<{ name: string; available: boolean }[]> {
    const results = await Promise.all(
      Array.from(this.providers.entries()).map(async ([name, provider]) => ({
        name,
        available: await provider.isAvailable(),
      })),
    );
    return results;
  }

  async planExecution(fetchType: string): Promise<ExecutionPlan> {
    const availableProviders = await this.getAvailableProviders();
    const available = availableProviders.filter(p => p.available).map(p => p.name);

    if (available.length === 0) {
      return { tasks: [], totalProviders: 0 };
    }

    const dataNeeds = FETCH_DATA_NEEDS[fetchType] || [];
    const tasks: ExecutionTask[] = [];

    // Assign data types to best available providers
    const assignedDataTypes = new Set<string>();

    for (const dataType of dataNeeds) {
      // Find best provider for this data type
      let bestProvider: string | null = null;
      let bestScore = 0;

      for (const providerName of available) {
        const score = PROVIDER_STRENGTHS[providerName]?.[dataType] || 0;
        if (score > bestScore) {
          bestScore = score;
          bestProvider = providerName;
        }
      }

      if (bestProvider && bestScore > 0) {
        // Find or create task for this provider
        let task = tasks.find(t => t.provider === bestProvider);
        if (!task) {
          task = { provider: bestProvider, dataTypes: [], priority: 0 };
          tasks.push(task);
        }
        task.dataTypes.push(dataType);
        task.priority = Math.max(task.priority, bestScore);
        assignedDataTypes.add(dataType);
      }
    }

    // Sort by priority (highest first)
    tasks.sort((a, b) => b.priority - a.priority);

    return {
      tasks,
      totalProviders: tasks.length,
    };
  }

  async executeCompetitorFetch(
    query: CompetitorQuery,
  ): Promise<OrchestratedResult<CompetitorResult>> {
    const plan = await this.planExecution('competitor');
    const results: ProviderResult<CompetitorResult>[] = [];
    const completedProviders: string[] = [];
    const failedProviders: string[] = [];

    // Execute all providers in parallel
    const promises = plan.tasks.map(async task => {
      const provider = this.providers.get(task.provider);
      if (!provider) return null;

      try {
        const result = await provider.searchCompetitor(query);
        if (result.success) {
          completedProviders.push(task.provider);
        } else {
          failedProviders.push(task.provider);
        }
        return { ...result, dataTypes: task.dataTypes };
      } catch (error: any) {
        failedProviders.push(task.provider);
        return {
          provider: task.provider,
          success: false,
          error: error.message,
          dataTypes: task.dataTypes,
        };
      }
    });

    const settledResults = await Promise.allSettled(promises);

    for (const settled of settledResults) {
      if (settled.status === 'fulfilled' && settled.value) {
        results.push(settled.value);
      }
    }

    return { results, completedProviders, failedProviders };
  }

  async executeProductsFetch(
    query: ProductQuery,
  ): Promise<OrchestratedResult<ProductResult[]>> {
    const plan = await this.planExecution('products');
    const results: ProviderResult<ProductResult[]>[] = [];
    const completedProviders: string[] = [];
    const failedProviders: string[] = [];

    const promises = plan.tasks.map(async task => {
      const provider = this.providers.get(task.provider);
      if (!provider) return null;

      try {
        const result = await provider.searchProducts(query);
        if (result.success) {
          completedProviders.push(task.provider);
        } else {
          failedProviders.push(task.provider);
        }
        return { ...result, dataTypes: task.dataTypes };
      } catch (error: any) {
        failedProviders.push(task.provider);
        return {
          provider: task.provider,
          success: false,
          error: error.message,
          dataTypes: task.dataTypes,
        };
      }
    });

    const settledResults = await Promise.allSettled(promises);

    for (const settled of settledResults) {
      if (settled.status === 'fulfilled' && settled.value) {
        results.push(settled.value);
      }
    }

    return { results, completedProviders, failedProviders };
  }

  async executeServicesFetch(
    query: ServiceQuery,
  ): Promise<OrchestratedResult<ServiceResult[]>> {
    const plan = await this.planExecution('services');
    const results: ProviderResult<ServiceResult[]>[] = [];
    const completedProviders: string[] = [];
    const failedProviders: string[] = [];

    const promises = plan.tasks.map(async task => {
      const provider = this.providers.get(task.provider);
      if (!provider) return null;

      try {
        const result = await provider.searchServices(query);
        if (result.success) {
          completedProviders.push(task.provider);
        } else {
          failedProviders.push(task.provider);
        }
        return { ...result, dataTypes: task.dataTypes };
      } catch (error: any) {
        failedProviders.push(task.provider);
        return {
          provider: task.provider,
          success: false,
          error: error.message,
          dataTypes: task.dataTypes,
        };
      }
    });

    const settledResults = await Promise.allSettled(promises);

    for (const settled of settledResults) {
      if (settled.status === 'fulfilled' && settled.value) {
        results.push(settled.value);
      }
    }

    return { results, completedProviders, failedProviders };
  }

  async executeAudiencesFetch(
    query: AudienceQuery,
  ): Promise<OrchestratedResult<AudienceResult[]>> {
    const plan = await this.planExecution('audiences');
    const results: ProviderResult<AudienceResult[]>[] = [];
    const completedProviders: string[] = [];
    const failedProviders: string[] = [];

    const promises = plan.tasks.map(async task => {
      const provider = this.providers.get(task.provider);
      if (!provider) return null;

      try {
        const result = await provider.searchAudience(query);
        if (result.success) {
          completedProviders.push(task.provider);
        } else {
          failedProviders.push(task.provider);
        }
        return { ...result, dataTypes: task.dataTypes };
      } catch (error: any) {
        failedProviders.push(task.provider);
        return {
          provider: task.provider,
          success: false,
          error: error.message,
          dataTypes: task.dataTypes,
        };
      }
    });

    const settledResults = await Promise.allSettled(promises);

    for (const settled of settledResults) {
      if (settled.status === 'fulfilled' && settled.value) {
        results.push(settled.value);
      }
    }

    return { results, completedProviders, failedProviders };
  }

  async executeBrandFetch(
    query: BrandQuery,
  ): Promise<OrchestratedResult<BrandResult>> {
    const plan = await this.planExecution('brand');
    const results: ProviderResult<BrandResult>[] = [];
    const completedProviders: string[] = [];
    const failedProviders: string[] = [];

    const promises = plan.tasks.map(async task => {
      const provider = this.providers.get(task.provider);
      if (!provider) return null;

      try {
        const result = await provider.analyzeBrand(query);
        if (result.success) {
          completedProviders.push(task.provider);
        } else {
          failedProviders.push(task.provider);
        }
        return { ...result, dataTypes: task.dataTypes };
      } catch (error: any) {
        failedProviders.push(task.provider);
        return {
          provider: task.provider,
          success: false,
          error: error.message,
          dataTypes: task.dataTypes,
        };
      }
    });

    const settledResults = await Promise.allSettled(promises);

    for (const settled of settledResults) {
      if (settled.status === 'fulfilled' && settled.value) {
        results.push(settled.value);
      }
    }

    return { results, completedProviders, failedProviders };
  }
}
