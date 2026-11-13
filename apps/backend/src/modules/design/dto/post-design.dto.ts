import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Identity the platform holds and Jasper does not store.
 *
 * These are *verified* values in the sense that matters here: they come from
 * the partner platform, never from a model. The Art Director's output is
 * stripped of every one of them before a design is composed.
 */
export class VerifiedProfileDto {
  @ApiPropertyOptional({ example: 'Dr. Kavita Rao' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  doctorName?: string;

  @ApiPropertyOptional({ example: 'BDS, MDS (Prosthodontics)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  qualifications?: string;

  @ApiPropertyOptional({ example: 'KA/DENT/2011/4821' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 'Cosmetic and Restorative Dentistry' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  specialty?: string;

  @ApiPropertyOptional({ description: 'Overrides the business name on file.' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  clinicName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  bookingUrl?: string;
}

export class PostBriefDto {
  @ApiPropertyOptional({
    example: 'awareness',
    description: 'offer, awareness, event, health-day, seasonal, general.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  campaignType?: string;

  @ApiPropertyOptional({ example: 'World Oral Health Day' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  occasion?: string;

  @ApiPropertyOptional({
    description: 'Free-text direction. Not a place for contact details.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  instructions?: string;

  @ApiPropertyOptional({ example: 'hi', description: 'Language to write in.' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string;

  @ApiPropertyOptional({ example: 'instagram_square' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  format?: string;

  @ApiPropertyOptional({
    example: 'photo-hero-01',
    description: 'Forces a layout instead of letting the director choose.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  templateId?: string;

  @ApiPropertyOptional({ type: VerifiedProfileDto })
  @IsOptional()
  @IsObject()
  profile?: VerifiedProfileDto;

  @ApiPropertyOptional({
    description:
      'Photograph for photo-led layouts. Copied into our own storage and cropped to the slot; public hosts only.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  photoUrl?: string;

  @ApiPropertyOptional({
    description:
      'Transparent cutout of your own practitioner. Never a stock photo of a person - those licences carry no model release.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  cutoutUrl?: string;

  @ApiPropertyOptional({ example: '#0d9488' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  brandColor?: string;
}

export class RenderPostDto extends PostBriefDto {
  @ApiPropertyOptional({
    description:
      'A plan from POST /post-designs/plan. Supply it to render an approved plan without paying for the model again.',
  })
  @IsOptional()
  @IsObject()
  direction?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Reserved: render without storing a Design row.',
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class ArtDirectionResponse {
  @ApiProperty() templateId: string;
  @ApiProperty() format: string;
  @ApiProperty() rationale: string;
  @ApiProperty({ type: [String] }) visibleSlots: string[];
  @ApiProperty({ description: 'Campaign copy only; never a verified fact.' })
  values: Record<string, unknown>;
  @ApiProperty({
    type: [String],
    description:
      'What was stripped from the model output and why - including any attempt to author a verified fact.',
  })
  corrections: string[];
  @ApiProperty() model: string;
}
