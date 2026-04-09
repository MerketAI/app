import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsUUID,
  IsEmail,
  IsEnum,
  ValidateNested,
  IsNumber,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================
// Email List DTOs
// ============================================

export class CreateEmailListDto {
  @ApiProperty({ example: 'Newsletter Subscribers' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Main newsletter mailing list' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['marketing', 'newsletter'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateEmailListDto {
  @ApiPropertyOptional({ example: 'Updated List Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['updated-tag'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// ============================================
// Email Contact DTOs
// ============================================

export class CreateEmailContactDto {
  @ApiProperty({ example: 'uuid-of-list' })
  @IsUUID()
  listId: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: { company: 'Acme Inc' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ContactEntry {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: { company: 'Acme Inc' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ImportContactsDto {
  @ApiProperty({ example: 'uuid-of-list' })
  @IsUUID()
  listId: string;

  @ApiProperty({ type: [ContactEntry] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactEntry)
  contacts: ContactEntry[];
}

// ============================================
// Email Campaign DTOs
// ============================================

const CampaignType = {
  BROADCAST: 'BROADCAST',
  SEQUENCE: 'SEQUENCE',
} as const;
type CampaignType = (typeof CampaignType)[keyof typeof CampaignType];

export class CreateEmailCampaignDto {
  @ApiProperty({ example: 'Summer Sale Blast' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Exclusive 50% Off - Limited Time!' })
  @IsString()
  subject: string;

  @ApiPropertyOptional({ example: 'Don\'t miss our biggest sale of the year' })
  @IsOptional()
  @IsString()
  previewText?: string;

  @ApiProperty({ example: '<html><body><h1>Hello!</h1></body></html>' })
  @IsString()
  htmlContent: string;

  @ApiPropertyOptional({ example: 'uuid-of-list' })
  @IsOptional()
  @IsUUID()
  listId?: string;

  @ApiPropertyOptional({ enum: ['BROADCAST', 'SEQUENCE'], default: 'BROADCAST' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: '2026-05-01T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateEmailCampaignDto {
  @ApiPropertyOptional({ example: 'Updated Campaign Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated Subject Line' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ example: 'Updated preview text' })
  @IsOptional()
  @IsString()
  previewText?: string;

  @ApiPropertyOptional({ example: '<html><body><h1>Updated!</h1></body></html>' })
  @IsOptional()
  @IsString()
  htmlContent?: string;

  @ApiPropertyOptional({ example: 'uuid-of-list' })
  @IsOptional()
  @IsUUID()
  listId?: string;

  @ApiPropertyOptional({ enum: ['BROADCAST', 'SEQUENCE'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: '2026-05-01T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class SendTestEmailDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail()
  testEmail: string;
}

// ============================================
// Email Sequence DTOs
// ============================================

export class SequenceStepDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  delayDays: number;

  @ApiProperty({ example: 'Welcome to our community!' })
  @IsString()
  subject: string;

  @ApiProperty({ example: '<html><body><h1>Welcome!</h1></body></html>' })
  @IsString()
  htmlContent: string;
}

export class CreateEmailSequenceDto {
  @ApiProperty({ example: 'Welcome Sequence' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Automated welcome email series' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['MANUAL', 'LEAD_STAGE', 'FORM_SUBMIT'], default: 'MANUAL' })
  @IsOptional()
  @IsString()
  triggerType?: string;

  @ApiProperty({ type: [SequenceStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SequenceStepDto)
  steps: SequenceStepDto[];
}

export class UpdateEmailSequenceDto {
  @ApiPropertyOptional({ example: 'Updated Sequence Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['MANUAL', 'LEAD_STAGE', 'FORM_SUBMIT'] })
  @IsOptional()
  @IsString()
  triggerType?: string;

  @ApiPropertyOptional({ type: [SequenceStepDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SequenceStepDto)
  steps?: SequenceStepDto[];
}
