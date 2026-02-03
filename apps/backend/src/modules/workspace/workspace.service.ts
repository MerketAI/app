import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto, WorkspaceResponseDto } from './dto';

// Reserved slugs that cannot be used
const RESERVED_SLUGS = [
  'admin', 'api', 'app', 'auth', 'dashboard', 'login', 'register',
  'signup', 'signin', 'logout', 'www', 'mail', 'email', 'help',
  'support', 'blog', 'docs', 'status', 'cdn', 'static', 'assets',
];

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}

  async getWorkspace(userId: string): Promise<WorkspaceResponseDto | null> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { userId },
      include: {
        pages: {
          select: { id: true, title: true, slug: true, status: true },
          orderBy: { sortOrder: 'asc' },
        },
        posts: {
          select: { id: true, title: true, slug: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        menus: {
          select: { id: true, name: true, location: true, isActive: true },
        },
      },
    });

    if (!workspace) {
      return null;
    }

    return this.formatWorkspaceResponse(workspace);
  }

  async createWorkspace(
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    // Check if user already has a workspace
    const existing = await this.prisma.workspace.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('User already has a workspace');
    }

    // Validate slug
    await this.validateSlug(dto.slug);

    const workspace = await this.prisma.workspace.create({
      data: {
        userId,
        name: dto.name,
        slug: dto.slug.toLowerCase(),
        description: dto.description,
      },
    });

    return this.formatWorkspaceResponse(workspace);
  }

  async updateWorkspace(
    userId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { userId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const updatedWorkspace = await this.prisma.workspace.update({
      where: { userId },
      data: {
        name: dto.name,
        description: dto.description,
        logo: dto.logo,
        favicon: dto.favicon,
        settings: dto.settings,
        isPublished: dto.isPublished,
      },
    });

    return this.formatWorkspaceResponse(updatedWorkspace);
  }

  async deleteWorkspace(userId: string): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { userId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Cascade delete will handle pages, posts, menus
    await this.prisma.workspace.delete({
      where: { userId },
    });
  }

  async checkSlugAvailability(slug: string): Promise<{ available: boolean; suggestion?: string }> {
    const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Check reserved slugs
    if (RESERVED_SLUGS.includes(normalizedSlug)) {
      return {
        available: false,
        suggestion: this.generateSlugSuggestion(normalizedSlug),
      };
    }

    // Check existing workspaces
    const existing = await this.prisma.workspace.findUnique({
      where: { slug: normalizedSlug },
    });

    if (existing) {
      return {
        available: false,
        suggestion: this.generateSlugSuggestion(normalizedSlug),
      };
    }

    return { available: true };
  }

  async getWorkspaceBySlug(slug: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        pages: {
          where: { status: 'PUBLISHED' },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            isHomePage: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        menus: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            location: true,
            items: true,
          },
        },
      },
    });

    if (!workspace || !workspace.isPublished) {
      throw new NotFoundException('Workspace not found');
    }

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      logo: workspace.logo,
      favicon: workspace.favicon,
      settings: this.parseJson(workspace.settings),
      pages: workspace.pages,
      menus: workspace.menus.map((menu) => ({
        ...menu,
        items: this.parseJson(menu.items),
      })),
    };
  }

  private async validateSlug(slug: string): Promise<void> {
    const normalizedSlug = slug.toLowerCase();

    if (RESERVED_SLUGS.includes(normalizedSlug)) {
      throw new BadRequestException(`The slug "${slug}" is reserved and cannot be used`);
    }

    const existing = await this.prisma.workspace.findUnique({
      where: { slug: normalizedSlug },
    });

    if (existing) {
      throw new ConflictException(`The slug "${slug}" is already taken`);
    }
  }

  private generateSlugSuggestion(baseSlug: string): string {
    const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
    return `${baseSlug}-${randomSuffix}`;
  }

  private formatWorkspaceResponse(workspace: any): WorkspaceResponseDto {
    return {
      id: workspace.id,
      userId: workspace.userId,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      logo: workspace.logo,
      favicon: workspace.favicon,
      settings: this.parseJson(workspace.settings),
      isPublished: workspace.isPublished,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      url: `${workspace.slug}.jeeper.app`,
    };
  }

  private parseJson(jsonString: string | null): any {
    if (!jsonString) return {};
    try {
      return JSON.parse(jsonString);
    } catch {
      return {};
    }
  }
}
