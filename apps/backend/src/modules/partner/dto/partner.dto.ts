import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsBoolean,
  IsEmail,
  IsIn,
  IsUrl,
  IsObject,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreatePartnerAppDto {
  @ApiProperty({ example: 'Acme Marketing Suite' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'integrations@acme.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Permitted scopes. Defaults to ["*"] (full access).',
    example: ['content:write', 'publish:write', 'analytics:read'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({
    description: 'Publishing targets this app may use. Empty means all.',
    example: ['INSTAGRAM', 'FACEBOOK'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedPlatforms?: string[];

  @ApiPropertyOptional({
    description: 'Source IPs permitted to use these credentials. Empty means any.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipAllowlist?: string[];

  @ApiPropertyOptional({ default: 120 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  rateLimitPerMin?: number;

  @ApiPropertyOptional({ description: 'Cap on subscribers. Null means unlimited.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSubscribers?: number;

  @ApiPropertyOptional({ default: 'STARTER' })
  @IsOptional()
  @IsString()
  defaultTier?: string;

  @ApiPropertyOptional({
    default: 100,
    description: 'Credits granted to each newly provisioned subscriber.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  defaultCredits?: number;

  @ApiPropertyOptional({
    default: true,
    description:
      'When true, an unknown APP_UID creates a subscriber automatically on first call.',
  })
  @IsOptional()
  @IsBoolean()
  autoProvision?: boolean;

  @ApiPropertyOptional({ example: 'https://acme.com/webhooks/jasper' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  webhookUrl?: string;
}

export class UpdatePartnerAppDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED', 'REVOKED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'REVOKED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedPlatforms?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipAllowlist?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  rateLimitPerMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSubscribers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultTier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  defaultCredits?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoProvision?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  webhookUrl?: string;
}

export class ProvisionSubscriberDto {
  @ApiProperty({
    description: "The partner's own subscriber id.",
    example: 'UYYHD77887778888',
  })
  @IsString()
  @MaxLength(128)
  appUid!: string;

  @ApiPropertyOptional({ description: 'Display name for the subscriber.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    description: 'Attached only when not already used by another account.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Any extra identifier from your system.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalRef?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateSubscriberStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] })
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status!: string;
}
