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
export class PerplexityProvider extends BaseAiScraperProvider {
  readonly name = 'perplexity';
  readonly displayName = 'Perplexity AI';
  readonly description = 'Real-time web search with AI analysis - best for company data, news, and social presence';

  private apiKey: string | null = null;

  constructor(private credentialsService: CredentialsService) {
    super();
  }

  async isAvailable(): Promise<boolean> {
    try {
      this.apiKey = await this.credentialsService.get('PERPLEXITY_API_KEY');
      return !!this.apiKey;
    } catch {
      return false;
    }
  }

  private async callPerplexity(prompt: string): Promise<any> {
    if (!this.apiKey) {
      this.apiKey = await this.credentialsService.get('PERPLEXITY_API_KEY');
    }

    if (!this.apiKey) {
      throw new Error('Perplexity API key not configured');
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a business research assistant. Provide accurate, up-to-date information from the web. Always respond with valid JSON only, no markdown or explanations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from Perplexity');
    }

    // Parse JSON from response
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch {
      throw new Error('Failed to parse Perplexity response as JSON');
    }
  }

  async searchCompetitor(query: CompetitorQuery): Promise<ProviderResult<CompetitorResult>> {
    try {
      const searchTerm = query.competitorUrl || query.competitorName;
      if (!searchTerm) {
        return this.error('Competitor name or URL is required');
      }

      const prompt = `Research the company "${searchTerm}"${query.industry ? ` in the ${query.industry} industry` : ''}.

Return a JSON object with the following structure:
{
  "basicInfo": {
    "name": "company name",
    "website": "website URL",
    "description": "brief company description",
    "industry": "industry",
    "size": "company size (e.g., '50-200 employees')",
    "founded": "year founded",
    "headquarters": "headquarters location"
  },
  "socialMedia": {
    "facebook": { "url": "facebook URL", "followers": estimated_number },
    "instagram": { "url": "instagram URL", "followers": estimated_number },
    "linkedin": { "url": "linkedin URL", "followers": estimated_number },
    "twitter": { "url": "twitter URL", "followers": estimated_number }
  },
  "marketPosition": {
    "pricePosition": "budget/mid-range/premium/luxury",
    "targetAudience": "target audience description",
    "uniqueSellingPoints": ["USP 1", "USP 2"]
  },
  "products": ["product 1", "product 2"],
  "services": ["service 1", "service 2"]
}

Only include fields you can verify. Use null for unknown values.`;

      const result = await this.callPerplexity(prompt);
      return this.success(result, ['overview', 'social', 'products']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async searchProducts(query: ProductQuery): Promise<ProviderResult<ProductResult[]>> {
    try {
      const prompt = `Suggest 5 product ideas for a business with the following profile:
- Industry: ${query.industry || 'general'}
- Description: ${query.businessDescription || 'not specified'}
- Target Market: ${query.targetMarket || 'general consumers'}
${query.existingProducts?.length ? `- Existing Products (avoid these): ${query.existingProducts.join(', ')}` : ''}

Return a JSON array of product suggestions:
[
  {
    "name": "Product Name",
    "description": "Brief description",
    "category": "Product category",
    "features": ["feature 1", "feature 2"],
    "benefits": ["benefit 1", "benefit 2"],
    "targetMarket": "Target market for this product",
    "priceRange": "Suggested price range",
    "differentiators": ["What makes it unique"]
  }
]`;

      const result = await this.callPerplexity(prompt);
      const products = Array.isArray(result) ? result : result.products || [];
      return this.success(products, ['products']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async searchServices(query: ServiceQuery): Promise<ProviderResult<ServiceResult[]>> {
    try {
      const prompt = `Suggest 5 service offerings for a business with the following profile:
- Industry: ${query.industry || 'general'}
- Description: ${query.businessDescription || 'not specified'}
- Business Model: ${query.businessModel || 'B2B/B2C'}
${query.existingServices?.length ? `- Existing Services (avoid these): ${query.existingServices.join(', ')}` : ''}

Return a JSON array of service suggestions:
[
  {
    "name": "Service Name",
    "description": "Brief description",
    "category": "Service category",
    "deliverables": ["deliverable 1", "deliverable 2"],
    "benefits": ["benefit 1", "benefit 2"],
    "targetMarket": "Target market for this service",
    "priceRange": "Suggested pricing",
    "duration": "Typical duration/timeline"
  }
]`;

      const result = await this.callPerplexity(prompt);
      const services = Array.isArray(result) ? result : result.services || [];
      return this.success(services, ['services']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async searchAudience(query: AudienceQuery): Promise<ProviderResult<AudienceResult[]>> {
    try {
      const prompt = `Identify 3 target audience segments for a business with the following profile:
- Industry: ${query.industry || 'general'}
- Description: ${query.businessDescription || 'not specified'}
${query.products?.length ? `- Products: ${query.products.join(', ')}` : ''}
${query.services?.length ? `- Services: ${query.services.join(', ')}` : ''}

Return a JSON array of audience segments:
[
  {
    "name": "Segment Name (e.g., 'Young Professionals')",
    "description": "Brief description of this audience",
    "demographics": {
      "ageRange": "25-35",
      "gender": "All/Male/Female",
      "income": "Income level",
      "education": "Education level",
      "occupation": "Common occupations",
      "location": "Geographic focus"
    },
    "psychographics": {
      "interests": ["interest 1", "interest 2"],
      "values": ["value 1", "value 2"],
      "lifestyle": "Lifestyle description",
      "personality": "Personality traits"
    },
    "painPoints": ["pain point 1", "pain point 2"],
    "goals": ["goal 1", "goal 2"],
    "buyingBehavior": "How they typically buy",
    "preferredChannels": ["channel 1", "channel 2"]
  }
]`;

      const result = await this.callPerplexity(prompt);
      const audiences = Array.isArray(result) ? result : result.audiences || [];
      return this.success(audiences, ['audiences']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async analyzeBrand(query: BrandQuery): Promise<ProviderResult<BrandResult>> {
    try {
      const prompt = `Suggest brand voice and messaging for a business:
- Name: ${query.businessName || 'not specified'}
- Industry: ${query.industry || 'general'}
- Description: ${query.businessDescription || 'not specified'}
- Target Audience: ${query.targetAudience || 'general'}
${query.existingBrandVoice ? `- Current Brand Voice: ${query.existingBrandVoice}` : ''}

Return a JSON object with brand recommendations:
{
  "brandVoice": "Overall brand voice description (e.g., 'Professional yet approachable')",
  "toneAttributes": ["attribute 1", "attribute 2", "attribute 3"],
  "brandPersonality": "Brand personality description",
  "brandArchetype": "Hero/Creator/Sage/Innocent/Explorer/Ruler/Magician/Lover/Jester/Everyman/Caregiver/Outlaw",
  "tagline": "Suggested tagline",
  "keyMessages": ["key message 1", "key message 2", "key message 3"],
  "contentThemes": ["theme 1", "theme 2", "theme 3"],
  "writingStyle": "Recommended writing style"
}`;

      const result = await this.callPerplexity(prompt);
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

      const urlType = query.urlType || this.detectUrlType(query.url);
      let prompt: string;

      if (urlType === 'linkedin') {
        prompt = `Research the company from this LinkedIn page: "${query.url}"
${query.context ? `Additional context: ${query.context}` : ''}

Search for and extract all available business information.`;
      } else if (urlType === 'google_my_business') {
        prompt = `Research this business from Google My Business/Maps: "${query.url}"
${query.context ? `Additional context: ${query.context}` : ''}

Search for reviews, ratings, hours, and all business details.`;
      } else if (urlType === 'facebook') {
        prompt = `Research this business from their Facebook page: "${query.url}"
${query.context ? `Additional context: ${query.context}` : ''}

Extract business info, follower count, and engagement data.`;
      } else if (urlType === 'instagram') {
        prompt = `Research this business from their Instagram profile: "${query.url}"
${query.context ? `Additional context: ${query.context}` : ''}

Extract business info, follower count, and content style.`;
      } else {
        prompt = `Research this business website thoroughly: "${query.url}"
${query.context ? `Additional context: ${query.context}` : ''}

Search for all available information about this company including their about page, services, team, contact info, and social media presence.`;
      }

      prompt += `

Return a comprehensive JSON object with all discovered information:
{
  "name": "Company/Business name",
  "description": "Company description/about",
  "industry": "Primary industry",
  "subIndustry": "Sub-industry or niche",
  "foundedYear": year_number_or_null,
  "employeeCount": "Employee range (e.g., '10-50')",
  "headquarters": "Location/City, Country",
  "website": "Main website URL",
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
  "valueProposition": "Their main value proposition",
  "brandVoice": "How they communicate (professional, friendly, etc.)",
  "tagline": "Company tagline/slogan if found",
  "mission": "Mission statement if found",
  "vision": "Vision statement if found",
  "brandKeywords": ["keyword1", "keyword2"],
  "googleRating": rating_number_or_null,
  "googleReviewCount": count_or_null,
  "openingHours": "Business hours if applicable",
  "categories": ["category1", "category2"]
}

Use null for any fields you cannot find. Be thorough and accurate.`;

      const result = await this.callPerplexity(prompt);
      return this.success(result, ['profile', 'social', 'brand']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  private detectUrlType(url: string): string {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('linkedin.com')) return 'linkedin';
    if (lowerUrl.includes('google.com/maps') || lowerUrl.includes('goo.gl/maps') || lowerUrl.includes('business.google')) return 'google_my_business';
    if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) return 'facebook';
    if (lowerUrl.includes('instagram.com')) return 'instagram';
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'twitter';
    if (lowerUrl.includes('youtube.com')) return 'youtube';
    return 'website';
  }
}
