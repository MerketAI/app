import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export const CredentialCategory = {
  JASPER: 'jasper',
  META: 'meta',
  GOOGLE: 'google',
  RAZORPAY: 'razorpay',
  WORDPRESS: 'wordpress',
  ANTHROPIC: 'anthropic',
  AWS: 'aws',
  AI_SCRAPER: 'ai_scraper',
  GENERAL: 'general',
} as const;
export type CredentialCategory = (typeof CredentialCategory)[keyof typeof CredentialCategory];

export class CreateCredentialDto {
  @ApiProperty({ example: 'JASPER_API_KEY' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'sk-xxx...' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ example: 'Jasper AI API key for content generation' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CredentialCategory, example: 'jasper' })
  @IsOptional()
  @IsEnum(CredentialCategory)
  category?: CredentialCategory;
}

export class UpdateCredentialDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CredentialCategory })
  @IsOptional()
  @IsEnum(CredentialCategory)
  category?: CredentialCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CredentialResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  key: string;

  @ApiProperty({ description: 'Masked value for security' })
  maskedValue: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  category?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// Predefined credential keys
export const CREDENTIAL_KEYS = {
  // Jasper AI
  JASPER_API_KEY: 'JASPER_API_KEY',
  JASPER_API_URL: 'JASPER_API_URL',

  // Meta (Facebook/Instagram)
  META_APP_ID: 'META_APP_ID',
  META_APP_SECRET: 'META_APP_SECRET',

  // Google
  GOOGLE_CLIENT_ID: 'GOOGLE_CLIENT_ID',
  GOOGLE_CLIENT_SECRET: 'GOOGLE_CLIENT_SECRET',

  // Razorpay
  RAZORPAY_KEY_ID: 'RAZORPAY_KEY_ID',
  RAZORPAY_KEY_SECRET: 'RAZORPAY_KEY_SECRET',
  RAZORPAY_WEBHOOK_SECRET: 'RAZORPAY_WEBHOOK_SECRET',

  // WordPress
  WORDPRESS_CLIENT_ID: 'WORDPRESS_CLIENT_ID',
  WORDPRESS_CLIENT_SECRET: 'WORDPRESS_CLIENT_SECRET',

  // Anthropic
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',

  // AI Scraper Providers
  PERPLEXITY_API_KEY: 'PERPLEXITY_API_KEY',
  SERPER_API_KEY: 'SERPER_API_KEY',
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  FIRECRAWL_API_KEY: 'FIRECRAWL_API_KEY',

  META_AD_LIBRARY_TOKEN: 'META_AD_LIBRARY_TOKEN',

  GEMINI_API_KEY: 'GEMINI_API_KEY',
  ICONSCOUT_CLIENT_ID: 'ICONSCOUT_CLIENT_ID',
  REMOVEBG_API_KEY: 'REMOVEBG_API_KEY',
  PEXELS_API_KEY: 'PEXELS_API_KEY',
  PIXABAY_API_KEY: 'PIXABAY_API_KEY',

  // Cloudflare R2 (primary object storage)
  R2_ACCOUNT_ID: 'R2_ACCOUNT_ID',
  R2_ACCESS_KEY_ID: 'R2_ACCESS_KEY_ID',
  R2_SECRET_ACCESS_KEY: 'R2_SECRET_ACCESS_KEY',
  R2_BUCKET: 'R2_BUCKET',
  R2_PUBLIC_BASE_URL: 'R2_PUBLIC_BASE_URL',

  // AWS S3 (fallback)
  AWS_ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
  AWS_SECRET_ACCESS_KEY: 'AWS_SECRET_ACCESS_KEY',
  AWS_S3_BUCKET: 'AWS_S3_BUCKET',
  AWS_S3_REGION: 'AWS_S3_REGION',

  // General
  ENCRYPTION_KEY: 'ENCRYPTION_KEY',
} as const;
