import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HybridAuthGuard } from '../partner/guards/hybrid-auth.guard';
import { LibraryService } from './library.service';

class SearchLibraryDto {
  @IsOptional() @IsString() @MaxLength(200) query?: string;
  @IsOptional() @IsString() @MaxLength(200) folder?: string;
  /** Comma-separated. */
  @IsOptional() @IsString() @MaxLength(500) tags?: string;
  @IsOptional() @IsString() @MaxLength(40) kind?: string;
  @IsOptional() @IsString() @MaxLength(40) mediaType?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
}

class UpdateLibraryAssetDto {
  @IsOptional() @IsString() @MaxLength(200) folder?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

@ApiTags('Asset library')
@ApiBearerAuth()
@Controller({ path: 'library', version: '1' })
@UseGuards(HybridAuthGuard)
export class LibraryController {
  constructor(private library: LibraryService) {}

  @Get()
  @ApiOperation({ summary: 'Search the asset library by text, folder, tags, kind or media type' })
  search(@CurrentUser('id') userId: string, @Query() q: SearchLibraryDto) {
    return this.library.search(userId, { ...q, tags: q.tags ? q.tags.split(',') : undefined });
  }

  @Get('folders')
  @ApiOperation({ summary: 'The folder tree, with asset counts' })
  folders(@CurrentUser('id') userId: string) {
    return this.library.folders(userId);
  }

  @Get(':id')
  get(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.library.get(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Move, rename, retag or annotate an asset' })
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateLibraryAssetDto) {
    return this.library.update(userId, id, dto);
  }
}
