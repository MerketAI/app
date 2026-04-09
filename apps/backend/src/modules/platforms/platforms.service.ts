import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
const Platform = { INSTAGRAM: 'INSTAGRAM', FACEBOOK: 'FACEBOOK', GOOGLE_ADS: 'GOOGLE_ADS', GOOGLE_MY_BUSINESS: 'GOOGLE_MY_BUSINESS', WORDPRESS: 'WORDPRESS', LINKEDIN: 'LINKEDIN', TIKTOK: 'TIKTOK' } as const;
const ConnectionStatus = { CONNECTED: 'CONNECTED', DISCONNECTED: 'DISCONNECTED', EXPIRED: 'EXPIRED', ERROR: 'ERROR' } as const;

interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

interface MetaAccountInfo {
  id: string;
  name: string;
  access_token?: string;
}

@Injectable()
export class PlatformsService {
  constructor(
    private prisma: PrismaService,
    private credentialsService: CredentialsService,
  ) {}

  async getConnections(userId: string) {
    return this.prisma.platformConnection.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        status: true,
        accountId: true,
        accountName: true,
        scopes: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });
  }

  async getConnection(userId: string, connectionId: string) {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    if (connection.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return connection;
  }

  // Meta (Facebook/Instagram) OAuth
  async getMetaAuthUrl(redirectUri: string, state: string) {
    const clientId = await this.credentialsService.get('META_APP_ID');
    const scopes = [
      'pages_manage_posts',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_content_publish',
      'business_management',
    ].join(',');

    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;
  }

  async handleMetaCallback(userId: string, code: string, redirectUri: string) {
    const clientId = await this.credentialsService.get('META_APP_ID');
    const clientSecret = await this.credentialsService.get('META_APP_SECRET');

    // Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`;

    const tokenResponse = await fetch(tokenUrl);
    const tokenData: OAuthTokenResponse = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new BadRequestException('Failed to obtain access token');
    }

    // Get long-lived token
    const longLivedUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${tokenData.access_token}`;

    const longLivedResponse = await fetch(longLivedUrl);
    const longLivedData: OAuthTokenResponse = await longLivedResponse.json();

    const accessToken = longLivedData.access_token || tokenData.access_token;
    const expiresIn = longLivedData.expires_in || 60 * 60 * 24 * 60; // Default 60 days

    // Get user's Facebook pages
    const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json();

    const connections = [];

    // Create connection for each page
    for (const page of pagesData.data || []) {
      const pageConnection = await this.prisma.platformConnection.upsert({
        where: {
          userId_platform_accountId: {
            userId,
            platform: Platform.FACEBOOK,
            accountId: page.id,
          },
        },
        update: {
          accessToken: page.access_token,
          tokenExpiry: new Date(Date.now() + expiresIn * 1000),
          status: ConnectionStatus.CONNECTED,
          accountName: page.name,
        },
        create: {
          userId,
          platform: Platform.FACEBOOK,
          accountId: page.id,
          accountName: page.name,
          accessToken: page.access_token,
          tokenExpiry: new Date(Date.now() + expiresIn * 1000),
          scopes: JSON.stringify(['pages_manage_posts', 'pages_read_engagement']),
        },
      });
      connections.push(pageConnection);

      // Check for linked Instagram account
      const igUrl = `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`;
      const igResponse = await fetch(igUrl);
      const igData = await igResponse.json();

      if (igData.instagram_business_account) {
        const igId = igData.instagram_business_account.id;

        // Get Instagram account info
        const igInfoUrl = `https://graph.facebook.com/v18.0/${igId}?fields=username,name&access_token=${page.access_token}`;
        const igInfoResponse = await fetch(igInfoUrl);
        const igInfo = await igInfoResponse.json();

        const igConnection = await this.prisma.platformConnection.upsert({
          where: {
            userId_platform_accountId: {
              userId,
              platform: Platform.INSTAGRAM,
              accountId: igId,
            },
          },
          update: {
            accessToken: page.access_token,
            tokenExpiry: new Date(Date.now() + expiresIn * 1000),
            status: ConnectionStatus.CONNECTED,
            accountName: igInfo.username || igInfo.name,
            metadata: JSON.stringify({ linkedPageId: page.id }),
          },
          create: {
            userId,
            platform: Platform.INSTAGRAM,
            accountId: igId,
            accountName: igInfo.username || igInfo.name,
            accessToken: page.access_token,
            tokenExpiry: new Date(Date.now() + expiresIn * 1000),
            scopes: JSON.stringify(['instagram_basic', 'instagram_content_publish']),
            metadata: JSON.stringify({ linkedPageId: page.id }),
          },
        });
        connections.push(igConnection);
      }
    }

    return { connections };
  }

  // Google OAuth (for Google Ads and GMB)
  async getGoogleAuthUrl(redirectUri: string, state: string) {
    const clientId = await this.credentialsService.get('GOOGLE_CLIENT_ID');
    const scopes = [
      'https://www.googleapis.com/auth/adwords',
      'https://www.googleapis.com/auth/business.manage',
    ].join(' ');

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&response_type=code&access_type=offline&prompt=consent`;
  }

  async handleGoogleCallback(userId: string, code: string, redirectUri: string) {
    const clientId = await this.credentialsService.get('GOOGLE_CLIENT_ID');
    const clientSecret = await this.credentialsService.get('GOOGLE_CLIENT_SECRET');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData: OAuthTokenResponse = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new BadRequestException('Failed to obtain access token');
    }

    // Create Google Ads connection
    const connection = await this.prisma.platformConnection.create({
      data: {
        userId,
        platform: Platform.GOOGLE_ADS,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiry: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
        scopes: JSON.stringify(['adwords', 'business.manage']),
      },
    });

    return { connection };
  }

  // WordPress OAuth
  async getWordPressAuthUrl(redirectUri: string, state: string, siteUrl: string) {
    const clientId = await this.credentialsService.get('WORDPRESS_CLIENT_ID');

    return `https://public-api.wordpress.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&blog=${encodeURIComponent(siteUrl)}&state=${state}`;
  }

  async handleWordPressCallback(userId: string, code: string, redirectUri: string) {
    const clientId = await this.credentialsService.get('WORDPRESS_CLIENT_ID');
    const clientSecret = await this.credentialsService.get('WORDPRESS_CLIENT_SECRET');

    const tokenResponse = await fetch('https://public-api.wordpress.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new BadRequestException('Failed to obtain access token');
    }

    const connection = await this.prisma.platformConnection.create({
      data: {
        userId,
        platform: Platform.WORDPRESS,
        accountId: tokenData.blog_id,
        accountName: tokenData.blog_url,
        accessToken: tokenData.access_token,
        scopes: JSON.stringify(['posts', 'media']),
        metadata: JSON.stringify({ blogUrl: tokenData.blog_url }),
      },
    });

    return { connection };
  }

  // LinkedIn OAuth
  async getLinkedInAuthUrl(redirectUri: string, state: string) {
    const clientId = await this.credentialsService.get('LINKEDIN_CLIENT_ID');
    const scopes = [
      'w_member_social',
      'r_liteprofile',
      'openid',
      'profile',
      'email',
    ].join(' ');

    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
  }

  async handleLinkedInCallback(userId: string, code: string, redirectUri: string) {
    const clientId = await this.credentialsService.get('LINKEDIN_CLIENT_ID');
    const clientSecret = await this.credentialsService.get('LINKEDIN_CLIENT_SECRET');

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData: OAuthTokenResponse = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new BadRequestException('Failed to obtain LinkedIn access token');
    }

    // Get user profile info using OpenID userinfo endpoint
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profileData = await profileResponse.json();

    const accountId = profileData.sub || profileData.id || '';
    const accountName = profileData.name || `${profileData.given_name || ''} ${profileData.family_name || ''}`.trim() || 'LinkedIn User';

    const connection = await this.prisma.platformConnection.upsert({
      where: {
        userId_platform_accountId: {
          userId,
          platform: Platform.LINKEDIN,
          accountId,
        },
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiry: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Default 60 days
        status: ConnectionStatus.CONNECTED,
        accountName,
        scopes: JSON.stringify(['w_member_social', 'r_liteprofile', 'openid', 'profile', 'email']),
      },
      create: {
        userId,
        platform: Platform.LINKEDIN,
        accountId,
        accountName,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiry: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        scopes: JSON.stringify(['w_member_social', 'r_liteprofile', 'openid', 'profile', 'email']),
        metadata: JSON.stringify({ linkedInId: accountId, email: profileData.email }),
      },
    });

    return { connection };
  }

  // TikTok OAuth
  async getTikTokAuthUrl(redirectUri: string, state: string) {
    const clientKey = await this.credentialsService.get('TIKTOK_CLIENT_KEY');
    const scopes = [
      'user.info.basic',
      'video.publish',
      'video.upload',
    ].join(',');

    return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&response_type=code&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  }

  async handleTikTokCallback(userId: string, code: string, redirectUri: string) {
    const clientKey = await this.credentialsService.get('TIKTOK_CLIENT_KEY');
    const clientSecret = await this.credentialsService.get('TIKTOK_CLIENT_SECRET');

    // Exchange code for access token
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey!,
        client_secret: clientSecret!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new BadRequestException('Failed to obtain TikTok access token');
    }

    // Get user info
    const userResponse = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );

    const userData = await userResponse.json();
    const userInfo = userData.data?.user || {};

    const accountId = tokenData.open_id || userInfo.open_id || '';
    const accountName = userInfo.display_name || 'TikTok User';

    const connection = await this.prisma.platformConnection.upsert({
      where: {
        userId_platform_accountId: {
          userId,
          platform: Platform.TIKTOK,
          accountId,
        },
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiry: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24 hours
        status: ConnectionStatus.CONNECTED,
        accountName,
        scopes: JSON.stringify(['user.info.basic', 'video.publish', 'video.upload']),
      },
      create: {
        userId,
        platform: Platform.TIKTOK,
        accountId,
        accountName,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiry: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : new Date(Date.now() + 24 * 60 * 60 * 1000),
        scopes: JSON.stringify(['user.info.basic', 'video.publish', 'video.upload']),
        metadata: JSON.stringify({ openId: accountId, avatarUrl: userInfo.avatar_url }),
      },
    });

    return { connection };
  }

  async refreshToken(connectionId: string) {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.refreshToken) {
      throw new BadRequestException('Cannot refresh token');
    }

    // Implement refresh logic based on platform
    switch (connection.platform) {
      case Platform.GOOGLE_ADS:
      case Platform.GOOGLE_MY_BUSINESS:
        return this.refreshGoogleToken(connection);
      case Platform.LINKEDIN:
        return this.refreshLinkedInToken(connection);
      case Platform.TIKTOK:
        return this.refreshTikTokToken(connection);
      default:
        throw new BadRequestException('Token refresh not supported for this platform');
    }
  }

  private async refreshGoogleToken(connection: any) {
    const clientId = await this.credentialsService.get('GOOGLE_CLIENT_ID');
    const clientSecret = await this.credentialsService.get('GOOGLE_CLIENT_SECRET');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: connection.refreshToken,
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: 'refresh_token',
      }),
    });

    const data: OAuthTokenResponse = await response.json();

    if (!data.access_token) {
      await this.prisma.platformConnection.update({
        where: { id: connection.id },
        data: { status: ConnectionStatus.EXPIRED },
      });
      throw new BadRequestException('Token refresh failed');
    }

    return this.prisma.platformConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: data.access_token,
        tokenExpiry: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : null,
      },
    });
  }

  private async refreshLinkedInToken(connection: any) {
    const clientId = await this.credentialsService.get('LINKEDIN_CLIENT_ID');
    const clientSecret = await this.credentialsService.get('LINKEDIN_CLIENT_SECRET');

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
        client_id: clientId!,
        client_secret: clientSecret!,
      }),
    });

    const data: OAuthTokenResponse = await response.json();

    if (!data.access_token) {
      await this.prisma.platformConnection.update({
        where: { id: connection.id },
        data: { status: ConnectionStatus.EXPIRED },
      });
      throw new BadRequestException('LinkedIn token refresh failed');
    }

    return this.prisma.platformConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || connection.refreshToken,
        tokenExpiry: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : null,
      },
    });
  }

  private async refreshTikTokToken(connection: any) {
    const clientKey = await this.credentialsService.get('TIKTOK_CLIENT_KEY');
    const clientSecret = await this.credentialsService.get('TIKTOK_CLIENT_SECRET');

    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey!,
        client_secret: clientSecret!,
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
      }),
    });

    const data = await response.json();

    if (!data.access_token) {
      await this.prisma.platformConnection.update({
        where: { id: connection.id },
        data: { status: ConnectionStatus.EXPIRED },
      });
      throw new BadRequestException('TikTok token refresh failed');
    }

    return this.prisma.platformConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || connection.refreshToken,
        tokenExpiry: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : null,
      },
    });
  }

  async disconnect(userId: string, connectionId: string) {
    const connection = await this.getConnection(userId, connectionId);

    await this.prisma.platformConnection.delete({
      where: { id: connection.id },
    });

    return { message: 'Platform disconnected successfully' };
  }

  async testConnection(userId: string, connectionId: string) {
    const connection = await this.getConnection(userId, connectionId);

    try {
      switch (connection.platform) {
        case Platform.FACEBOOK:
          await this.testFacebookConnection(connection);
          break;
        case Platform.INSTAGRAM:
          await this.testInstagramConnection(connection);
          break;
        case Platform.WORDPRESS:
          await this.testWordPressConnection(connection);
          break;
        case Platform.LINKEDIN:
          await this.testLinkedInConnection(connection);
          break;
        case Platform.TIKTOK:
          await this.testTikTokConnection(connection);
          break;
        default:
          throw new BadRequestException('Test not implemented for this platform');
      }

      await this.prisma.platformConnection.update({
        where: { id: connectionId },
        data: {
          status: ConnectionStatus.CONNECTED,
          lastSyncAt: new Date(),
        },
      });

      return { status: 'connected', message: 'Connection is working' };
    } catch (error) {
      await this.prisma.platformConnection.update({
        where: { id: connectionId },
        data: { status: ConnectionStatus.ERROR },
      });

      return { status: 'error', message: (error as Error).message };
    }
  }

  private async testFacebookConnection(connection: any) {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${connection.accountId}?access_token=${connection.accessToken}`,
    );
    if (!response.ok) throw new Error('Facebook connection test failed');
  }

  private async testInstagramConnection(connection: any) {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${connection.accountId}?fields=username&access_token=${connection.accessToken}`,
    );
    if (!response.ok) throw new Error('Instagram connection test failed');
  }

  private async testWordPressConnection(connection: any) {
    const response = await fetch(
      `https://public-api.wordpress.com/rest/v1.1/sites/${connection.accountId}`,
      {
        headers: { Authorization: `Bearer ${connection.accessToken}` },
      },
    );
    if (!response.ok) throw new Error('WordPress connection test failed');
  }

  private async testLinkedInConnection(connection: any) {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${connection.accessToken}` },
    });
    if (!response.ok) throw new Error('LinkedIn connection test failed');
  }

  private async testTikTokConnection(connection: any) {
    const response = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name',
      {
        headers: { Authorization: `Bearer ${connection.accessToken}` },
      },
    );
    if (!response.ok) throw new Error('TikTok connection test failed');
  }
}
