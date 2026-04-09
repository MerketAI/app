import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';

const DesignCategory = {
  SOCIAL_POST: 'SOCIAL_POST',
  FLYER: 'FLYER',
  BANNER: 'BANNER',
  POSTER: 'POSTER',
  STORY: 'STORY',
  AD: 'AD',
} as const;
type DesignCategory = (typeof DesignCategory)[keyof typeof DesignCategory];

const SizePreset = {
  INSTAGRAM_POST: 'INSTAGRAM_POST',
  INSTAGRAM_STORY: 'INSTAGRAM_STORY',
  FACEBOOK_COVER: 'FACEBOOK_COVER',
  FACEBOOK_POST: 'FACEBOOK_POST',
  TWITTER_HEADER: 'TWITTER_HEADER',
  LINKEDIN_COVER: 'LINKEDIN_COVER',
  A4_FLYER: 'A4_FLYER',
  A5_FLYER: 'A5_FLYER',
  YOUTUBE_THUMBNAIL: 'YOUTUBE_THUMBNAIL',
} as const;
type SizePreset = (typeof SizePreset)[keyof typeof SizePreset];

const DesignStyle = {
  modern: 'modern',
  minimal: 'minimal',
  bold: 'bold',
  corporate: 'corporate',
  creative: 'creative',
  elegant: 'elegant',
} as const;
type DesignStyle = (typeof DesignStyle)[keyof typeof DesignStyle];

const RenderFormat = {
  PNG: 'PNG',
  PDF: 'PDF',
} as const;
type RenderFormat = (typeof RenderFormat)[keyof typeof RenderFormat];

export class GenerateDesignDto {
  @ApiProperty({ description: 'Description of the design to generate' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    enum: Object.values(DesignCategory),
    description: 'Design category',
  })
  @IsOptional()
  @IsIn(Object.values(DesignCategory))
  category?: DesignCategory;

  @ApiPropertyOptional({
    enum: Object.values(SizePreset),
    description: 'Size preset for the design',
  })
  @IsOptional()
  @IsIn(Object.values(SizePreset))
  sizePreset?: SizePreset;

  @ApiPropertyOptional({
    enum: Object.values(DesignStyle),
    description: 'Visual style for the design',
  })
  @IsOptional()
  @IsIn(Object.values(DesignStyle))
  style?: DesignStyle;

  @ApiPropertyOptional({
    description:
      'JSON string with business context (brand colors, name, tagline, etc.)',
  })
  @IsOptional()
  @IsString()
  businessContext?: string;
}

export class UpdateDesignDto {
  @ApiPropertyOptional({ description: 'Design name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'HTML content of the design' })
  @IsOptional()
  @IsString()
  htmlContent?: string;

  @ApiPropertyOptional({ description: 'CSS content of the design' })
  @IsOptional()
  @IsString()
  cssContent?: string;
}

export class RenderDesignDto {
  @ApiPropertyOptional({
    enum: Object.values(RenderFormat),
    default: 'PNG',
    description: 'Output format',
  })
  @IsOptional()
  @IsIn(Object.values(RenderFormat))
  format?: RenderFormat;

  @ApiPropertyOptional({
    description: 'Image quality (1-100)',
    default: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quality?: number;
}

export class DesignFilterDto {
  @ApiPropertyOptional({
    enum: Object.values(DesignCategory),
    description: 'Filter by category',
  })
  @IsOptional()
  @IsIn(Object.values(DesignCategory))
  category?: DesignCategory;

  @ApiPropertyOptional({ default: 20, description: 'Number of results' })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ default: 0, description: 'Offset for pagination' })
  @IsOptional()
  @IsNumber()
  offset?: number;
}
