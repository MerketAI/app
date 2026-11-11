import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  parseJsonArray,
  normalizeHashtags,
  formatHashtags,
} from '../../common/utils/json-field.util';
const Platform = { INSTAGRAM: 'INSTAGRAM', FACEBOOK: 'FACEBOOK', WORDPRESS: 'WORDPRESS', LINKEDIN: 'LINKEDIN', TIKTOK: 'TIKTOK' } as const;
const ContentStatus = { DRAFT: 'DRAFT', READY: 'READY', SCHEDULED: 'SCHEDULED', PUBLISHING: 'PUBLISHING', PUBLISHED: 'PUBLISHED', FAILED: 'FAILED' } as const;
const ContentType = { INSTAGRAM_IMAGE: 'INSTAGRAM_IMAGE', INSTAGRAM_CAROUSEL: 'INSTAGRAM_CAROUSEL', INSTAGRAM_REEL: 'INSTAGRAM_REEL', INSTAGRAM_STORY: 'INSTAGRAM_STORY', FACEBOOK_IMAGE: 'FACEBOOK_IMAGE', FACEBOOK_VIDEO: 'FACEBOOK_VIDEO', FACEBOOK_LINK: 'FACEBOOK_LINK', BLOG_POST: 'BLOG_POST' } as const;
type ContentType = typeof ContentType[keyof typeof ContentType];

interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformPostUrl?: string;
  error?: string;
}

/**
 * A Content row with its JSON-encoded columns decoded into real arrays.
 * Prisma returns `mediaUrls` / `hashtags` / `seoKeywords` as strings, so the
 * platform adapters below must never be handed a raw row.
 */
interface PublishableContent {
  id: string;
  userId: string;
  type: string;
  title: string | null;
  caption: string | null;
  body: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  mediaUrls: string[];
  hashtags: string[];
  seoKeywords: string[];
  [key: string]: any;
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

    // connectionId comes from the caller: never post through someone else's page.
    if (connection.userId !== userId) {
      throw new BadRequestException('Access denied');
    }

    // Only charge once per piece of content, and remember whether this call is
    // the one that charged - a refund must not fire for credits it never took.
    const creditAction = this.getCreditAction(content.type as ContentType);
    let chargedHere = false;
    if (content.creditsConsumed === 0) {
      await this.subscriptionsService.consumeCredits(
        userId,
        creditAction,
        contentId,
      );
      chargedHere = true;
    }

    // Update status to publishing
    await this.prisma.content.update({
      where: { id: contentId },
      data: { status: ContentStatus.PUBLISHING },
    });

    try {
      let result: PublishResult;
      const publishable = this.toPublishableContent(content);

      switch (connection.platform) {
        case Platform.INSTAGRAM:
          result = await this.publishToInstagram(publishable, connection);
          break;
        case Platform.FACEBOOK:
          result = await this.publishToFacebook(publishable, connection);
          break;
        case Platform.WORDPRESS:
          result = await this.publishToWordPress(publishable, connection);
          break;
        case Platform.LINKEDIN:
          result = await this.publishToLinkedIn(publishable, connection);
          break;
        case Platform.TIKTOK:
          result = await this.publishToTikTok(publishable, connection);
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

        if (chargedHere) {
          await this.subscriptionsService.refundCredits(
            userId,
            this.getCreditAmount(creditAction),
            'Publishing failed',
          );
        }

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

  async publishToInstagram(
    content: PublishableContent,
    connection: any,
  ): Promise<PublishResult> {
    const accessToken = connection.accessToken;
    const igUserId = connection.accountId;

    try {
      // Step 1: Create media container
      const mediaUrl = content.mediaUrls[0];
      if (!mediaUrl) {
        return { success: false, error: 'Instagram requires at least one image' };
      }
      const unreachable = this.assertPubliclyFetchable(mediaUrl, 'Instagram');
      if (unreachable) {
        return { success: false, error: unreachable };
      }

      const tags = formatHashtags(content.hashtags);
      const caption = [content.caption || '', tags]
        .filter(Boolean)
        .join('\n\n');

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

  async publishToFacebook(
    content: PublishableContent,
    connection: any,
  ): Promise<PublishResult> {
    const accessToken = connection.accessToken;
    const pageId = connection.accountId;

    try {
      // Hashtags are part of the post body on Facebook - there is no separate
      // field for them, so append them like the other platforms do.
      const message = [
        content.caption || content.body || '',
        formatHashtags(content.hashtags),
      ]
        .filter(Boolean)
        .join('\n\n');
      const hasMedia = content.mediaUrls.length > 0;

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

  async publishToWordPress(
    content: PublishableContent,
    connection: any,
  ): Promise<PublishResult> {
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
            tags: content.seoKeywords.join(','),
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

  async publishToLinkedIn(
    content: PublishableContent,
    connection: any,
  ): Promise<PublishResult> {
    const accessToken = connection.accessToken;
    const authorId = connection.accountId;

    try {
      const text = [
        content.caption || content.body || '',
        formatHashtags(content.hashtags),
      ]
        .filter(Boolean)
        .join('\n\n');
      const hasMedia = content.mediaUrls.length > 0;

      const shareContent: any = {
        shareCommentary: {
          text: text.substring(0, 3000), // LinkedIn character limit
        },
        shareMediaCategory: hasMedia ? 'IMAGE' : 'NONE',
      };

      if (hasMedia) {
        shareContent.media = content.mediaUrls.slice(0, 9).map((url: string) => ({
          status: 'READY',
          originalUrl: url,
          description: {
            text: content.title || '',
          },
        }));
      }

      const postBody = {
        author: `urn:li:person:${authorId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': shareContent,
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postBody),
      });

      const data = await response.json();

      if (!response.ok || data.status >= 400) {
        return {
          success: false,
          error: data.message || data.errorDetails?.[0]?.message || 'LinkedIn publishing failed',
        };
      }

      const postId = data.id || response.headers.get('x-restli-id') || '';
      const postUrn = postId.replace('urn:li:share:', '');
      const postUrl = `https://www.linkedin.com/feed/update/${postId}`;

      return {
        success: true,
        platformPostId: postUrn,
        platformPostUrl: postUrl,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async publishToTikTok(
    content: PublishableContent,
    connection: any,
  ): Promise<PublishResult> {
    const accessToken = connection.accessToken;

    try {
      const mediaUrl = content.mediaUrls[0];
      if (!mediaUrl) {
        return { success: false, error: 'TikTok requires a video URL to publish' };
      }
      const unreachable = this.assertPubliclyFetchable(mediaUrl, 'TikTok');
      if (unreachable) {
        return { success: false, error: unreachable };
      }

      const caption = content.caption || content.title || '';
      const hashtags = formatHashtags(content.hashtags);
      const fullCaption = [caption, hashtags]
        .filter(Boolean)
        .join('\n\n')
        .substring(0, 2200);

      // Initialize content posting using TikTok Content Posting API
      const initResponse = await fetch(
        'https://open.tiktokapis.com/v2/post/publish/content/init/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            post_info: {
              title: fullCaption,
              privacy_level: 'PUBLIC_TO_EVERYONE',
              disable_duet: false,
              disable_comment: false,
              disable_stitch: false,
            },
            source_info: {
              source: 'PULL_FROM_URL',
              video_url: mediaUrl,
            },
          }),
        },
      );

      const initData = await initResponse.json();

      if (initData.error?.code) {
        return {
          success: false,
          error: initData.error?.message || `TikTok API error: ${initData.error?.code}`,
        };
      }

      const publishId = initData.data?.publish_id || '';

      // TikTok processes the video asynchronously
      // Return the publish_id for status tracking
      return {
        success: true,
        platformPostId: publishId,
        platformPostUrl: `https://www.tiktok.com/@${connection.accountName}`,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Publishes everything whose scheduled time has passed. Driven by the cron in
   * SchedulerService; also callable by an admin for manual catch-up.
   *
   * Each row is claimed with a conditional update before it is published, so two
   * overlapping runs (or two app instances) cannot post the same content twice.
   */
  async processScheduledContent() {
    const due = await this.prisma.content.findMany({
      where: {
        status: ContentStatus.SCHEDULED,
        scheduledAt: { lte: new Date() },
      },
      select: { id: true, userId: true, connectionId: true },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    });

    const results = [];

    for (const content of due) {
      // Claim it: only the run that flips SCHEDULED -> PUBLISHING proceeds.
      const claim = await this.prisma.content.updateMany({
        where: { id: content.id, status: ContentStatus.SCHEDULED },
        data: { status: ContentStatus.PUBLISHING },
      });
      if (claim.count === 0) continue;

      try {
        const result = await this.publishNow(
          content.userId,
          content.id,
          content.connectionId || undefined,
        );
        results.push({ contentId: content.id, ...result });
      } catch (error) {
        // publishNow already recorded FAILED and the error message.
        results.push({
          contentId: content.id,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    return {
      processed: results.length,
      succeeded,
      failed: results.length - succeeded,
      results,
    };
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

  /**
   * Decodes the JSON-encoded columns on a Content row. Prisma hands these back
   * as strings, and every platform adapter below expects real arrays.
   */
  private toPublishableContent(content: any): PublishableContent {
    return {
      ...content,
      mediaUrls: parseJsonArray<string>(content.mediaUrls),
      hashtags: normalizeHashtags(content.hashtags),
      seoKeywords: parseJsonArray<string>(content.seoKeywords),
    };
  }

  /**
   * Instagram and TikTok fetch the asset themselves, so the URL has to be
   * reachable from the public internet. Catching this here produces a clear
   * error instead of an opaque rejection from the platform.
   */
  private assertPubliclyFetchable(
    url: string | undefined,
    platform: string,
  ): string | null {
    if (!url) return null;

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return `${platform} needs an absolute media URL; received "${url}"`;
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return `${platform} media URL must be http(s); received "${parsed.protocol}"`;
    }
    const host = parsed.hostname.toLowerCase();
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    if (isLocal) {
      return `${platform} must be able to download the media, but "${host}" is not reachable from the internet. Upload the asset first (POST /api/v1/upload/image).`;
    }
    return null;
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
