import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
const Platform = { INSTAGRAM: 'INSTAGRAM', FACEBOOK: 'FACEBOOK', WORDPRESS: 'WORDPRESS' } as const;
const ContentStatus = { DRAFT: 'DRAFT', READY: 'READY', SCHEDULED: 'SCHEDULED', PUBLISHING: 'PUBLISHING', PUBLISHED: 'PUBLISHED', FAILED: 'FAILED' } as const;
const ContentType = { INSTAGRAM_IMAGE: 'INSTAGRAM_IMAGE', INSTAGRAM_CAROUSEL: 'INSTAGRAM_CAROUSEL', INSTAGRAM_REEL: 'INSTAGRAM_REEL', INSTAGRAM_STORY: 'INSTAGRAM_STORY', FACEBOOK_IMAGE: 'FACEBOOK_IMAGE', FACEBOOK_VIDEO: 'FACEBOOK_VIDEO', FACEBOOK_LINK: 'FACEBOOK_LINK', BLOG_POST: 'BLOG_POST' } as const;
type ContentType = typeof ContentType[keyof typeof ContentType];

interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformPostUrl?: string;
  error?: string;
}

@Injectable()
export class PublishingService {
  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async publishNow(userId: string, contentId: string, connectionId?: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { connection: true },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    if (content.userId !== userId) {
      throw new BadRequestException('Access denied');
    }

    if (content.status === ContentStatus.PUBLISHED) {
      throw new BadRequestException('Content is already published');
    }

    // Get connection
    const connection = connectionId
      ? await this.prisma.platformConnection.findUnique({
          where: { id: connectionId },
        })
      : content.connection;

    if (!connection) {
      throw new BadRequestException('No platform connection specified');
    }

    // Determine credit action if not already charged
    if (content.creditsConsumed === 0) {
      const creditAction = this.getCreditAction(content.type as ContentType);
      await this.subscriptionsService.consumeCredits(userId, creditAction, contentId);
    }

    // Update status to publishing
    await this.prisma.content.update({
      where: { id: contentId },
      data: { status: ContentStatus.PUBLISHING },
    });

    try {
      let result: PublishResult;

      switch (connection.platform) {
        case Platform.INSTAGRAM:
          result = await this.publishToInstagram(content, connection);
          break;
        case Platform.FACEBOOK:
          result = await this.publishToFacebook(content, connection);
          break;
        case Platform.WORDPRESS:
          result = await this.publishToWordPress(content, connection);
          break;
        default:
          throw new BadRequestException(`Publishing to ${connection.platform} is not supported yet`);
      }

      if (result.success) {
        await this.prisma.content.update({
          where: { id: contentId },
          data: {
            status: ContentStatus.PUBLISHED,
            publishedAt: new Date(),
            platformPostId: result.platformPostId,
            platformPostUrl: result.platformPostUrl,
            connectionId: connection.id,
          },
        });

        return { ...result };
      } else {
        await this.prisma.content.update({
          where: { id: contentId },
          data: {
            status: ContentStatus.FAILED,
            errorMessage: result.error,
          },
        });

        // Refund credits on failure
        const creditAction = this.getCreditAction(content.type as ContentType);
        const credits = this.getCreditAmount(creditAction);
        await this.subscriptionsService.refundCredits(userId, credits, 'Publishing failed');

        throw new BadRequestException(result.error);
      }
    } catch (error) {
      await this.prisma.content.update({
        where: { id: contentId },
        data: {
          status: ContentStatus.FAILED,
          errorMessage: (error as Error).message,
        },
      });
      throw error;
    }
  }

  async publishToInstagram(content: any, connection: any): Promise<PublishResult> {
    const accessToken = connection.accessToken;
    const igUserId = connection.accountId;

    try {
      // Step 1: Create media container
      let mediaUrl = content.mediaUrls?.[0];
      if (!mediaUrl) {
        return { success: false, error: 'Instagram requires at least one image' };
      }

      const caption = `${content.caption || ''}${content.hashtags?.length ? '\n\n' + content.hashtags.map((h: string) => `#${h.replace('#', '')}`).join(' ') : ''}`;

      // Create container
      const containerResponse = await fetch(
        `https://graph.facebook.com/v18.0/${igUserId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: mediaUrl,
            caption: caption.substring(0, 2200), // Instagram caption limit
            access_token: accessToken,
          }),
        },
      );

      const containerData = await containerResponse.json();

      if (containerData.error) {
        return { success: false, error: containerData.error.message };
      }

      // Step 2: Publish the container
      const publishResponse = await fetch(
        `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: containerData.id,
            access_token: accessToken,
          }),
        },
      );

      const publishData = await publishResponse.json();

      if (publishData.error) {
        return { success: false, error: publishData.error.message };
      }

      // Get permalink
      const mediaInfoResponse = await fetch(
        `https://graph.facebook.com/v18.0/${publishData.id}?fields=permalink&access_token=${accessToken}`,
      );
      const mediaInfo = await mediaInfoResponse.json();

      return {
        success: true,
        platformPostId: publishData.id,
        platformPostUrl: mediaInfo.permalink,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async publishToFacebook(content: any, connection: any): Promise<PublishResult> {
    const accessToken = connection.accessToken;
    const pageId = connection.accountId;

    try {
      const message = content.caption || content.body || '';
      const hasMedia = content.mediaUrls?.length > 0;

      let endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;
      const body: any = {
        message,
        access_token: accessToken,
      };

      if (hasMedia) {
        // Post with photo
        endpoint = `https://graph.facebook.com/v18.0/${pageId}/photos`;
        body.url = content.mediaUrls[0];
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.error) {
        return { success: false, error: data.error.message };
      }

      const postId = data.post_id || data.id;
      const postUrl = `https://www.facebook.com/${postId.replace('_', '/posts/')}`;

      return {
        success: true,
        platformPostId: postId,
        platformPostUrl: postUrl,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async publishToWordPress(content: any, connection: any): Promise<PublishResult> {
    const accessToken = connection.accessToken;
    const siteId = connection.accountId;

    try {
      const response = await fetch(
        `https://public-api.wordpress.com/rest/v1.1/sites/${siteId}/posts/new`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            title: content.title || content.seoTitle || 'Untitled',
            content: content.body,
            status: 'publish',
            excerpt: content.seoDescription,
            tags: content.seoKeywords?.join(','),
          }),
        },
      );

      const data = await response.json();

      if (data.error) {
        return { success: false, error: data.message || data.error };
      }

      return {
        success: true,
        platformPostId: data.ID?.toString(),
        platformPostUrl: data.URL,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async processScheduledContent() {
    const scheduledContent = await this.prisma.content.findMany({
      where: {
        status: ContentStatus.SCHEDULED,
        scheduledAt: { lte: new Date() },
      },
      include: { connection: true },
    });

    const results = [];

    for (const content of scheduledContent) {
      try {
        const result = await this.publishNow(
          content.userId,
          content.id,
          content.connectionId || undefined,
        );
        results.push({ contentId: content.id, ...result });
      } catch (error) {
        results.push({
          contentId: content.id,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    return { processed: results.length, results };
  }

  async getPublishingHistory(userId: string, limit = 20, offset = 0) {
    const [contents, total] = await Promise.all([
      this.prisma.content.findMany({
        where: {
          userId,
          status: { in: [ContentStatus.PUBLISHED, ContentStatus.FAILED] },
        },
        orderBy: { publishedAt: 'desc' },
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
      this.prisma.content.count({
        where: {
          userId,
          status: { in: [ContentStatus.PUBLISHED, ContentStatus.FAILED] },
        },
      }),
    ]);

    return { contents, total, limit, offset };
  }

  private getCreditAction(contentType: ContentType): string {
    const mapping: Record<ContentType, string> = {
      [ContentType.INSTAGRAM_IMAGE]: 'INSTAGRAM_IMAGE',
      [ContentType.INSTAGRAM_CAROUSEL]: 'INSTAGRAM_CAROUSEL',
      [ContentType.INSTAGRAM_REEL]: 'INSTAGRAM_VIDEO',
      [ContentType.INSTAGRAM_STORY]: 'INSTAGRAM_IMAGE',
      [ContentType.FACEBOOK_IMAGE]: 'FACEBOOK_IMAGE',
      [ContentType.FACEBOOK_VIDEO]: 'FACEBOOK_VIDEO',
      [ContentType.FACEBOOK_LINK]: 'FACEBOOK_LINK',
      [ContentType.BLOG_POST]: 'BLOG_POST_500',
    };
    return mapping[contentType] || 'INSTAGRAM_IMAGE';
  }

  private getCreditAmount(action: string): number {
    const costs: Record<string, number> = {
      INSTAGRAM_IMAGE: 5,
      INSTAGRAM_CAROUSEL: 8,
      INSTAGRAM_VIDEO: 15,
      FACEBOOK_IMAGE: 5,
      FACEBOOK_VIDEO: 15,
      FACEBOOK_LINK: 3,
      BLOG_POST_500: 10,
      BLOG_POST_1000: 20,
    };
    return costs[action] || 5;
  }
}
