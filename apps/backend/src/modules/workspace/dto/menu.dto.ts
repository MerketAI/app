import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, MinLength, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum MenuLocation {
  HEADER = 'HEADER',
  FOOTER = 'FOOTER',
  SIDEBAR = 'SIDEBAR',
}

export enum MenuItemType {
  PAGE = 'page',
  POST = 'post',
  CUSTOM = 'custom',
  EXTERNAL = 'external',
}

export class MenuItemDto {
  @ApiProperty({ description: 'Unique identifier for the menu item' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Display label for the menu item' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;

  @ApiProperty({ description: 'Type of menu item', enum: MenuItemType })
  @IsEnum(MenuItemType)
  type: MenuItemType;

  @ApiPropertyOptional({ description: 'Page ID if type is page' })
  @IsOptional()
  @IsString()
  pageId?: string;

  @ApiPropertyOptional({ description: 'Post ID if type is post' })
  @IsOptional()
  @IsString()
  postId?: string;

  @ApiPropertyOptional({ description: 'Custom URL path or external URL' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'Link target (_self or _blank)', default: '_self' })
  @IsOptional()
  @IsString()
  target?: string;

  @ApiPropertyOptional({ description: 'Icon class or URL' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Nested menu items', type: [MenuItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  children?: MenuItemDto[];
}

export class CreateMenuDto {
  @ApiProperty({ description: 'Menu name (e.g., Main Menu, Footer Menu)' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Menu location', enum: MenuLocation })
  @IsEnum(MenuLocation)
  location: MenuLocation;

  @ApiPropertyOptional({ description: 'Menu items', type: [MenuItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  items?: MenuItemDto[];
}

export class UpdateMenuDto {
  @ApiPropertyOptional({ description: 'Menu name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Whether menu is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMenuItemsDto {
  @ApiProperty({ description: 'Menu items', type: [MenuItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  items: MenuItemDto[];
}

export interface MenuResponse {
  id: string;
  workspaceId: string;
  name: string;
  location: string;
  items: MenuItemDto[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
