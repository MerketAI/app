import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
import { PagesService } from './pages.service';
import { AiPageService } from './ai-page.service';
import {
  CreatePageDto,
  UpdatePageDto,
  UpdatePageContentDto,
  GeneratePageDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('workspace/pages')
@Controller({ path: 'workspace/pages', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PagesController {
  constructor(
    private pagesService: PagesService,
    private aiPageService: AiPageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all pages' })
  @ApiResponse({ status: 200, description: 'Pages retrieved successfully' })
  async listPages(@CurrentUser('id') userId: string) {
    const pages = await this.pagesService.listPages(userId);
    return { pages };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get page by ID' })
  @ApiResponse({ status: 200, description: 'Page found' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async getPage(
    @CurrentUser('id') userId: string,
    @Param('id') pageId: string,
  ) {
    const page = await this.pagesService.getPage(userId, pageId);
    return { page };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new page' })
  @ApiResponse({ status: 201, description: 'Page created successfully' })
  @ApiResponse({ status: 409, description: 'Page with this slug already exists' })
  async createPage(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePageDto,
  ) {
    const page = await this.pagesService.createPage(userId, dto);
    return { page };
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a page using AI' })
  @ApiResponse({ status: 201, description: 'Page generated successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient credits or AI error' })
  async generatePage(
    @CurrentUser('id') userId: string,
    @Body() dto: GeneratePageDto,
  ) {
    const { blocks, htmlContent } = await this.aiPageService.generatePage(
      userId,
      dto,
    );

    // If title and slug provided, create the page
    if (dto.title && dto.slug) {
      const page = await this.pagesService.createPage(userId, {
        title: dto.title,
        slug: dto.slug,
      });

      // Update with generated content
      const updatedPage = await this.pagesService.updatePageContent(
        userId,
        page.id,
        { blocks, htmlContent },
      );

      return { page: updatedPage };
    }

    // Otherwise just return the generated content
    return { blocks, htmlContent };
  }

  @Post('generate-section')
  @ApiOperation({ summary: 'Generate a single section using AI' })
  @ApiResponse({ status: 201, description: 'Section generated successfully' })
  async generateSection(
    @CurrentUser('id') userId: string,
    @Body() dto: { sectionType: string; prompt: string },
  ) {
    const block = await this.aiPageService.generateSection(
      userId,
      dto.sectionType,
      dto.prompt,
    );
    return { block };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update page metadata' })
  @ApiResponse({ status: 200, description: 'Page updated successfully' })
  async updatePage(
    @CurrentUser('id') userId: string,
    @Param('id') pageId: string,
    @Body() dto: UpdatePageDto,
  ) {
    const page = await this.pagesService.updatePage(userId, pageId, dto);
    return { page };
  }

  @Put(':id/content')
  @ApiOperation({ summary: 'Update page content (blocks)' })
  @ApiResponse({ status: 200, description: 'Page content updated successfully' })
  async updatePageContent(
    @CurrentUser('id') userId: string,
    @Param('id') pageId: string,
    @Body() dto: UpdatePageContentDto,
  ) {
    const page = await this.pagesService.updatePageContent(userId, pageId, dto);
    return { page };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a page' })
  @ApiResponse({ status: 204, description: 'Page deleted successfully' })
  async deletePage(
    @CurrentUser('id') userId: string,
    @Param('id') pageId: string,
  ) {
    await this.pagesService.deletePage(userId, pageId);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a page' })
  @ApiResponse({ status: 200, description: 'Page published successfully' })
  async publishPage(
    @CurrentUser('id') userId: string,
    @Param('id') pageId: string,
  ) {
    const page = await this.pagesService.publishPage(userId, pageId);
    return { page };
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish a page' })
  @ApiResponse({ status: 200, description: 'Page unpublished successfully' })
  async unpublishPage(
    @CurrentUser('id') userId: string,
    @Param('id') pageId: string,
  ) {
    const page = await this.pagesService.unpublishPage(userId, pageId);
    return { page };
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a page' })
  @ApiResponse({ status: 201, description: 'Page duplicated successfully' })
  async duplicatePage(
    @CurrentUser('id') userId: string,
    @Param('id') pageId: string,
  ) {
    const page = await this.pagesService.duplicatePage(userId, pageId);
    return { page };
  }
}
