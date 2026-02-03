import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
} from 'class-validator';

export enum AiProvider {
  AUTO = 'auto',
  PERPLEXITY = 'perplexity',
  SERPER = 'serper',
  OPENAI = 'openai',
  FIRECRAWL = 'firecrawl',
}

// ============================================
// Fetch Competitor DTO
// ============================================

export class FetchCompetitorDto {
  @ApiProperty({
    enum: AiProvider,
    description: 'AI provider to use for fetching data',
    example: 'auto',
  })
  @IsEnum(AiProvider)
  provider: AiProvider;

  @ApiPropertyOptional({ description: 'Competitor company name' })
  @IsString()
  @IsOptional()
  competitorName?: string;

  @ApiPropertyOptional({ description: 'Competitor website URL' })
  @IsString()
  @IsOptional()
  competitorUrl?: string;

  @ApiPropertyOptional({ description: 'Industry for context' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Include social media data',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  includeSocial?: boolean;

  @ApiPropertyOptional({
    description: 'Include ad intelligence data',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  includeAds?: boolean;
}

// ============================================
// Fetch Products DTO
// ============================================

export class FetchProductsDto {
  @ApiProperty({
    enum: AiProvider,
    description: 'AI provider to use for fetching data',
  })
  @IsEnum(AiProvider)
  provider: AiProvider;

  @ApiPropertyOptional({ description: 'Business description for context' })
  @IsString()
  @IsOptional()
  businessDescription?: string;

  @ApiPropertyOptional({ description: 'Industry' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: 'Target market' })
  @IsString()
  @IsOptional()
  targetMarket?: string;

  @ApiPropertyOptional({
    description: 'Existing products to avoid duplicates',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  existingProducts?: string[];
}

// ============================================
// Fetch Services DTO
// ============================================

export class FetchServicesDto {
  @ApiProperty({
    enum: AiProvider,
    description: 'AI provider to use for fetching data',
  })
  @IsEnum(AiProvider)
  provider: AiProvider;

  @ApiPropertyOptional({ description: 'Business description for context' })
  @IsString()
  @IsOptional()
  businessDescription?: string;

  @ApiPropertyOptional({ description: 'Industry' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: 'Business model (B2B, B2C, etc.)' })
  @IsString()
  @IsOptional()
  businessModel?: string;

  @ApiPropertyOptional({
    description: 'Existing services to avoid duplicates',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  existingServices?: string[];
}

// ============================================
// Fetch Audiences DTO
// ============================================

export class FetchAudiencesDto {
  @ApiProperty({
    enum: AiProvider,
    description: 'AI provider to use for fetching data',
  })
  @IsEnum(AiProvider)
  provider: AiProvider;

  @ApiPropertyOptional({ description: 'Business description for context' })
  @IsString()
  @IsOptional()
  businessDescription?: string;

  @ApiPropertyOptional({ description: 'Industry' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Products offered',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  products?: string[];

  @ApiPropertyOptional({
    description: 'Services offered',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  services?: string[];
}

// ============================================
// Fetch Brand DTO
// ============================================

export class FetchBrandDto {
  @ApiProperty({
    enum: AiProvider,
    description: 'AI provider to use for fetching data',
  })
  @IsEnum(AiProvider)
  provider: AiProvider;

  @ApiPropertyOptional({ description: 'Business name' })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({ description: 'Business description for context' })
  @IsString()
  @IsOptional()
  businessDescription?: string;

  @ApiPropertyOptional({ description: 'Industry' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: 'Target audience description' })
  @IsString()
  @IsOptional()
  targetAudience?: string;

  @ApiPropertyOptional({ description: 'Existing brand voice' })
  @IsString()
  @IsOptional()
  existingBrandVoice?: string;
}

// ============================================
// Response DTOs
// ============================================

export class ProviderInfoDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  available: boolean;

  @ApiPropertyOptional()
  reason?: string;
}

export class AvailableProvidersResponseDto {
  @ApiProperty({ type: [ProviderInfoDto] })
  providers: ProviderInfoDto[];

  @ApiProperty()
  defaultProvider: string;
}

export class SourceAttribution {
  @ApiProperty()
  provider: string;

  @ApiProperty()
  confidence: number;

  @ApiPropertyOptional()
  rawValue?: any;
}

export class ConflictResolution {
  @ApiProperty()
  field: string;

  @ApiProperty()
  values: { provider: string; value: any }[];

  @ApiProperty()
  resolved: any;
}

export class FetchResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional()
  sources?: Record<string, SourceAttribution[]>;

  @ApiPropertyOptional({ type: [ConflictResolution] })
  conflicts?: ConflictResolution[];

  @ApiPropertyOptional()
  creditsUsed?: number;

  @ApiPropertyOptional()
  error?: string;
}

// ============================================
// URL-Based Business Scanning DTOs
// ============================================

export enum UrlType {
  WEBSITE = 'website',
  LINKEDIN = 'linkedin',
  GOOGLE_MY_BUSINESS = 'google_my_business',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  YOUTUBE = 'youtube',
  UNKNOWN = 'unknown',
}

export class ScanBusinessUrlDto {
  @ApiProperty({
    enum: AiProvider,
    description: 'AI provider to use for scanning',
    example: 'auto',
  })
  @IsEnum(AiProvider)
  provider: AiProvider;

  @ApiProperty({ description: 'URL to scan (website, LinkedIn, GMB, social media, etc.)' })
  @IsString()
  url: string;

  @ApiPropertyOptional({
    enum: UrlType,
    description: 'Type of URL (auto-detected if not provided)',
  })
  @IsEnum(UrlType)
  @IsOptional()
  urlType?: UrlType;

  @ApiPropertyOptional({ description: 'Additional context about the business' })
  @IsString()
  @IsOptional()
  context?: string;
}

export class ScanBusinessProfileDto {
  @ApiProperty({
    enum: AiProvider,
    description: 'AI provider to use for scanning',
    example: 'auto',
  })
  @IsEnum(AiProvider)
  provider: AiProvider;

  @ApiPropertyOptional({ description: 'Business website URL' })
  @IsString()
  @IsOptional()
  websiteUrl?: string;

  @ApiPropertyOptional({ description: 'LinkedIn company page URL' })
  @IsString()
  @IsOptional()
  linkedinUrl?: string;

  @ApiPropertyOptional({ description: 'Google My Business URL or place ID' })
  @IsString()
  @IsOptional()
  googleMyBusinessUrl?: string;

  @ApiPropertyOptional({ description: 'Facebook page URL' })
  @IsString()
  @IsOptional()
  facebookUrl?: string;

  @ApiPropertyOptional({ description: 'Instagram profile URL' })
  @IsString()
  @IsOptional()
  instagramUrl?: string;

  @ApiPropertyOptional({ description: 'Twitter/X profile URL' })
  @IsString()
  @IsOptional()
  twitterUrl?: string;

  @ApiPropertyOptional({ description: 'YouTube channel URL' })
  @IsString()
  @IsOptional()
  youtubeUrl?: string;

  @ApiPropertyOptional({ description: 'Business name (for search context)' })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({ description: 'Save extracted data to profile' })
  @IsBoolean()
  @IsOptional()
  saveToProfile?: boolean;
}

// Scanned business data structure
export interface ScannedBusinessData {
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

  // Social Media
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

  // Brand
  brandVoice?: string;
  tagline?: string;
  mission?: string;
  vision?: string;

  // Reviews & Ratings
  googleRating?: number;
  googleReviewCount?: number;
  facebookRating?: number;

  // Additional
  openingHours?: string;
  categories?: string[];
}

// Credit costs
export const CREDIT_COSTS = {
  single: {
    competitor: 10,
    products: 5,
    services: 5,
    audiences: 8,
    brand: 5,
    scanUrl: 8,
    scanProfile: 15,
  },
  auto: {
    competitor: 20,
    products: 12,
    services: 12,
    audiences: 15,
    brand: 10,
    scanUrl: 15,
    scanProfile: 30,
  },
};
