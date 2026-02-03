import { IsString, IsOptional, IsBoolean, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({ description: 'Display name for the workspace' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Unique slug for subdomain (e.g., mycompany for mycompany.jeeper.app)' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({ description: 'Workspace description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({ description: 'Display name for the workspace' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Workspace description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'URL to workspace logo' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ description: 'URL to workspace favicon' })
  @IsOptional()
  @IsString()
  favicon?: string;

  @ApiPropertyOptional({ description: 'JSON string of workspace settings (theme, colors, etc.)' })
  @IsOptional()
  @IsString()
  settings?: string;

  @ApiPropertyOptional({ description: 'Whether workspace is published' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class WorkspaceResponseDto {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  favicon?: string;
  settings: Record<string, any>;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  url: string; // Full URL: slug.jeeper.app
}
