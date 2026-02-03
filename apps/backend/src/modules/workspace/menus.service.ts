import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateMenuDto,
  UpdateMenuDto,
  UpdateMenuItemsDto,
  MenuResponse,
  MenuItemDto,
} from './dto';

@Injectable()
export class MenusService {
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

  async listMenus(userId: string): Promise<MenuResponse[]> {
    const workspaceId = await this.getWorkspaceId(userId);

    const menus = await this.prisma.workspaceMenu.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });

    return menus.map(this.formatMenuResponse);
  }

  async getMenu(userId: string, menuId: string): Promise<MenuResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const menu = await this.prisma.workspaceMenu.findFirst({
      where: { id: menuId, workspaceId },
    });

    if (!menu) {
      throw new NotFoundException('Menu not found');
    }

    return this.formatMenuResponse(menu);
  }

  async getMenuByLocation(userId: string, location: string): Promise<MenuResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const menu = await this.prisma.workspaceMenu.findFirst({
      where: { workspaceId, location: location.toUpperCase() },
    });

    if (!menu) {
      throw new NotFoundException(`Menu not found for location: ${location}`);
    }

    return this.formatMenuResponse(menu);
  }

  async createMenu(userId: string, dto: CreateMenuDto): Promise<MenuResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    // Check if menu already exists for this location
    const existingMenu = await this.prisma.workspaceMenu.findUnique({
      where: {
        workspaceId_location: {
          workspaceId,
          location: dto.location,
        },
      },
    });

    if (existingMenu) {
      throw new ConflictException(`A menu for location "${dto.location}" already exists`);
    }

    const menu = await this.prisma.workspaceMenu.create({
      data: {
        workspaceId,
        name: dto.name,
        location: dto.location,
        items: JSON.stringify(dto.items || []),
      },
    });

    return this.formatMenuResponse(menu);
  }

  async updateMenu(
    userId: string,
    menuId: string,
    dto: UpdateMenuDto,
  ): Promise<MenuResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const menu = await this.prisma.workspaceMenu.findFirst({
      where: { id: menuId, workspaceId },
    });

    if (!menu) {
      throw new NotFoundException('Menu not found');
    }

    const updatedMenu = await this.prisma.workspaceMenu.update({
      where: { id: menuId },
      data: {
        name: dto.name,
        isActive: dto.isActive,
      },
    });

    return this.formatMenuResponse(updatedMenu);
  }

  async updateMenuItems(
    userId: string,
    menuId: string,
    dto: UpdateMenuItemsDto,
  ): Promise<MenuResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const menu = await this.prisma.workspaceMenu.findFirst({
      where: { id: menuId, workspaceId },
    });

    if (!menu) {
      throw new NotFoundException('Menu not found');
    }

    // Validate menu items
    await this.validateMenuItems(workspaceId, dto.items);

    const updatedMenu = await this.prisma.workspaceMenu.update({
      where: { id: menuId },
      data: {
        items: JSON.stringify(dto.items),
      },
    });

    return this.formatMenuResponse(updatedMenu);
  }

  async deleteMenu(userId: string, menuId: string): Promise<void> {
    const workspaceId = await this.getWorkspaceId(userId);

    const menu = await this.prisma.workspaceMenu.findFirst({
      where: { id: menuId, workspaceId },
    });

    if (!menu) {
      throw new NotFoundException('Menu not found');
    }

    await this.prisma.workspaceMenu.delete({
      where: { id: menuId },
    });
  }

  // Get available pages and posts for menu item selection
  async getMenuItemOptions(userId: string): Promise<{
    pages: { id: string; title: string; slug: string }[];
    posts: { id: string; title: string; slug: string }[];
  }> {
    const workspaceId = await this.getWorkspaceId(userId);

    const [pages, posts] = await Promise.all([
      this.prisma.workspacePage.findMany({
        where: { workspaceId },
        select: { id: true, title: true, slug: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.workspacePost.findMany({
        where: { workspaceId },
        select: { id: true, title: true, slug: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { pages, posts };
  }

  // Public method for fetching menu
  async getPublicMenu(workspaceSlug: string, location: string): Promise<MenuResponse | null> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug: workspaceSlug.toLowerCase() },
    });

    if (!workspace || !workspace.isPublished) {
      throw new NotFoundException('Workspace not found');
    }

    const menu = await this.prisma.workspaceMenu.findFirst({
      where: {
        workspaceId: workspace.id,
        location: location.toUpperCase(),
        isActive: true,
      },
    });

    if (!menu) {
      return null;
    }

    // Enrich menu items with actual URLs
    const items = this.parseJson(menu.items) || [];
    const enrichedItems = await this.enrichMenuItems(workspace.id, items);

    return {
      ...this.formatMenuResponse(menu),
      items: enrichedItems,
    };
  }

  private async validateMenuItems(
    workspaceId: string,
    items: MenuItemDto[],
  ): Promise<void> {
    for (const item of items) {
      if (item.type === 'page' && item.pageId) {
        const page = await this.prisma.workspacePage.findFirst({
          where: { id: item.pageId, workspaceId },
        });
        if (!page) {
          throw new NotFoundException(`Page not found: ${item.pageId}`);
        }
      }

      if (item.type === 'post' && item.postId) {
        const post = await this.prisma.workspacePost.findFirst({
          where: { id: item.postId, workspaceId },
        });
        if (!post) {
          throw new NotFoundException(`Post not found: ${item.postId}`);
        }
      }

      // Recursively validate children
      if (item.children && item.children.length > 0) {
        await this.validateMenuItems(workspaceId, item.children);
      }
    }
  }

  private async enrichMenuItems(
    workspaceId: string,
    items: MenuItemDto[],
  ): Promise<MenuItemDto[]> {
    const enriched: MenuItemDto[] = [];

    for (const item of items) {
      const enrichedItem = { ...item };

      if (item.type === 'page' && item.pageId) {
        const page = await this.prisma.workspacePage.findFirst({
          where: { id: item.pageId, workspaceId, status: 'PUBLISHED' },
          select: { slug: true },
        });
        if (page) {
          enrichedItem.url = `/${page.slug}`;
        }
      }

      if (item.type === 'post' && item.postId) {
        const post = await this.prisma.workspacePost.findFirst({
          where: { id: item.postId, workspaceId, status: 'PUBLISHED' },
          select: { slug: true },
        });
        if (post) {
          enrichedItem.url = `/blog/${post.slug}`;
        }
      }

      // Recursively enrich children
      if (item.children && item.children.length > 0) {
        enrichedItem.children = await this.enrichMenuItems(workspaceId, item.children);
      }

      enriched.push(enrichedItem);
    }

    return enriched;
  }

  private formatMenuResponse(menu: any): MenuResponse {
    return {
      id: menu.id,
      workspaceId: menu.workspaceId,
      name: menu.name,
      location: menu.location,
      items: this.parseJson(menu.items) || [],
      isActive: menu.isActive,
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt,
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
