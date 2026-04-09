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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('designs')
@Controller({ path: 'designs', version: '1' })
@UseGuards(JwtAuthGuard)
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
  @ApiOperation({ summary: 'Render design to PNG or PDF' })
  @ApiResponse({ status: 200, description: 'Rendered image/PDF' })
  async renderDesign(
    @CurrentUser('id') userId: string,
    @Param('id') designId: string,
    @Body() dto: RenderDesignDto,
    @Res() res: Response,
  ) {
    const result = await this.designService.renderDesign(userId, designId, dto);

    const contentType =
      result.format === 'pdf' ? 'application/pdf' : 'image/png';
    const extension = result.format === 'pdf' ? 'pdf' : 'png';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="design-${designId}.${extension}"`,
      'Content-Length': result.buffer.length,
    });

    res.send(result.buffer);
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
