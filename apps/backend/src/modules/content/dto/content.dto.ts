import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  IsUUID,
} from 'class-validator';
const ContentType = {
  INSTAGRAM_IMAGE: 'INSTAGRAM_IMAGE',
  INSTAGRAM_CAROUSEL: 'INSTAGRAM_CAROUSEL',
  INSTAGRAM_REEL: 'INSTAGRAM_REEL',
  INSTAGRAM_STORY: 'INSTAGRAM_STORY',
  FACEBOOK_IMAGE: 'FACEBOOK_IMAGE',
  FACEBOOK_VIDEO: 'FACEBOOK_VIDEO',
  FACEBOOK_LINK: 'FACEBOOK_LINK',
  BLOG_POST: 'BLOG_POST',
} as const;
type ContentType = typeof ContentType[keyof typeof ContentType];

const ContentStatus = {
  DRAFT: 'DRAFT',
  READY: 'READY',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
} as const;
type ContentStatus = typeof ContentStatus[keyof typeof ContentStatus];

export class GenerateContentDto {
  @ApiProperty({ enum: ['instagram', 'facebook', 'blog'] })
  @IsString()
  platform: 'instagram' | 'facebook' | 'blog';

  @ApiProperty({ enum: ['image_post', 'video_post', 'carousel', 'article'] })
  @IsString()
  contentType: 'image_post' | 'video_post' | 'carousel' | 'article';

  @ApiPropertyOptional({ example: 'Benefits of AI in marketing' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ enum: ['professional', 'casual', 'humorous', 'inspirational'] })
  @IsOptional()
  @IsString()
  tone?: 'professional' | 'casual' | 'humorous' | 'inspirational';

  @ApiPropertyOptional({ enum: ['short', 'medium', 'long'] })
  @IsOptional()
  @IsString()
  length?: 'short' | 'medium' | 'long';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeMedia?: boolean;

  @ApiPropertyOptional({ example: ['AI', 'marketing', 'automation'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class CreateContentDto {
  @ApiProperty({ enum: ContentType })
  @IsEnum(ContentType)
  type: ContentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ example: ['#marketing', '#business'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seoKeywords?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  connectionId?: string;
}

export class UpdateContentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}

export class ScheduleContentDto {
  @ApiProperty()
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  connectionId?: string;
}

export class ContentFilterDto {
  @ApiPropertyOptional({ enum: ContentType })
  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  offset?: number;
}
