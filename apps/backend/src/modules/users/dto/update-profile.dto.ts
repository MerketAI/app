import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  MaxLength,
  IsIn,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Acme Inc.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessName?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  industry?: string;

  @ApiPropertyOptional({ example: 'We provide innovative tech solutions.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: ['Web Development', 'Mobile Apps'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @ApiPropertyOptional({ example: ['SaaS Platform', 'Consulting'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  products?: string[];

  @ApiPropertyOptional({ example: 'Small businesses and startups' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  targetAudience?: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ example: 'America/Los_Angeles' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: { primary: '#007bff', secondary: '#6c757d' } })
  @IsOptional()
  @IsObject()
  brandColors?: Record<string, string>;

  @ApiPropertyOptional({ example: 'professional' })
  @IsOptional()
  @IsString()
  @IsIn(['professional', 'casual', 'humorous', 'inspirational'])
  tonePreference?: string;

  @ApiPropertyOptional({ example: ['@competitor1', '@competitor2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competitors?: string[];
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
