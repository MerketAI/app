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
import { ContentService } from './content.service';
import {
  GenerateContentDto,
  CreateContentDto,
  UpdateContentDto,
  ScheduleContentDto,
  ContentFilterDto,
} from './dto/content.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('content')
@Controller({ path: 'content', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContentController {
  constructor(private contentService: ContentService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate AI-powered content' })
  async generateContent(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateContentDto,
  ) {
    return this.contentService.generateContent(userId, dto);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending topics' })
  async getTrendingTopics(@CurrentUser('id') userId: string) {
    return this.contentService.getTrendingTopics(userId);
  }

  @Get('drafts')
  @ApiOperation({ summary: 'Get draft contents' })
  async getDrafts(@CurrentUser('id') userId: string) {
    return this.contentService.getDrafts(userId);
  }

  @Get('scheduled')
  @ApiOperation({ summary: 'Get scheduled contents' })
  async getScheduled(@CurrentUser('id') userId: string) {
    return this.contentService.getScheduled(userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all content with filters' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() filters: ContentFilterDto,
  ) {
    return this.contentService.findAll(userId, filters);
  }

  @Post()
  @ApiOperation({ summary: 'Create content manually' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateContentDto,
  ) {
    return this.contentService.createContent(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content by ID' })
  async findById(
    @CurrentUser('id') userId: string,
    @Param('id') contentId: string,
  ) {
    return this.contentService.findById(userId, contentId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update content' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') contentId: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.contentService.update(userId, contentId, dto);
  }

  @Post(':id/schedule')
  @ApiOperation({ summary: 'Schedule content for publishing' })
  async schedule(
    @CurrentUser('id') userId: string,
    @Param('id') contentId: string,
    @Body() dto: ScheduleContentDto,
  ) {
    return this.contentService.schedule(userId, contentId, dto);
  }

  @Post(':id/variations')
  @ApiOperation({ summary: 'Generate content variations' })
  async getVariations(
    @CurrentUser('id') userId: string,
    @Param('id') contentId: string,
  ) {
    return this.contentService.getVariations(userId, contentId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete content' })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id') contentId: string,
  ) {
    return this.contentService.delete(userId, contentId);
  }
}
