import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JasperService, ContentGenerationRequest } from '../jasper/jasper.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  GenerateContentDto,
  CreateContentDto,
  UpdateContentDto,
  ScheduleContentDto,
  ContentFilterDto,
} from './dto/content.dto';
const ContentType = {
  INSTAGRAM_IMAGE: 'INSTAGRAM_IMAGE',
  INSTAGRAM_CAROUSEL: 'INSTAGRAM_CAROUSEL',
  INSTAGRAM_REEL: 'INSTAGRAM_REEL',
  INSTAGRAM_STORY: 'INSTAGRAM_STORY',
  FACEBOOK_IMAGE: 'FACEBOOK_IMAGE',
  FACEBOOK_VIDEO: 'FACEBOOK_VIDEO',
  FACEBOOK_LINK: 'FACEBOOK_LINK',
  BLOG_POST: 'BLOG_POST',
} as const;
type ContentType = typeof ContentType[keyof typeof ContentType];

const ContentStatus = {
  DRAFT: 'DRAFT',
  GENERATING: 'GENERATING',
  READY: 'READY',
  SCHEDULED: 'SCHEDULED',
  PUBLISHING: 'PUBLISHING',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
} as const;

const PLATFORM_TO_CONTENT_TYPE: Record<string, ContentType> = {
  'instagram_image_post': ContentType.INSTAGRAM_IMAGE,
  'instagram_carousel': ContentType.INSTAGRAM_CAROUSEL,
  'instagram_video_post': ContentType.INSTAGRAM_REEL,
  'facebook_image_post': ContentType.FACEBOOK_IMAGE,
  'facebook_video_post': ContentType.FACEBOOK_VIDEO,
  'facebook_article': ContentType.FACEBOOK_LINK,
  'blog_article': ContentType.BLOG_POST,
};

const CONTENT_TYPE_TO_CREDIT_ACTION: Record<ContentType, string> = {
  [ContentType.INSTAGRAM_IMAGE]: 'INSTAGRAM_IMAGE',
  [ContentType.INSTAGRAM_CAROUSEL]: 'INSTAGRAM_CAROUSEL',
  [ContentType.INSTAGRAM_REEL]: 'INSTAGRAM_VIDEO',
  [ContentType.INSTAGRAM_STORY]: 'INSTAGRAM_IMAGE',
  [ContentType.FACEBOOK_IMAGE]: 'FACEBOOK_IMAGE',
  [ContentType.FACEBOOK_VIDEO]: 'FACEBOOK_VIDEO',
  [ContentType.FACEBOOK_LINK]: 'FACEBOOK_LINK',
  [ContentType.BLOG_POST]: 'BLOG_POST_500',
};

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private jasperService: JasperService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async generateContent(userId: string, dto: GenerateContentDto) {
    // Get user profile for context
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const contentType = PLATFORM_TO_CONTENT_TYPE[`${dto.platform}_${dto.contentType}`];
    if (!contentType) {
      throw new BadRequestException('Invalid platform/content type combination');
    }

    // Check credits
    const creditAction = CONTENT_TYPE_TO_CREDIT_ACTION[contentType];

    // Generate content with Jasper
    const request: ContentGenerationRequest = {
      platform: dto.platform,
      contentType: dto.contentType,
      topic: dto.topic,
      tone: dto.tone,
      length: dto.length,
      includeMedia: dto.includeMedia,
      keywords: dto.keywords,
      targetAudience: userProfile?.targetAudience || undefined,
      brandContext: userProfile
        ? {
            businessName: userProfile.businessName || undefined,
            industry: userProfile.industry || undefined,
            services: userProfile.services ? JSON.parse(userProfile.services) : undefined,
            products: userProfile.products ? JSON.parse(userProfile.products) : undefined,
          }
        : undefined,
    };

    const generatedContent = await this.jasperService.generateContent(request);

    // Create content record
    const content = await this.prisma.content.create({
      data: {
        userId,
        type: contentType,
        status: ContentStatus.READY,
        title: generatedContent.title,
        caption: generatedContent.caption,
        body: generatedContent.body,
        hashtags: JSON.stringify(generatedContent.hashtags),
        seoTitle: generatedContent.seoTitle,
        seoDescription: generatedContent.seoDescription,
        seoKeywords: JSON.stringify(generatedContent.seoKeywords || []),
        aiPrompt: JSON.stringify(request),
        aiMetadata: JSON.stringify({
          mediaPrompt: generatedContent.mediaPrompt,
          suggestions: generatedContent.suggestions,
        }),
        creditsConsumed: 0, // Will be charged on publish
      },
    });

    return {
      content,
      generated: generatedContent,
    };
  }

  async createContent(userId: string, dto: CreateContentDto) {
    return this.prisma.content.create({
      data: {
        userId,
        type: dto.type,
        status: ContentStatus.DRAFT,
        title: dto.title,
        caption: dto.caption,
        body: dto.body,
        hashtags: JSON.stringify(dto.hashtags || []),
        mediaUrls: JSON.stringify(dto.mediaUrls || []),
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        seoKeywords: JSON.stringify(dto.seoKeywords || []),
        connectionId: dto.connectionId,
      },
    });
  }

  async findAll(userId: string, filters: ContentFilterDto) {
    const { type, status, search, limit = 20, offset = 0 } = filters;

    const where: any = { userId };

    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { caption: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [contents, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          connection: {
            select: {
              platform: true,
              accountName: true,
            },
          },
        },
      }),
      this.prisma.content.count({ where }),
    ]);

    return {
      contents,
      total,
      limit,
      offset,
    };
  }

  async findById(userId: string, contentId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        connection: true,
        media: true,
        analytics: true,
      },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    if (content.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return content;
  }

  async update(userId: string, contentId: string, dto: UpdateContentDto) {
    const content = await this.findById(userId, contentId);

    if (content.status === ContentStatus.PUBLISHED) {
      throw new BadRequestException('Cannot edit published content');
    }

    const updateData: any = { ...dto };
    if (dto.hashtags) updateData.hashtags = JSON.stringify(dto.hashtags);
    if (dto.mediaUrls) updateData.mediaUrls = JSON.stringify(dto.mediaUrls);

    return this.prisma.content.update({
      where: { id: contentId },
      data: updateData,
    });
  }

  async schedule(userId: string, contentId: string, dto: ScheduleContentDto) {
    const content = await this.findById(userId, contentId);

    if (content.status === ContentStatus.PUBLISHED) {
      throw new BadRequestException('Content is already published');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    // Consume credits when scheduling
    const creditAction = CONTENT_TYPE_TO_CREDIT_ACTION[content.type as ContentType];
    await this.subscriptionsService.consumeCredits(userId, creditAction, contentId);

    return this.prisma.content.update({
      where: { id: contentId },
      data: {
        status: ContentStatus.SCHEDULED,
        scheduledAt,
        connectionId: dto.connectionId || content.connectionId,
      },
    });
  }

  async delete(userId: string, contentId: string) {
    const content = await this.findById(userId, contentId);

    if (content.status === ContentStatus.PUBLISHED) {
      throw new BadRequestException('Cannot delete published content');
    }

    // Refund credits if scheduled but not published
    if (content.status === ContentStatus.SCHEDULED && content.creditsConsumed > 0) {
      await this.subscriptionsService.refundCredits(
        userId,
        content.creditsConsumed,
        'Content deleted before publishing',
      );
    }

    await this.prisma.content.delete({
      where: { id: contentId },
    });

    return { message: 'Content deleted successfully' };
  }

  async getVariations(userId: string, contentId: string) {
    const content = await this.findById(userId, contentId);
    const text = content.caption || content.body || '';

    if (!text) {
      throw new BadRequestException('No content to generate variations from');
    }

    const variations = await this.jasperService.generateVariations(text, 3);

    return { variations };
  }

  async getTrendingTopics(userId: string) {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    return this.jasperService.getTrendingTopics(
      userProfile?.industry || undefined,
      userProfile?.location || undefined,
    );
  }

  async getDrafts(userId: string) {
    return this.prisma.content.findMany({
      where: {
        userId,
        status: ContentStatus.DRAFT,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });
  }

  async getScheduled(userId: string) {
    return this.prisma.content.findMany({
      where: {
        userId,
        status: ContentStatus.SCHEDULED,
        scheduledAt: { gt: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        connection: {
          select: {
            platform: true,
            accountName: true,
          },
        },
      },
    });
  }
}
