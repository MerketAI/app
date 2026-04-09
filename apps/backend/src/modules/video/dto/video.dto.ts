import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
} from 'class-validator';

const VideoType = {
  PRODUCT_SHOWCASE: 'PRODUCT_SHOWCASE',
  TESTIMONIAL: 'TESTIMONIAL',
  EXPLAINER: 'EXPLAINER',
  SOCIAL_AD: 'SOCIAL_AD',
  PROMO: 'PROMO',
} as const;
type VideoType = (typeof VideoType)[keyof typeof VideoType];

const VideoProvider = {
  RUNWAY: 'RUNWAY',
  HEYGEN: 'HEYGEN',
} as const;
type VideoProvider = (typeof VideoProvider)[keyof typeof VideoProvider];

const VideoStatus = {
  DRAFT: 'DRAFT',
  GENERATING: 'GENERATING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
type VideoStatus = (typeof VideoStatus)[keyof typeof VideoStatus];

export class CreateVideoDto {
  @ApiProperty({ example: 'Summer Sale Promo' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: ['PRODUCT_SHOWCASE', 'TESTIMONIAL', 'EXPLAINER', 'SOCIAL_AD', 'PROMO'],
  })
  @IsIn(Object.values(VideoType))
  type: VideoType;

  @ApiPropertyOptional({
    enum: ['RUNWAY', 'HEYGEN'],
    default: 'RUNWAY',
  })
  @IsOptional()
  @IsIn(Object.values(VideoProvider))
  provider?: VideoProvider;

  @ApiPropertyOptional({ example: 'Create a dynamic product showcase video' })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({ example: 'Welcome to our summer sale...' })
  @IsOptional()
  @IsString()
  scriptContent?: string;

  @ApiPropertyOptional({
    example: '{"aspectRatio":"16:9","duration":30,"style":"modern"}',
    description: 'JSON string with aspectRatio, duration, and style settings',
  })
  @IsOptional()
  @IsString()
  settings?: string;
}

export class UpdateVideoDto {
  @ApiPropertyOptional({ example: 'Updated Video Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scriptContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  settings?: string;
}

export class VideoFilterDto {
  @ApiPropertyOptional({
    enum: ['PRODUCT_SHOWCASE', 'TESTIMONIAL', 'EXPLAINER', 'SOCIAL_AD', 'PROMO'],
  })
  @IsOptional()
  @IsIn(Object.values(VideoType))
  type?: VideoType;

  @ApiPropertyOptional({
    enum: ['DRAFT', 'GENERATING', 'COMPLETED', 'FAILED'],
  })
  @IsOptional()
  @IsIn(Object.values(VideoStatus))
  status?: VideoStatus;

  @ApiPropertyOptional({ enum: ['RUNWAY', 'HEYGEN'] })
  @IsOptional()
  @IsIn(Object.values(VideoProvider))
  provider?: VideoProvider;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
