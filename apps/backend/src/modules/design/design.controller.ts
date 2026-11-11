import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { DesignService } from './design.service';
import {
  GenerateDesignDto,
  UpdateDesignDto,
  RenderDesignDto,
  DesignFilterDto,
} from './dto/design.dto';
import { HybridAuthGuard } from '../partner/guards/hybrid-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('designs')
@Controller({ path: 'designs', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiBearerAuth()
export class DesignController {
  constructor(private designService: DesignService) {}

  @Get()
  @ApiOperation({ summary: 'List designs with filters' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() filters: DesignFilterDto,
  ) {
    return this.designService.getDesigns(userId, filters);
  }

  @Get('presets')
  @ApiOperation({ summary: 'Get available size presets' })
  async getPresets() {
    return this.designService.getPresets();
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get template gallery' })
  async getTemplates() {
    return this.designService.getTemplates();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get design by ID' })
  async findById(
    @CurrentUser('id') userId: string,
    @Param('id') designId: string,
  ) {
    return this.designService.getDesignById(userId, designId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a design using AI' })
  @ApiResponse({ status: 201, description: 'Design generated successfully' })
  async generateDesign(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateDesignDto,
  ) {
    return this.designService.generateDesign(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a design' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') designId: string,
    @Body() dto: UpdateDesignDto,
  ) {
    return this.designService.updateDesign(userId, designId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a design' })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id') designId: string,
  ) {
    return this.designService.deleteDesign(userId, designId);
  }

  @Post(':id/render')
  @ApiOperation({
    summary: 'Render a design to PNG or PDF',
    description:
      'Streams the rendered file. The design is also stored to S3 when configured; use /export to get the URL instead of the bytes.',
  })
  @ApiResponse({ status: 200, description: 'Rendered image/PDF' })
  async renderDesign(
    @CurrentUser('id') userId: string,
    @Param('id') designId: string,
    @Body() dto: RenderDesignDto,
    @Res() res: Response,
  ) {
    const result = await this.designService.renderDesign(userId, designId, dto);

    const headers: Record<string, string> = {
      'Content-Type': result.contentType,
      'Content-Disposition': `inline; filename="design-${designId}.${result.extension}"`,
      'Content-Length': String(result.buffer.length),
    };
    // Surface degraded renders to the caller instead of silently returning a
    // placeholder that looks like a finished design.
    if (result.url) headers['X-Design-Url'] = result.url;
    if (result.renderer === 'placeholder') headers['X-Design-Placeholder'] = 'true';
    if (result.warning) headers['X-Design-Warning'] = result.warning;

    res.set(headers);
    res.send(result.buffer);
  }

  @Post(':id/export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Render, store and return a public URL',
    description:
      'Returns a URL suitable for the mediaUrls field when creating content. Requires S3 credentials and Puppeteer on the server.',
  })
  @ApiResponse({ status: 200, description: 'Hosted asset URL' })
  @ApiResponse({
    status: 400,
    description: 'Render succeeded but the asset could not be stored',
  })
  async exportDesign(
    @CurrentUser('id') userId: string,
    @Param('id') designId: string,
    @Body() dto: RenderDesignDto,
  ) {
    return this.designService.exportDesignAsset(userId, designId, dto);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a design' })
  @ApiResponse({ status: 201, description: 'Design duplicated' })
  async duplicateDesign(
    @CurrentUser('id') userId: string,
    @Param('id') designId: string,
  ) {
    return this.designService.duplicateDesign(userId, designId);
  }
}
