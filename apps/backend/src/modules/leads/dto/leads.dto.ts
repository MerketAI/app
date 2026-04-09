import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  ValidateNested,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum LeadSource {
  GOOGLE_ADS = 'GOOGLE_ADS',
  META_ADS = 'META_ADS',
  FORM = 'FORM',
  WEBSITE = 'WEBSITE',
  MANUAL = 'MANUAL',
  EMAIL = 'EMAIL',
}

export enum LeadStage {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

export class CreateLeadDto {
  @ApiProperty({ description: 'Lead name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Lead email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Lead phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Lead company name' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ description: 'Lead source', enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({ description: 'External source identifier' })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional({ description: 'Tags for the lead', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Custom fields as key-value pairs' })
  @IsOptional()
  customFields?: Record<string, any>;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ description: 'Lead name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Lead email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Lead phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Lead company name' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ description: 'Lead source', enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({ description: 'External source identifier' })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional({ description: 'Lead stage', enum: LeadStage })
  @IsOptional()
  @IsEnum(LeadStage)
  stage?: LeadStage;

  @ApiPropertyOptional({ description: 'Lead score (0-100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Reason for losing the lead' })
  @IsOptional()
  @IsString()
  lostReason?: string;

  @ApiPropertyOptional({ description: 'Tags for the lead', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Custom fields as key-value pairs' })
  @IsOptional()
  customFields?: Record<string, any>;
}

export class LeadFilterDto {
  @ApiPropertyOptional({ description: 'Filter by stage', enum: LeadStage })
  @IsOptional()
  @IsEnum(LeadStage)
  stage?: LeadStage;

  @ApiPropertyOptional({ description: 'Filter by source', enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({ description: 'Search by name, email, or company' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Minimum score filter' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  scoreMin?: number;

  @ApiPropertyOptional({ description: 'Maximum score filter' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(100)
  scoreMax?: number;

  @ApiPropertyOptional({ description: 'Number of results to return', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Number of results to skip', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export class CreateLeadNoteDto {
  @ApiProperty({ description: 'Note content' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChangeStageDto {
  @ApiProperty({ description: 'New stage', enum: LeadStage })
  @IsEnum(LeadStage)
  stage: LeadStage;

  @ApiPropertyOptional({ description: 'Reason for stage change' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ImportLeadItem {
  @ApiProperty({ description: 'Lead name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Lead email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Lead phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Lead company' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ description: 'Lead source', enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ImportLeadsDto {
  @ApiProperty({ description: 'Array of leads to import', type: [ImportLeadItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportLeadItem)
  leads: ImportLeadItem[];
}
