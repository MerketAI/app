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
export class FirecrawlClaudeProvider extends BaseAiScraperProvider {
  readonly name = 'firecrawl';
  readonly displayName = 'Firecrawl + Claude';
  readonly description = 'Deep website scraping with Claude analysis - best for detailed competitor website data';

  private firecrawlApiKey: string | null = null;
  private anthropicApiKey: string | null = null;
  private Anthropic: any = null;

  constructor(private credentialsService: CredentialsService) {
    super();
  }

  async isAvailable(): Promise<boolean> {
    try {
      this.firecrawlApiKey = await this.credentialsService.get('FIRECRAWL_API_KEY');
      this.anthropicApiKey = await this.credentialsService.get('ANTHROPIC_API_KEY');
      return !!this.firecrawlApiKey && !!this.anthropicApiKey;
    } catch {
      return false;
    }
  }

  private async scrapeUrl(url: string): Promise<any> {
    if (!this.firecrawlApiKey) {
      this.firecrawlApiKey = await this.credentialsService.get('FIRECRAWL_API_KEY');
    }

    if (!this.firecrawlApiKey) {
      throw new Error('Firecrawl API key not configured');
    }

    const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        pageOptions: {
          onlyMainContent: true,
          includeHtml: false,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Firecrawl API error: ${error}`);
    }

    const data = await response.json();
    return data.data?.markdown || data.data?.content || '';
  }

  private async crawlWebsite(url: string, limit: number = 5): Promise<any[]> {
    if (!this.firecrawlApiKey) {
      this.firecrawlApiKey = await this.credentialsService.get('FIRECRAWL_API_KEY');
    }

    if (!this.firecrawlApiKey) {
      throw new Error('Firecrawl API key not configured');
    }

    const response = await fetch('https://api.firecrawl.dev/v0/crawl', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        crawlerOptions: {
          limit,
          maxDepth: 2,
        },
        pageOptions: {
          onlyMainContent: true,
          includeHtml: false,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Firecrawl API error: ${error}`);
    }

    const data = await response.json();

    // If it's an async job, we need to poll for results
    if (data.jobId) {
      return this.pollCrawlJob(data.jobId);
    }

    return data.data || [];
  }

  private async pollCrawlJob(jobId: string, maxAttempts: number = 30): Promise<any[]> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const response = await fetch(`https://api.firecrawl.dev/v0/crawl/status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.firecrawlApiKey}`,
        },
      });

      if (!response.ok) continue;

      const data = await response.json();
      if (data.status === 'completed') {
        return data.data || [];
      }
      if (data.status === 'failed') {
        throw new Error('Crawl job failed');
      }
    }

    throw new Error('Crawl job timed out');
  }

  private async analyzeWithClaude(content: string, prompt: string): Promise<any> {
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

    // Truncate content if too long
    const maxContentLength = 100000;
    const truncatedContent = content.length > maxContentLength
      ? content.substring(0, maxContentLength) + '...[truncated]'
      : content;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Based on the following website content, ${prompt}

Website Content:
${truncatedContent}

Respond with valid JSON only, no markdown or explanations.`,
        },
      ],
    });

    const responseContent = response.content[0];
    if (responseContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    try {
      const jsonMatch = responseContent.text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(responseContent.text);
    } catch {
      throw new Error('Failed to parse Claude response as JSON');
    }
  }

  async searchCompetitor(query: CompetitorQuery): Promise<ProviderResult<CompetitorResult>> {
    try {
      let url = query.competitorUrl;

      if (!url && query.competitorName) {
        // Try to construct URL from company name
        const cleanName = query.competitorName.toLowerCase().replace(/[^a-z0-9]/g, '');
        url = `https://www.${cleanName}.com`;
      }

      if (!url) {
        return this.error('Competitor URL or name is required');
      }

      // Ensure URL has protocol
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      // Crawl multiple pages from the website
      let pages: any[];
      try {
        pages = await this.crawlWebsite(url, 5);
      } catch {
        // Fall back to single page scrape
        const content = await this.scrapeUrl(url);
        pages = [{ markdown: content, url }];
      }

      const combinedContent = pages
        .map(p => `=== Page: ${p.url || 'unknown'} ===\n${p.markdown || p.content || ''}`)
        .join('\n\n');

      const result = await this.analyzeWithClaude(
        combinedContent,
        `extract detailed information about this company.

Return a JSON object:
{
  "basicInfo": {
    "name": "company name from website",
    "website": "main website URL",
    "description": "company description/about",
    "industry": "industry",
    "size": "company size if mentioned",
    "founded": "year founded if found",
    "headquarters": "location if found"
  },
  "products": ["product 1", "product 2", "product 3"],
  "services": ["service 1", "service 2", "service 3"],
  "marketPosition": {
    "pricePosition": "budget/mid-range/premium based on pricing if found",
    "targetAudience": "target audience based on messaging",
    "uniqueSellingPoints": ["USP 1", "USP 2"]
  },
  "socialMedia": {
    "facebook": { "url": "facebook URL if found" },
    "instagram": { "url": "instagram URL if found" },
    "linkedin": { "url": "linkedin URL if found" },
    "twitter": { "url": "twitter URL if found" }
  }
}

Extract actual data from the website content. Use null for fields not found.`,
      );

      return this.success(result, ['website', 'products', 'pricing']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async searchProducts(query: ProductQuery): Promise<ProviderResult<ProductResult[]>> {
    try {
      // For products, we analyze based on industry context since we don't have a specific URL
      const prompt = `Based on your knowledge of the ${query.industry || 'general'} industry, suggest 5 product ideas.

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
]`;

      const result = await this.analyzeWithClaude('', prompt);
      const products = Array.isArray(result) ? result : result.products || [];
      return this.success(products, ['products']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async searchServices(query: ServiceQuery): Promise<ProviderResult<ServiceResult[]>> {
    try {
      const prompt = `Based on your knowledge of the ${query.industry || 'general'} industry, suggest 5 service offerings.

Business model: ${query.businessModel || 'B2B/B2C'}
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
]`;

      const result = await this.analyzeWithClaude('', prompt);
      const services = Array.isArray(result) ? result : result.services || [];
      return this.success(services, ['services']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async searchAudience(query: AudienceQuery): Promise<ProviderResult<AudienceResult[]>> {
    try {
      const prompt = `Identify 3 target audience segments for:

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
]`;

      const result = await this.analyzeWithClaude('', prompt);
      const audiences = Array.isArray(result) ? result : result.audiences || [];
      return this.success(audiences, ['audiences']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async analyzeBrand(query: BrandQuery): Promise<ProviderResult<BrandResult>> {
    try {
      const prompt = `Suggest brand voice and messaging for:

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
}`;

      const result = await this.analyzeWithClaude('', prompt);
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

      let url = query.url;
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      // Try to crawl multiple pages for comprehensive data
      let pages: any[];
      try {
        pages = await this.crawlWebsite(url, 8); // Get more pages for profile
      } catch {
        const content = await this.scrapeUrl(url);
        pages = [{ markdown: content, url }];
      }

      const combinedContent = pages
        .map(p => `=== Page: ${p.url || 'unknown'} ===\n${p.markdown || p.content || ''}`)
        .join('\n\n');

      const result = await this.analyzeWithClaude(
        combinedContent,
        `extract comprehensive business information from this website content.

Return a detailed JSON object with ALL available information:
{
  "name": "Company/Business name",
  "description": "Company description/about text",
  "industry": "Primary industry",
  "subIndustry": "Sub-industry or niche",
  "foundedYear": year_number_or_null,
  "employeeCount": "Employee range if mentioned",
  "headquarters": "Location/Address",
  "website": "${url}",
  "email": "Contact email if found",
  "phone": "Phone number if found",
  "address": "Full address if found",
  "socialLinks": {
    "facebook": "Facebook URL if found in page",
    "instagram": "Instagram URL if found",
    "linkedin": "LinkedIn URL if found",
    "twitter": "Twitter/X URL if found",
    "youtube": "YouTube URL if found",
    "tiktok": "TikTok URL if found"
  },
  "products": ["Product names from website"],
  "services": ["Service names from website"],
  "targetAudience": "Who they serve based on messaging",
  "pricePosition": "budget/mid-range/premium/luxury based on pricing info",
  "uniqueSellingPoints": ["Key value props from website"],
  "valueProposition": "Main value proposition",
  "brandVoice": "Communication style (professional, friendly, etc.)",
  "tagline": "Company tagline/slogan if found",
  "mission": "Mission statement if found",
  "vision": "Vision statement if found",
  "brandKeywords": ["Key terms they use"],
  "categories": ["Business categories"]
}

Extract actual data from the scraped content. Use null for fields not found.`,
      );

      return this.success(result, ['profile', 'products', 'services', 'brand']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}
