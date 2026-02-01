import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export const CredentialCategory = {
  JASPER: 'jasper',
  META: 'meta',
  GOOGLE: 'google',
  RAZORPAY: 'razorpay',
  WORDPRESS: 'wordpress',
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

  // General
  ENCRYPTION_KEY: 'ENCRYPTION_KEY',
} as const;
