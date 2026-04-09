import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  IsObject,
  Min,
} from 'class-validator';

const AdPlatform = {
  GOOGLE_ADS: 'GOOGLE_ADS',
  META_ADS: 'META_ADS',
} as const;
type AdPlatform = (typeof AdPlatform)[keyof typeof AdPlatform];

const CampaignType = {
  SEARCH: 'SEARCH',
  DISPLAY: 'DISPLAY',
  SHOPPING: 'SHOPPING',
  AWARENESS: 'AWARENESS',
  TRAFFIC: 'TRAFFIC',
  CONVERSIONS: 'CONVERSIONS',
  LEADS: 'LEADS',
} as const;
type CampaignType = (typeof CampaignType)[keyof typeof CampaignType];

const BudgetType = {
  DAILY: 'DAILY',
  LIFETIME: 'LIFETIME',
} as const;
type BudgetType = (typeof BudgetType)[keyof typeof BudgetType];

const CampaignStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export { AdPlatform, CampaignType, BudgetType, CampaignStatus };

export class CreateCampaignDto {
  @ApiProperty({ enum: Object.values(AdPlatform), example: 'GOOGLE_ADS' })
  @IsString()
  platform: AdPlatform;

  @ApiProperty({ description: 'Platform connection ID' })
  @IsString()
  connectionId: string;

  @ApiProperty({ example: 'Summer Sale Campaign' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: Object.values(CampaignType),
    example: 'SEARCH',
    description: 'Campaign type: SEARCH, DISPLAY, SHOPPING for Google; AWARENESS, TRAFFIC, CONVERSIONS, LEADS for Meta',
  })
  @IsString()
  type: CampaignType;

  @ApiPropertyOptional({ example: 'Drive website traffic for summer sale' })
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiProperty({ example: 50.0, description: 'Budget amount' })
  @IsNumber()
  @Min(1)
  budget: number;

  @ApiProperty({ enum: Object.values(BudgetType), example: 'DAILY' })
  @IsString()
  budgetType: BudgetType;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Targeting configuration (keywords, audiences, demographics, locations)',
    example: { keywords: ['marketing', 'ai'], locations: ['US'], ageRange: { min: 25, max: 55 } },
  })
  @IsObject()
  targeting: Record<string, any>;

  @ApiProperty({
    description: 'Array of ad creative configurations',
    example: [{ headline: 'Try Jasper AI', description: 'Automate your marketing', imageUrl: '' }],
  })
  @IsArray()
  adCreatives: Record<string, any>[];

  @ApiPropertyOptional({ description: 'Platform-specific settings' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ example: 'Updated Campaign Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: Object.values(CampaignType) })
  @IsOptional()
  @IsString()
  type?: CampaignType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional({ example: 75.0 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  budget?: number;

  @ApiPropertyOptional({ enum: Object.values(BudgetType) })
  @IsOptional()
  @IsString()
  budgetType?: BudgetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  targeting?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  adCreatives?: Record<string, any>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class CampaignFilterDto {
  @ApiPropertyOptional({ enum: Object.values(AdPlatform) })
  @IsOptional()
  @IsString()
  platform?: AdPlatform;

  @ApiPropertyOptional({ enum: Object.values(CampaignStatus) })
  @IsOptional()
  @IsString()
  status?: CampaignStatus;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  offset?: number;
}
