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
export class OpenAIProvider extends BaseAiScraperProvider {
  readonly name = 'openai';
  readonly displayName = 'OpenAI';
  readonly description = 'GPT-4 powered analysis - best for complex research and SWOT analysis';

  private apiKey: string | null = null;

  constructor(private credentialsService: CredentialsService) {
    super();
  }

  async isAvailable(): Promise<boolean> {
    try {
      this.apiKey = await this.credentialsService.get('OPENAI_API_KEY');
      return !!this.apiKey;
    } catch {
      return false;
    }
  }

  private async callOpenAI(prompt: string, systemPrompt?: string): Promise<any> {
    if (!this.apiKey) {
      this.apiKey = await this.credentialsService.get('OPENAI_API_KEY');
    }

    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: systemPrompt || 'You are a business research and analysis expert. Provide accurate, well-researched information. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);
  }

  async searchCompetitor(query: CompetitorQuery): Promise<ProviderResult<CompetitorResult>> {
    try {
      const searchTerm = query.competitorUrl || query.competitorName;
      if (!searchTerm) {
        return this.error('Competitor name or URL is required');
      }

      const result = await this.callOpenAI(
        `Analyze the competitor "${searchTerm}"${query.industry ? ` in the ${query.industry} industry` : ''}.

Based on your knowledge, provide a comprehensive SWOT analysis and market positioning assessment.

Return a JSON object:
{
  "basicInfo": {
    "name": "company name",
    "description": "company description based on knowledge",
    "industry": "industry"
  },
  "marketPosition": {
    "pricePosition": "budget/mid-range/premium/luxury",
    "targetAudience": "target audience description",
    "marketShare": "estimated market share or position",
    "uniqueSellingPoints": ["USP 1", "USP 2", "USP 3"]
  },
  "swot": {
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
    "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
    "threats": ["threat 1", "threat 2", "threat 3"]
  },
  "adIntelligence": {
    "platforms": ["likely advertising platforms"],
    "estimatedBudget": "budget estimate range",
    "contentTypes": ["content type 1", "content type 2"]
  }
}`,
        'You are a competitive intelligence analyst specializing in market research and SWOT analysis.',
      );

      return this.success(result, ['swot', 'market_analysis', 'ads']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async searchProducts(query: ProductQuery): Promise<ProviderResult<ProductResult[]>> {
    try {
      const result = await this.callOpenAI(
        `As a product strategy consultant, suggest 5 innovative product ideas for:

Industry: ${query.industry || 'general'}
Business Description: ${query.businessDescription || 'not specified'}
Target Market: ${query.targetMarket || 'general consumers'}
${query.existingProducts?.length ? `Existing Products (avoid duplicating): ${query.existingProducts.join(', ')}` : ''}

Consider market trends, customer needs, and competitive differentiation.

Return JSON:
{
  "products": [
    {
      "name": "Product Name",
      "description": "Detailed description",
      "category": "Product category",
      "features": ["feature 1", "feature 2", "feature 3"],
      "benefits": ["benefit 1", "benefit 2", "benefit 3"],
      "targetMarket": "Specific target market",
      "priceRange": "Recommended price range",
      "differentiators": ["What makes it unique 1", "What makes it unique 2"]
    }
  ]
}`,
        'You are a product strategy consultant with expertise in market trends and innovation.',
      );

      return this.success(result.products || [], ['products']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async searchServices(query: ServiceQuery): Promise<ProviderResult<ServiceResult[]>> {
    try {
      const result = await this.callOpenAI(
        `As a business services consultant, suggest 5 service offerings for:

Industry: ${query.industry || 'general'}
Business Model: ${query.businessModel || 'B2B/B2C'}
Business Description: ${query.businessDescription || 'not specified'}
${query.existingServices?.length ? `Existing Services (avoid duplicating): ${query.existingServices.join(', ')}` : ''}

Consider market demand, profitability, and scalability.

Return JSON:
{
  "services": [
    {
      "name": "Service Name",
      "description": "Detailed description",
      "category": "Service category",
      "deliverables": ["deliverable 1", "deliverable 2", "deliverable 3"],
      "benefits": ["benefit 1", "benefit 2", "benefit 3"],
      "targetMarket": "Specific target market",
      "priceRange": "Recommended pricing structure",
      "duration": "Typical engagement duration"
    }
  ]
}`,
        'You are a business services consultant with expertise in service design and market fit.',
      );

      return this.success(result.services || [], ['services']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async searchAudience(query: AudienceQuery): Promise<ProviderResult<AudienceResult[]>> {
    try {
      const result = await this.callOpenAI(
        `As a market research analyst, identify 3 distinct target audience segments for:

Industry: ${query.industry || 'general'}
Business Description: ${query.businessDescription || 'not specified'}
${query.products?.length ? `Products Offered: ${query.products.join(', ')}` : ''}
${query.services?.length ? `Services Offered: ${query.services.join(', ')}` : ''}

Provide detailed demographic, psychographic, and behavioral insights.

Return JSON:
{
  "audiences": [
    {
      "name": "Segment Name (descriptive)",
      "description": "Overview of this audience segment",
      "demographics": {
        "ageRange": "specific age range",
        "gender": "All/Male/Female/Other",
        "income": "income bracket",
        "education": "education level",
        "occupation": "typical occupations",
        "location": "geographic focus"
      },
      "psychographics": {
        "interests": ["interest 1", "interest 2", "interest 3"],
        "values": ["value 1", "value 2", "value 3"],
        "lifestyle": "lifestyle description",
        "personality": "personality traits"
      },
      "painPoints": ["pain point 1", "pain point 2", "pain point 3"],
      "goals": ["goal 1", "goal 2", "goal 3"],
      "buyingBehavior": "detailed buying behavior description",
      "preferredChannels": ["channel 1", "channel 2", "channel 3"]
    }
  ]
}`,
        'You are a market research analyst specializing in customer segmentation and buyer personas.',
      );

      return this.success(result.audiences || [], ['audiences']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  async analyzeBrand(query: BrandQuery): Promise<ProviderResult<BrandResult>> {
    try {
      const result = await this.callOpenAI(
        `As a brand strategist, develop brand voice and messaging recommendations for:

Business Name: ${query.businessName || 'not specified'}
Industry: ${query.industry || 'general'}
Business Description: ${query.businessDescription || 'not specified'}
Target Audience: ${query.targetAudience || 'general audience'}
${query.existingBrandVoice ? `Current Brand Voice: ${query.existingBrandVoice}` : ''}

Provide comprehensive brand positioning recommendations.

Return JSON:
{
  "brandVoice": "Detailed brand voice description",
  "toneAttributes": ["attribute 1", "attribute 2", "attribute 3", "attribute 4", "attribute 5"],
  "brandPersonality": "Brand personality description",
  "brandArchetype": "Primary brand archetype (Hero/Creator/Sage/Innocent/Explorer/Ruler/Magician/Lover/Jester/Everyman/Caregiver/Outlaw)",
  "tagline": "Suggested brand tagline",
  "keyMessages": ["key message 1", "key message 2", "key message 3"],
  "contentThemes": ["content theme 1", "content theme 2", "content theme 3"],
  "writingStyle": "Detailed writing style guidelines"
}`,
        'You are a brand strategist with expertise in brand positioning, voice development, and messaging architecture.',
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

      const result = await this.callOpenAI(
        `Research this business URL thoroughly: "${query.url}"
${query.context ? `Additional context: ${query.context}` : ''}

Using your knowledge and web browsing capabilities, gather all available information about this business.

Return a comprehensive JSON object:
{
  "name": "Company/Business name",
  "description": "Company description/about",
  "industry": "Primary industry",
  "subIndustry": "Sub-industry or niche",
  "foundedYear": year_number_or_null,
  "employeeCount": "Employee range",
  "headquarters": "Location/City, Country",
  "website": "Main website URL",
  "email": "Contact email if known",
  "phone": "Phone number if known",
  "address": "Full address if known",
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
  "brandVoice": "How they communicate",
  "tagline": "Company tagline/slogan",
  "mission": "Mission statement",
  "vision": "Vision statement",
  "brandKeywords": ["keyword1", "keyword2"],
  "googleRating": rating_number_or_null,
  "googleReviewCount": count_or_null,
  "openingHours": "Business hours if applicable",
  "categories": ["category1", "category2"]
}

Use null for any fields you cannot determine.`,
        'You are a business research analyst with access to web information. Provide accurate, verified information only.',
      );

      return this.success(result, ['profile', 'social', 'brand']);
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}
