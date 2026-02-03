// Base provider interface for AI scraper providers

export interface CompetitorQuery {
  competitorName?: string;
  competitorUrl?: string;
  industry?: string;
  includeSocial?: boolean;
  includeAds?: boolean;
}

export interface ProductQuery {
  businessDescription?: string;
  industry?: string;
  targetMarket?: string;
  existingProducts?: string[];
}

export interface ServiceQuery {
  businessDescription?: string;
  industry?: string;
  businessModel?: string;
  existingServices?: string[];
}

export interface AudienceQuery {
  businessDescription?: string;
  industry?: string;
  products?: string[];
  services?: string[];
}

export interface BrandQuery {
  businessName?: string;
  businessDescription?: string;
  industry?: string;
  targetAudience?: string;
  existingBrandVoice?: string;
}

export interface CompetitorResult {
  basicInfo: {
    name?: string;
    website?: string;
    description?: string;
    industry?: string;
    size?: string;
    founded?: string;
    headquarters?: string;
  };
  socialMedia?: {
    facebook?: { url?: string; followers?: number; engagementRate?: number };
    instagram?: { url?: string; followers?: number; engagementRate?: number };
    linkedin?: { url?: string; followers?: number };
    twitter?: { url?: string; followers?: number };
    youtube?: { url?: string; subscribers?: number };
    tiktok?: { url?: string; followers?: number };
  };
  marketPosition?: {
    pricePosition?: string;
    targetAudience?: string;
    marketShare?: string;
    uniqueSellingPoints?: string[];
  };
  swot?: {
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    threats?: string[];
  };
  products?: string[];
  services?: string[];
  adIntelligence?: {
    platforms?: string[];
    estimatedBudget?: string;
    topAds?: string[];
    contentTypes?: string[];
  };
}

export interface ProductResult {
  name: string;
  description?: string;
  category?: string;
  features?: string[];
  benefits?: string[];
  targetMarket?: string;
  priceRange?: string;
  differentiators?: string[];
}

export interface ServiceResult {
  name: string;
  description?: string;
  category?: string;
  deliverables?: string[];
  benefits?: string[];
  targetMarket?: string;
  priceRange?: string;
  duration?: string;
}

export interface AudienceResult {
  name: string;
  description?: string;
  demographics?: {
    ageRange?: string;
    gender?: string;
    income?: string;
    education?: string;
    occupation?: string;
    location?: string;
  };
  psychographics?: {
    interests?: string[];
    values?: string[];
    lifestyle?: string;
    personality?: string;
  };
  painPoints?: string[];
  goals?: string[];
  buyingBehavior?: string;
  preferredChannels?: string[];
}

export interface BrandResult {
  brandVoice?: string;
  toneAttributes?: string[];
  brandPersonality?: string;
  brandArchetype?: string;
  tagline?: string;
  keyMessages?: string[];
  contentThemes?: string[];
  writingStyle?: string;
}

// Business URL Scan Query and Result
export interface BusinessScanQuery {
  url: string;
  urlType?: 'website' | 'linkedin' | 'google_my_business' | 'facebook' | 'instagram' | 'twitter' | 'youtube' | 'unknown';
  context?: string;
}

export interface BusinessScanResult {
  // Basic Info
  name?: string;
  description?: string;
  industry?: string;
  subIndustry?: string;
  foundedYear?: number;
  employeeCount?: string;
  headquarters?: string;
  website?: string;

  // Contact
  email?: string;
  phone?: string;
  address?: string;

  // Social Media Links
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };

  // Social Stats
  socialStats?: {
    facebookFollowers?: number;
    instagramFollowers?: number;
    linkedinFollowers?: number;
    twitterFollowers?: number;
    youtubeSubscribers?: number;
  };

  // Products & Services
  products?: string[];
  services?: string[];

  // Market Position
  targetAudience?: string;
  pricePosition?: string;
  uniqueSellingPoints?: string[];
  valueProposition?: string;

  // Brand
  brandVoice?: string;
  tagline?: string;
  mission?: string;
  vision?: string;
  brandKeywords?: string[];

  // Reviews & Ratings (from Google My Business)
  googleRating?: number;
  googleReviewCount?: number;
  facebookRating?: number;

  // Additional
  openingHours?: string;
  categories?: string[];
}

export interface ProviderResult<T> {
  provider: string;
  success: boolean;
  data?: T;
  error?: string;
  dataTypes?: string[];
}

export abstract class BaseAiScraperProvider {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly description: string;

  abstract isAvailable(): Promise<boolean>;

  abstract searchCompetitor(query: CompetitorQuery): Promise<ProviderResult<CompetitorResult>>;
  abstract searchProducts(query: ProductQuery): Promise<ProviderResult<ProductResult[]>>;
  abstract searchServices(query: ServiceQuery): Promise<ProviderResult<ServiceResult[]>>;
  abstract searchAudience(query: AudienceQuery): Promise<ProviderResult<AudienceResult[]>>;
  abstract analyzeBrand(query: BrandQuery): Promise<ProviderResult<BrandResult>>;
  abstract scanBusinessUrl(query: BusinessScanQuery): Promise<ProviderResult<BusinessScanResult>>;

  // Helper method to create successful result
  protected success<T>(data: T, dataTypes?: string[]): ProviderResult<T> {
    return {
      provider: this.name,
      success: true,
      data,
      dataTypes,
    };
  }

  // Helper method to create error result
  protected error<T>(message: string): ProviderResult<T> {
    return {
      provider: this.name,
      success: false,
      error: message,
    };
  }
}
