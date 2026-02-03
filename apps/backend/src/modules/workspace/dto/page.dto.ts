import { IsString, IsOptional, IsBoolean, IsArray, MinLength, MaxLength, Matches, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePageDto {
  @ApiProperty({ description: 'Page title' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'URL slug for the page' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({ description: 'Page description for SEO' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Whether this is the home page' })
  @IsOptional()
  @IsBoolean()
  isHomePage?: boolean;
}

export class UpdatePageDto {
  @ApiPropertyOptional({ description: 'Page title' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'URL slug for the page' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'Page description for SEO' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Whether this is the home page' })
  @IsOptional()
  @IsBoolean()
  isHomePage?: boolean;

  @ApiPropertyOptional({ description: 'SEO title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO keywords' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoKeywords?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdatePageContentDto {
  @ApiProperty({ description: 'JSON array of page blocks/sections' })
  @IsArray()
  blocks: PageBlock[];

  @ApiPropertyOptional({ description: 'Rendered HTML content' })
  @IsOptional()
  @IsString()
  htmlContent?: string;

  @ApiPropertyOptional({ description: 'Custom CSS content' })
  @IsOptional()
  @IsString()
  cssContent?: string;
}

export class GeneratePageDto {
  @ApiProperty({ description: 'User prompt describing the desired page' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  prompt: string;

  @ApiProperty({
    description: 'Type of page to generate',
    enum: ['landing', 'about', 'services', 'contact', 'pricing', 'blog', 'portfolio', 'team']
  })
  @IsString()
  pageType: string;

  @ApiPropertyOptional({
    description: 'Visual style for the page',
    enum: ['modern', 'minimal', 'bold', 'corporate', 'creative', 'elegant']
  })
  @IsOptional()
  @IsString()
  style?: string;

  @ApiPropertyOptional({ description: 'Page title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Page slug' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;
}

export interface PageBlock {
  id: string;
  type: string; // hero, features, testimonials, cta, text, image, gallery, pricing, faq, contact, etc.
  props: Record<string, any>;
  html?: string; // Rendered HTML with Tailwind classes
  children?: PageBlock[];
}

export interface PageResponse {
  id: string;
  workspaceId: string;
  title: string;
  slug: string;
  description?: string;
  content: PageBlock[];
  htmlContent?: string;
  cssContent?: string;
  status: string;
  isHomePage: boolean;
  seoTitle?: string;
  seoKeywords?: string;
  sortOrder: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
