import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto, UpdatePostDto, PostResponse } from './dto';

@Injectable()
export class PostsService {
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

  async listPosts(
    userId: string,
    status?: string,
    limit = 20,
    offset = 0,
  ): Promise<{ posts: PostResponse[]; total: number }> {
    const workspaceId = await this.getWorkspaceId(userId);

    const where: any = { workspaceId };
    if (status) {
      where.status = status;
    }

    const [posts, total] = await Promise.all([
      this.prisma.workspacePost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.workspacePost.count({ where }),
    ]);

    return {
      posts: posts.map(this.formatPostResponse),
      total,
    };
  }

  async getPost(userId: string, postId: string): Promise<PostResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const post = await this.prisma.workspacePost.findFirst({
      where: { id: postId, workspaceId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.formatPostResponse(post);
  }

  async createPost(userId: string, dto: CreatePostDto): Promise<PostResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    // Generate slug from title if not provided
    const slug = dto.slug || this.generateSlug(dto.title);

    // Check for duplicate slug
    const existingPost = await this.prisma.workspacePost.findUnique({
      where: {
        workspaceId_slug: {
          workspaceId,
          slug,
        },
      },
    });

    if (existingPost) {
      throw new ConflictException(`A post with slug "${slug}" already exists`);
    }

    const post = await this.prisma.workspacePost.create({
      data: {
        workspaceId,
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        content: dto.content || '',
        featuredImage: dto.featuredImage,
        tags: JSON.stringify(dto.tags || []),
        categories: JSON.stringify(dto.categories || []),
      },
    });

    return this.formatPostResponse(post);
  }

  async updatePost(
    userId: string,
    postId: string,
    dto: UpdatePostDto,
  ): Promise<PostResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const post = await this.prisma.workspacePost.findFirst({
      where: { id: postId, workspaceId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check for duplicate slug if slug is being updated
    if (dto.slug && dto.slug !== post.slug) {
      const existingPost = await this.prisma.workspacePost.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId,
            slug: dto.slug,
          },
        },
      });

      if (existingPost) {
        throw new ConflictException(`A post with slug "${dto.slug}" already exists`);
      }
    }

    const updatedPost = await this.prisma.workspacePost.update({
      where: { id: postId },
      data: {
        title: dto.title,
        slug: dto.slug,
        excerpt: dto.excerpt,
        content: dto.content,
        featuredImage: dto.featuredImage,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        seoKeywords: dto.seoKeywords,
        tags: dto.tags ? JSON.stringify(dto.tags) : undefined,
        categories: dto.categories ? JSON.stringify(dto.categories) : undefined,
      },
    });

    return this.formatPostResponse(updatedPost);
  }

  async deletePost(userId: string, postId: string): Promise<void> {
    const workspaceId = await this.getWorkspaceId(userId);

    const post = await this.prisma.workspacePost.findFirst({
      where: { id: postId, workspaceId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.prisma.workspacePost.delete({
      where: { id: postId },
    });
  }

  async publishPost(userId: string, postId: string): Promise<PostResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const post = await this.prisma.workspacePost.findFirst({
      where: { id: postId, workspaceId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const updatedPost = await this.prisma.workspacePost.update({
      where: { id: postId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    return this.formatPostResponse(updatedPost);
  }

  async unpublishPost(userId: string, postId: string): Promise<PostResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const post = await this.prisma.workspacePost.findFirst({
      where: { id: postId, workspaceId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const updatedPost = await this.prisma.workspacePost.update({
      where: { id: postId },
      data: {
        status: 'DRAFT',
        publishedAt: null,
      },
    });

    return this.formatPostResponse(updatedPost);
  }

  async syncToWordPress(
    userId: string,
    postId: string,
    connectionId: string,
  ): Promise<PostResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const post = await this.prisma.workspacePost.findFirst({
      where: { id: postId, workspaceId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Get WordPress connection
    const connection = await this.prisma.platformConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: 'WORDPRESS',
        status: 'CONNECTED',
      },
    });

    if (!connection) {
      throw new NotFoundException('WordPress connection not found or not connected');
    }

    // TODO: Implement actual WordPress API sync
    // For now, just mark the sync metadata
    const wpPostId = post.wpPostId || `wp_${Date.now()}`;

    const updatedPost = await this.prisma.workspacePost.update({
      where: { id: postId },
      data: {
        wpPostId,
        wpSyncedAt: new Date(),
        wpConnectionId: connectionId,
      },
    });

    return this.formatPostResponse(updatedPost);
  }

  // Public method for fetching posts
  async getPublicPosts(
    workspaceSlug: string,
    limit = 10,
    offset = 0,
  ): Promise<{ posts: PostResponse[]; total: number }> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug: workspaceSlug.toLowerCase() },
    });

    if (!workspace || !workspace.isPublished) {
      throw new NotFoundException('Workspace not found');
    }

    const where = {
      workspaceId: workspace.id,
      status: 'PUBLISHED',
    };

    const [posts, total] = await Promise.all([
      this.prisma.workspacePost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.workspacePost.count({ where }),
    ]);

    return {
      posts: posts.map(this.formatPostResponse),
      total,
    };
  }

  async getPublicPost(workspaceSlug: string, postSlug: string): Promise<PostResponse> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug: workspaceSlug.toLowerCase() },
    });

    if (!workspace || !workspace.isPublished) {
      throw new NotFoundException('Workspace not found');
    }

    const post = await this.prisma.workspacePost.findFirst({
      where: {
        workspaceId: workspace.id,
        slug: postSlug.toLowerCase(),
        status: 'PUBLISHED',
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.formatPostResponse(post);
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 200);
  }

  private formatPostResponse(post: any): PostResponse {
    return {
      id: post.id,
      workspaceId: post.workspaceId,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      featuredImage: post.featuredImage,
      status: post.status,
      publishedAt: post.publishedAt,
      wpPostId: post.wpPostId,
      wpSyncedAt: post.wpSyncedAt,
      wpConnectionId: post.wpConnectionId,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      seoKeywords: post.seoKeywords,
      tags: this.parseJson(post.tags) || [],
      categories: this.parseJson(post.categories) || [],
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
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
