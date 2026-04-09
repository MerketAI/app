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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VideoService } from './video.service';
import {
  CreateVideoDto,
  UpdateVideoDto,
  VideoFilterDto,
} from './dto/video.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('videos')
@Controller({ path: 'videos', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VideoController {
  constructor(private videoService: VideoService) {}

  @Get()
  @ApiOperation({ summary: 'List video projects' })
  @ApiResponse({ status: 200, description: 'Video projects list' })
  async listProjects(
    @CurrentUser('id') userId: string,
    @Query() filters: VideoFilterDto,
  ) {
    return this.videoService.getProjects(userId, filters);
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get available video providers and their status' })
  @ApiResponse({ status: 200, description: 'Provider availability info' })
  async getProviders() {
    return this.videoService.getProviders();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get video project detail' })
  @ApiResponse({ status: 200, description: 'Video project details' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProject(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.videoService.getProjectById(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new video project (draft)' })
  @ApiResponse({ status: 201, description: 'Video project created' })
  async createProject(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVideoDto,
  ) {
    return this.videoService.createProject(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update video project' })
  @ApiResponse({ status: 200, description: 'Video project updated' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateProject(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVideoDto,
  ) {
    return this.videoService.updateProject(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete video project' })
  @ApiResponse({ status: 200, description: 'Video project deleted' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async deleteProject(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.videoService.deleteProject(userId, id);
  }

  @Post(':id/generate')
  @ApiOperation({ summary: 'Start video generation (async)' })
  @ApiResponse({ status: 200, description: 'Video generation started' })
  @ApiResponse({ status: 400, description: 'Insufficient credits or invalid state' })
  async generateVideo(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.videoService.generateVideo(userId, id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Check video generation status' })
  @ApiResponse({ status: 200, description: 'Current generation status' })
  async checkStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.videoService.checkStatus(userId, id);
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate video with new settings' })
  @ApiResponse({ status: 200, description: 'Video regeneration started' })
  async regenerateVideo(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.videoService.regenerateVideo(userId, id);
  }
}
