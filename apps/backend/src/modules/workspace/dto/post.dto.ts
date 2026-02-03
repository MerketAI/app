import { IsString, IsOptional, IsArray, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ description: 'Post title' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({ description: 'URL slug for the post' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'Short excerpt/summary' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional({ description: 'HTML content of the post' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'URL to featured image' })
  @IsOptional()
  @IsString()
  featuredImage?: string;

  @ApiPropertyOptional({ description: 'Tags as JSON array' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Categories as JSON array' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}

export class UpdatePostDto {
  @ApiPropertyOptional({ description: 'Post title' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional({ description: 'URL slug for the post' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'Short excerpt/summary' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional({ description: 'HTML content of the post' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'URL to featured image' })
  @IsOptional()
  @IsString()
  featuredImage?: string;

  @ApiPropertyOptional({ description: 'SEO title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string;

  @ApiPropertyOptional({ description: 'SEO keywords' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoKeywords?: string;

  @ApiPropertyOptional({ description: 'Tags as JSON array' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Categories as JSON array' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}

export class SyncWordPressDto {
  @ApiProperty({ description: 'Platform connection ID for WordPress' })
  @IsString()
  connectionId: string;
}

export interface PostResponse {
  id: string;
  workspaceId: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  status: string;
  publishedAt?: Date;
  wpPostId?: string;
  wpSyncedAt?: Date;
  wpConnectionId?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  tags: string[];
  categories: string[];
  createdAt: Date;
  updatedAt: Date;
}
