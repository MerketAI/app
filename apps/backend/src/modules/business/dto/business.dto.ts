import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// Business Profile DTOs
// ============================================

export class UpdateBusinessProfileDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subIndustry?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  foundedYear?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  employeeCount?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  annualRevenue?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  businessModel?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  socialLinks?: Record<string, string>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  brandVoice?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tonePreference?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  brandKeywords?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  uniqueSellingPoints?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  valueProposition?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  marketPosition?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pricingStrategy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  brandColors?: Record<string, string>;

  // Brand Voice & Tone
  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  toneAttributes?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  formality?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  communicationStyle?: string;

  // Brand Personality
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  brandPersonality?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  brandArchetype?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  personalityTraits?: string[];

  // Messaging
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tagline?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  elevatorPitch?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  keyMessages?: string[];

  // Content Guidelines
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  writingStyle?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  contentThemes?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  topicsToAvoid?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  phraseExamples?: string[];

  // Brand Do's and Don'ts
  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  brandDos?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  brandDonts?: string[];

  // Visual Identity
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  primaryColors?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  secondaryColors?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fontStyle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  visualStyle?: string;
}

// ============================================
// Product DTOs
// ============================================

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subCategory?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  priceType?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  priceMin?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  priceMax?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pricingModel?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  features?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  benefits?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  specifications?: Record<string, any>;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  targetMarket?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  idealCustomer?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  useCases?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  competitors?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  differentiators?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  keywords?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  hashtags?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}

export class UpdateProductDto extends CreateProductDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

// ============================================
// Service DTOs
// ============================================

export class CreateServiceDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  priceType?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  priceMin?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  priceMax?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pricingUnit?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  billingFrequency?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  deliverables?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  process?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  requirements?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  benefits?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  duration?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  targetMarket?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  idealClient?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  industries?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  competitors?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  differentiators?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  keywords?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  hashtags?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}

export class UpdateServiceDto extends CreateServiceDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

// ============================================
// Competitor DTOs
// ============================================

export class CreateCompetitorDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  size?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  founded?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  headquarters?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  facebookUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  instagramUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  twitterUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  linkedinUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  youtubeUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tiktokUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  marketPosition?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  marketShare?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pricePosition?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  targetAudience?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pricingStrategy?: string;

  // SWOT
  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  strengths?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  weaknesses?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  opportunities?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  threats?: string[];

  // Products & Services
  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  products?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  services?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  uniqueFeatures?: string[];

  // Content & Ads Strategy
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contentStrategy?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  adPlatforms?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  adStrategies?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  adBudgetEstimate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  topPerformingAds?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  contentTypes?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  postingFrequency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  engagementLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  socialFollowers?: Record<string, number>;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  engagementRate?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  threatLevel?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCompetitorDto extends CreateCompetitorDto {}

// ============================================
// Target Audience DTOs
// ============================================

export class CreateTargetAudienceDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  @IsOptional()
  ageMin?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  @IsOptional()
  ageMax?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  incomeLevel?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  educationLevel?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  occupation?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  jobTitles?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  industries?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  companySize?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  locations?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  languages?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  interests?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  hobbies?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  values?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lifestyle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  personality?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  buyingBehavior?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  buyingFrequency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  avgOrderValue?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  decisionFactors?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  purchaseFrequency?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  preferredChannels?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  deviceUsage?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  painPoints?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  goals?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  challenges?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  motivations?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  objections?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  contentPreferences?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  contentFormats?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  socialPlatforms?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  bestPostingTimes?: Record<string, any>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  communicationStyle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  messagingTone?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  keyMessages?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  avoidTopics?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateTargetAudienceDto extends CreateTargetAudienceDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
