import { Injectable } from '@nestjs/common';
import { CredentialsService } from '../../credentials/credentials.service';
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
  BusinessScanQuery,
  BusinessScanResult,
  ProviderResult,
} from './base-provider';

@Injectable()
export class SerperClaudeProvider extends BaseAiScraperProvider {
  readonly name = 'serper';
  readonly displayName = 'Serper + Claude';
  readonly description = 'Google search results analyzed by Claude - cost-effective for general research';

  private serperApiKey: string | null = null;
  private anthropicApiKey: string | null = null;
  private Anthropic: any = null;

  constructor(private credentialsService: CredentialsService) {
    super();
  }

  async isAvailable(): Promise<boolean> {
    try {
      this.serperApiKey = await this.credentialsService.get('SERPER_API_KEY');
      this.anthropicApiKey = await this.credentialsService.get('ANTHROPIC_API_KEY');
      return !!this.serperApiKey && !!this.anthropicApiKey;
    } catch {
      return false;
    }
  }

  private async searchGoogle(query: string): Promise<any> {
    if (!this.serperApiKey) {
      this.serperApiKey = await this.credentialsService.get('SERPER_API_KEY');
    }

    if (!this.serperApiKey) {
      throw new Error('Serper API key not configured');
    }

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': this.serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.statusText}`);
    }

    return response.json();
  }

  private async analyzeWithClaude(searchResults: any, prompt: string): Promise<any> {
    if (!this.anthropicApiKey) {
      this.anthropicApiKey = await this.credentialsService.get('ANTHROPIC_API_KEY');
    }

    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Lazy load Anthropic SDK
    if (!this.Anthropic) {
      try {
        const anthropicModule = await import('@anthropic-ai/sdk');
        this.Anthropic = anthropicModule.default || anthropicModule.Anthropic;
      } catch {
        throw new Error('Anthropic SDK not available');
      }
    }

    const client = new this.Anthropic({ apiKey: this.anthropicApiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Based on the following Google search results, ${prompt}

Search Results:
${JSON.stringify(searchResults, null, 2)}

Respond with valid JSON only, no markdown or explanations.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content.text);
    } catch {
      throw new Error('Failed to parse Claude response as JSON');
    }
  }

  async searchCompetitor(query: CompetitorQuery): Promise<ProviderResult<CompetitorResult>> {
    try {
      const searchTerm = query.competitorUrl || query.competitorName;
      if (!searchTerm) {
        return this.error('Competitor name or URL is required');
      }

      // Perform multiple searches
      const [companySearch, socialSearch, reviewSearch] = await Promise.all([
        this.searchGoogle(`${searchTerm} company info about`),
        this.searchGoogle(`${searchTerm} social media followers linkedin facebook instagram`),
        this.searchGoogle(`${searchTerm} reviews ratings customers`),
      ]);

      const combinedResults = {
        company: companySearch,
        social: socialSearch,
        reviews: reviewSearch,
      };

      const result = await this.analyzeWithClaude(
        combinedResults,
        `extract comprehensive information about "${searchTerm}" company.

Return a JSON object:
{
  "basicInfo": {
    "name": "company name",
    "website": "website URL",
    "description": "company description",
    "industry": "industry",
    "size": "company size estimate",
    "founded": "year",
    "headquarters": "location"
  },
  "socialMedia": {
    "facebook": { "url": "URL if found", "followers": number_estimate },
    "instagram": { "url": "URL if found", "followers": number_estimate },
    "linkedin": { "url": "URL if found", "followers": number_estimate },
    "twitter": { "url": "URL if found", "followers": number_estimate }
  },
  "marketPosition": {
    "pricePosition": "budget/mid-range/premium",
    "targetAudience": "description",
    "uniqueSellingPoints": ["usp1", "usp2"]
  },
  "products": ["product1", "product2"],
  "services": ["service1", "service2"]
}

Use null for unknown values.`,
      );

      return this.success(result, ['overview', 'social', 'reviews']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async searchProducts(query: ProductQuery): Promise<ProviderResult<ProductResult[]>> {
    try {
      const searchQuery = `${query.industry || 'business'} product ideas ${query.targetMarket || ''} trends 2024`;
      const searchResults = await this.searchGoogle(searchQuery);

      const result = await this.analyzeWithClaude(
        searchResults,
        `suggest 5 innovative product ideas based on these search results for a business in the ${query.industry || 'general'} industry.

Business context: ${query.businessDescription || 'general business'}
Target market: ${query.targetMarket || 'general consumers'}
${query.existingProducts?.length ? `Avoid these existing products: ${query.existingProducts.join(', ')}` : ''}

Return a JSON array:
[
  {
    "name": "Product Name",
    "description": "Description",
    "category": "Category",
    "features": ["feature1", "feature2"],
    "benefits": ["benefit1", "benefit2"],
    "targetMarket": "Target market",
    "priceRange": "Price range",
    "differentiators": ["differentiator1"]
  }
]`,
      );

      const products = Array.isArray(result) ? result : result.products || [];
      return this.success(products, ['products']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async searchServices(query: ServiceQuery): Promise<ProviderResult<ServiceResult[]>> {
    try {
      const searchQuery = `${query.industry || 'business'} services offerings ${query.businessModel || 'B2B'} trends`;
      const searchResults = await this.searchGoogle(searchQuery);

      const result = await this.analyzeWithClaude(
        searchResults,
        `suggest 5 service offerings based on these search results for a ${query.businessModel || 'B2B/B2C'} business.

Industry: ${query.industry || 'general'}
Business description: ${query.businessDescription || 'general business'}
${query.existingServices?.length ? `Avoid these existing services: ${query.existingServices.join(', ')}` : ''}

Return a JSON array:
[
  {
    "name": "Service Name",
    "description": "Description",
    "category": "Category",
    "deliverables": ["deliverable1", "deliverable2"],
    "benefits": ["benefit1", "benefit2"],
    "targetMarket": "Target market",
    "priceRange": "Pricing",
    "duration": "Duration"
  }
]`,
      );

      const services = Array.isArray(result) ? result : result.services || [];
      return this.success(services, ['services']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async searchAudience(query: AudienceQuery): Promise<ProviderResult<AudienceResult[]>> {
    try {
      const searchQuery = `${query.industry || 'business'} target audience demographics customer segments`;
      const searchResults = await this.searchGoogle(searchQuery);

      const result = await this.analyzeWithClaude(
        searchResults,
        `identify 3 target audience segments based on these search results.

Industry: ${query.industry || 'general'}
Business description: ${query.businessDescription || 'general business'}
${query.products?.length ? `Products: ${query.products.join(', ')}` : ''}
${query.services?.length ? `Services: ${query.services.join(', ')}` : ''}

Return a JSON array:
[
  {
    "name": "Segment Name",
    "description": "Description",
    "demographics": {
      "ageRange": "age range",
      "gender": "gender",
      "income": "income level",
      "education": "education",
      "occupation": "occupation",
      "location": "location"
    },
    "psychographics": {
      "interests": ["interest1"],
      "values": ["value1"],
      "lifestyle": "lifestyle",
      "personality": "personality"
    },
    "painPoints": ["pain1"],
    "goals": ["goal1"],
    "buyingBehavior": "behavior",
    "preferredChannels": ["channel1"]
  }
]`,
      );

      const audiences = Array.isArray(result) ? result : result.audiences || [];
      return this.success(audiences, ['audiences']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async analyzeBrand(query: BrandQuery): Promise<ProviderResult<BrandResult>> {
    try {
      const searchQuery = `${query.industry || 'business'} brand voice tone messaging examples`;
      const searchResults = await this.searchGoogle(searchQuery);

      const result = await this.analyzeWithClaude(
        searchResults,
        `suggest brand voice and messaging based on industry trends.

Business: ${query.businessName || 'not specified'}
Industry: ${query.industry || 'general'}
Description: ${query.businessDescription || 'general business'}
Target audience: ${query.targetAudience || 'general'}
${query.existingBrandVoice ? `Current brand voice: ${query.existingBrandVoice}` : ''}

Return a JSON object:
{
  "brandVoice": "Brand voice description",
  "toneAttributes": ["attr1", "attr2", "attr3"],
  "brandPersonality": "Personality description",
  "brandArchetype": "Archetype name",
  "tagline": "Suggested tagline",
  "keyMessages": ["message1", "message2"],
  "contentThemes": ["theme1", "theme2"],
  "writingStyle": "Writing style"
}`,
      );

      return this.success(result, ['brand']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async scanBusinessUrl(query: BusinessScanQuery): Promise<ProviderResult<BusinessScanResult>> {
    try {
      if (!query.url) {
        return this.error('URL is required');
      }

      // Search Google for information about this URL/business
      const searchQueries = [
        `site:${new URL(query.url.startsWith('http') ? query.url : 'https://' + query.url).hostname}`,
        `"${query.url}" company information about`,
      ];

      let combinedResults = '';
      for (const sq of searchQueries) {
        try {
          const results = await this.searchGoogle(sq);
          combinedResults += JSON.stringify(results) + '\n\n';
        } catch {
          // Continue with other queries
        }
      }

      const result = await this.analyzeWithClaude(
        combinedResults,
        `extract business information about "${query.url}" from these search results.
${query.context ? `Additional context: ${query.context}` : ''}

Return a comprehensive JSON object:
{
  "name": "Company/Business name",
  "description": "Company description/about",
  "industry": "Primary industry",
  "subIndustry": "Sub-industry or niche",
  "foundedYear": year_number_or_null,
  "employeeCount": "Employee range",
  "headquarters": "Location",
  "website": "${query.url}",
  "email": "Contact email if found",
  "phone": "Phone number if found",
  "address": "Full address if found",
  "socialLinks": {
    "facebook": "Facebook URL",
    "instagram": "Instagram URL",
    "linkedin": "LinkedIn URL",
    "twitter": "Twitter/X URL",
    "youtube": "YouTube URL",
    "tiktok": "TikTok URL"
  },
  "socialStats": {
    "facebookFollowers": number_or_null,
    "instagramFollowers": number_or_null,
    "linkedinFollowers": number_or_null,
    "twitterFollowers": number_or_null,
    "youtubeSubscribers": number_or_null
  },
  "products": ["product 1", "product 2"],
  "services": ["service 1", "service 2"],
  "targetAudience": "Who they serve",
  "pricePosition": "budget/mid-range/premium/luxury",
  "uniqueSellingPoints": ["USP 1", "USP 2"],
  "valueProposition": "Main value proposition",
  "brandVoice": "Communication style",
  "tagline": "Company tagline/slogan",
  "mission": "Mission statement",
  "vision": "Vision statement",
  "brandKeywords": ["keyword1", "keyword2"],
  "googleRating": rating_number_or_null,
  "googleReviewCount": count_or_null,
  "openingHours": "Business hours",
  "categories": ["category1", "category2"]
}

Use null for fields not found in search results.`,
      );

      return this.success(result, ['profile', 'social', 'brand']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}
