import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class GenerateArtworkDto {
  @ApiProperty({
    description:
      'What the picture shows. Names of real people are stripped: generated imagery must not depict a named individual.',
    example:
      'a friendly paediatrician examining a smiling toddler in a bright clinic room',
  })
  @IsString()
  @MaxLength(600)
  subject!: string;

  @ApiPropertyOptional({
    enum: ['square', 'portrait', 'landscape'],
    default: 'landscape',
  })
  @IsOptional()
  @IsIn(['square', 'portrait', 'landscape'])
  aspect?: 'square' | 'portrait' | 'landscape';

  @ApiPropertyOptional({
    enum: ['illustration', 'flat-vector', 'photographic', '3d'],
    default: 'illustration',
  })
  @IsOptional()
  @IsIn(['illustration', 'flat-vector', 'photographic', '3d'])
  style?: 'illustration' | 'flat-vector' | 'photographic' | '3d';

  @ApiPropertyOptional({ example: '#0ea5e9' })
  @IsOptional()
  @IsString()
  brandColor?: string;

  @ApiPropertyOptional({
    description: 'Transparent PNG for compositing (OpenAI only).',
  })
  @IsOptional()
  @IsBoolean()
  transparent?: boolean;

  @ApiPropertyOptional({ enum: ['openai', 'gemini'] })
  @IsOptional()
  @IsIn(['openai', 'gemini'])
  provider?: 'openai' | 'gemini';
}
