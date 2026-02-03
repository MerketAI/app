import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePageDto,
  UpdatePageDto,
  UpdatePageContentDto,
  PageBlock,
  PageResponse,
} from './dto';

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService) {}

  async getWorkspaceId(userId: string): Promise<string> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found. Please create a workspace first.');
    }

    return workspace.id;
  }

  async listPages(userId: string): Promise<PageResponse[]> {
    const workspaceId = await this.getWorkspaceId(userId);

    const pages = await this.prisma.workspacePage.findMany({
      where: { workspaceId },
      orderBy: [{ isHomePage: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return pages.map(this.formatPageResponse);
  }

  async getPage(userId: string, pageId: string): Promise<PageResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const page = await this.prisma.workspacePage.findFirst({
      where: { id: pageId, workspaceId },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return this.formatPageResponse(page);
  }

  async createPage(userId: string, dto: CreatePageDto): Promise<PageResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    // Check for duplicate slug
    const existingPage = await this.prisma.workspacePage.findUnique({
      where: {
        workspaceId_slug: {
          workspaceId,
          slug: dto.slug,
        },
      },
    });

    if (existingPage) {
      throw new ConflictException(`A page with slug "${dto.slug}" already exists`);
    }

    // If setting as home page, unset other home pages
    if (dto.isHomePage) {
      await this.prisma.workspacePage.updateMany({
        where: { workspaceId, isHomePage: true },
        data: { isHomePage: false },
      });
    }

    const page = await this.prisma.workspacePage.create({
      data: {
        workspaceId,
        title: dto.title,
        slug: dto.slug.toLowerCase(),
        description: dto.description,
        isHomePage: dto.isHomePage || false,
        content: '[]', // Empty blocks array
      },
    });

    return this.formatPageResponse(page);
  }

  async updatePage(
    userId: string,
    pageId: string,
    dto: UpdatePageDto,
  ): Promise<PageResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const page = await this.prisma.workspacePage.findFirst({
      where: { id: pageId, workspaceId },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    // Check for duplicate slug if slug is being updated
    if (dto.slug && dto.slug !== page.slug) {
      const existingPage = await this.prisma.workspacePage.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId,
            slug: dto.slug,
          },
        },
      });

      if (existingPage) {
        throw new ConflictException(`A page with slug "${dto.slug}" already exists`);
      }
    }

    // If setting as home page, unset other home pages
    if (dto.isHomePage && !page.isHomePage) {
      await this.prisma.workspacePage.updateMany({
        where: { workspaceId, isHomePage: true },
        data: { isHomePage: false },
      });
    }

    const updatedPage = await this.prisma.workspacePage.update({
      where: { id: pageId },
      data: {
        title: dto.title,
        slug: dto.slug?.toLowerCase(),
        description: dto.description,
        isHomePage: dto.isHomePage,
        seoTitle: dto.seoTitle,
        seoKeywords: dto.seoKeywords,
        sortOrder: dto.sortOrder,
      },
    });

    return this.formatPageResponse(updatedPage);
  }

  async updatePageContent(
    userId: string,
    pageId: string,
    dto: UpdatePageContentDto,
  ): Promise<PageResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const page = await this.prisma.workspacePage.findFirst({
      where: { id: pageId, workspaceId },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const updatedPage = await this.prisma.workspacePage.update({
      where: { id: pageId },
      data: {
        content: JSON.stringify(dto.blocks),
        htmlContent: dto.htmlContent,
        cssContent: dto.cssContent,
      },
    });

    return this.formatPageResponse(updatedPage);
  }

  async deletePage(userId: string, pageId: string): Promise<void> {
    const workspaceId = await this.getWorkspaceId(userId);

    const page = await this.prisma.workspacePage.findFirst({
      where: { id: pageId, workspaceId },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    if (page.isHomePage) {
      throw new BadRequestException('Cannot delete the home page. Set another page as home first.');
    }

    await this.prisma.workspacePage.delete({
      where: { id: pageId },
    });
  }

  async publishPage(userId: string, pageId: string): Promise<PageResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const page = await this.prisma.workspacePage.findFirst({
      where: { id: pageId, workspaceId },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const updatedPage = await this.prisma.workspacePage.update({
      where: { id: pageId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    return this.formatPageResponse(updatedPage);
  }

  async unpublishPage(userId: string, pageId: string): Promise<PageResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const page = await this.prisma.workspacePage.findFirst({
      where: { id: pageId, workspaceId },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const updatedPage = await this.prisma.workspacePage.update({
      where: { id: pageId },
      data: {
        status: 'DRAFT',
        publishedAt: null,
      },
    });

    return this.formatPageResponse(updatedPage);
  }

  async duplicatePage(userId: string, pageId: string): Promise<PageResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const page = await this.prisma.workspacePage.findFirst({
      where: { id: pageId, workspaceId },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    // Generate unique slug
    const baseSlug = `${page.slug}-copy`;
    let newSlug = baseSlug;
    let counter = 1;

    while (true) {
      const existingPage = await this.prisma.workspacePage.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId,
            slug: newSlug,
          },
        },
      });

      if (!existingPage) break;
      newSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const duplicatedPage = await this.prisma.workspacePage.create({
      data: {
        workspaceId,
        title: `${page.title} (Copy)`,
        slug: newSlug,
        description: page.description,
        content: page.content,
        htmlContent: page.htmlContent,
        cssContent: page.cssContent,
        seoTitle: page.seoTitle,
        seoKeywords: page.seoKeywords,
        sortOrder: page.sortOrder + 1,
        isHomePage: false, // Duplicates are never home pages
        status: 'DRAFT', // Duplicates start as drafts
      },
    });

    return this.formatPageResponse(duplicatedPage);
  }

  // Public method for fetching a page by slug (for rendering)
  async getPublicPage(workspaceSlug: string, pageSlug: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug: workspaceSlug.toLowerCase() },
    });

    if (!workspace || !workspace.isPublished) {
      throw new NotFoundException('Workspace not found');
    }

    const page = await this.prisma.workspacePage.findFirst({
      where: {
        workspaceId: workspace.id,
        slug: pageSlug.toLowerCase(),
        status: 'PUBLISHED',
      },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return {
      page: this.formatPageResponse(page),
      workspace: {
        name: workspace.name,
        slug: workspace.slug,
        logo: workspace.logo,
        favicon: workspace.favicon,
        settings: this.parseJson(workspace.settings),
      },
    };
  }

  async getPublicHomePage(workspaceSlug: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug: workspaceSlug.toLowerCase() },
    });

    if (!workspace || !workspace.isPublished) {
      throw new NotFoundException('Workspace not found');
    }

    const page = await this.prisma.workspacePage.findFirst({
      where: {
        workspaceId: workspace.id,
        isHomePage: true,
        status: 'PUBLISHED',
      },
    });

    if (!page) {
      // Return first published page if no home page set
      const firstPage = await this.prisma.workspacePage.findFirst({
        where: {
          workspaceId: workspace.id,
          status: 'PUBLISHED',
        },
        orderBy: { sortOrder: 'asc' },
      });

      if (!firstPage) {
        throw new NotFoundException('No published pages found');
      }

      return {
        page: this.formatPageResponse(firstPage),
        workspace: {
          name: workspace.name,
          slug: workspace.slug,
          logo: workspace.logo,
          favicon: workspace.favicon,
          settings: this.parseJson(workspace.settings),
        },
      };
    }

    return {
      page: this.formatPageResponse(page),
      workspace: {
        name: workspace.name,
        slug: workspace.slug,
        logo: workspace.logo,
        favicon: workspace.favicon,
        settings: this.parseJson(workspace.settings),
      },
    };
  }

  private formatPageResponse(page: any): PageResponse {
    return {
      id: page.id,
      workspaceId: page.workspaceId,
      title: page.title,
      slug: page.slug,
      description: page.description,
      content: this.parseJson(page.content) || [],
      htmlContent: page.htmlContent,
      cssContent: page.cssContent,
      status: page.status,
      isHomePage: page.isHomePage,
      seoTitle: page.seoTitle,
      seoKeywords: page.seoKeywords,
      sortOrder: page.sortOrder,
      publishedAt: page.publishedAt,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  }

  private parseJson(jsonString: string | null): any {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }
}
