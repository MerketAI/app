import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { DriveService } from './drive.service';
import { PlatformsService } from './platforms.service';
import { HybridAuthGuard } from '../partner/guards/hybrid-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  isAllowedReturnUrl,
  signOAuthState,
  verifyOAuthState,
} from '../../common/utils/oauth-state.util';

@ApiTags('platforms')
@Controller({ path: 'platforms', version: '1' })
export class PlatformsController {
  constructor(
    private platformsService: PlatformsService,
    private driveService: DriveService,
    private configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all platform connections' })
  async getConnections(@CurrentUser('id') userId: string) {
    return this.platformsService.getConnections(userId);
  }

  @Get(':id')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get connection by ID' })
  async getConnection(
    @CurrentUser('id') userId: string,
    @Param('id') connectionId: string,
  ) {
    return this.platformsService.getConnection(userId, connectionId);
  }

  // Meta (Facebook/Instagram) OAuth
  @Get('oauth/meta')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Meta OAuth URL' })
  async getMetaAuthUrl(
    @CurrentUser('id') userId: string,
    @Query('returnUrl') returnUrl?: string,
  ) {
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/meta/callback`;
    const state = this.makeState(userId, returnUrl);
    const url = await this.platformsService.getMetaAuthUrl(redirectUri, state);
    return { url };
  }

  @Get('oauth/meta/callback')
  @ApiOperation({ summary: 'Meta OAuth callback' })
  async handleMetaCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { userId, returnUrl } = this.readState(state);
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/meta/callback`;

    try {
      await this.platformsService.handleMetaCallback(userId, code, redirectUri);
      res.redirect(this.afterOAuth(returnUrl, 'success=meta'));
    } catch (error) {
      res.redirect(this.afterOAuth(returnUrl, 'error=meta'));
    }
  }

  // Google Drive (picking media for posts)
  @Get('oauth/google-drive')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Google Drive OAuth URL' })
  async getGoogleDriveAuthUrl(
    @CurrentUser('id') userId: string,
    @Query('returnUrl') returnUrl?: string,
  ) {
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/google-drive/callback`;
    const state = this.makeState(userId, returnUrl);
    const url = await this.platformsService.getGoogleDriveAuthUrl(redirectUri, state);
    return { url };
  }

  @Get('oauth/google-drive/callback')
  @ApiOperation({ summary: 'Google Drive OAuth callback' })
  async handleGoogleDriveCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { userId, returnUrl } = this.readState(state);
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/google-drive/callback`;

    try {
      await this.platformsService.handleGoogleDriveCallback(userId, code, redirectUri);
      res.redirect(this.afterOAuth(returnUrl, 'success=google-drive'));
    } catch (error) {
      res.redirect(this.afterOAuth(returnUrl, 'error=google-drive'));
    }
  }

  @Get(':id/drive-token')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "A short-lived token for Google's file Picker" })
  async getDriveToken(
    @CurrentUser('id') userId: string,
    @Param('id') connectionId: string,
  ) {
    return this.platformsService.getDriveAccessToken(userId, connectionId);
  }

  @Post(':id/drive-import')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Copy a file picked from Google Drive into post media' })
  async importDriveFile(
    @CurrentUser('id') userId: string,
    @Param('id') connectionId: string,
    @Body('fileId') fileId: string,
  ) {
    return this.driveService.importFile(userId, connectionId, fileId);
  }

  private get stateSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is not set');
    return secret;
  }

  private makeState(userId: string, returnUrl?: string): string {
    const allowed = isAllowedReturnUrl(returnUrl, this.configService.get('OAUTH_RETURN_ORIGINS'));
    return signOAuthState({ userId, returnUrl: allowed ? returnUrl : undefined }, this.stateSecret);
  }

  private readState(state: string) {
    const payload = verifyOAuthState(state, this.stateSecret);
    if (!payload) throw new BadRequestException('Invalid or expired sign-in state');
    return payload;
  }

  /** Back to the partner app that started this, else our own dashboard. */
  private afterOAuth(returnUrl: string | undefined, result: string): string {
    const target = returnUrl || `${this.configService.get('FRONTEND_URL')}/dashboard/platforms`;
    return `${target}${target.includes('?') ? '&' : '?'}${result}`;
  }

  // Google OAuth
  @Get('oauth/google')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Google OAuth URL' })
  async getGoogleAuthUrl(@CurrentUser('id') userId: string) {
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/google/callback`;
    const state = this.makeState(userId);
    const url = await this.platformsService.getGoogleAuthUrl(redirectUri, state);
    return { url };
  }

  @Get('oauth/google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async handleGoogleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { userId } = this.readState(state);
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/google/callback`;

    try {
      await this.platformsService.handleGoogleCallback(userId, code, redirectUri);
      res.redirect(`${this.configService.get('FRONTEND_URL')}/dashboard/platforms?success=google`);
    } catch (error) {
      res.redirect(`${this.configService.get('FRONTEND_URL')}/dashboard/platforms?error=google`);
    }
  }

  // WordPress OAuth
  @Get('oauth/wordpress')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get WordPress OAuth URL' })
  async getWordPressAuthUrl(
    @CurrentUser('id') userId: string,
    @Query('siteUrl') siteUrl: string,
  ) {
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/wordpress/callback`;
    const state = this.makeState(userId);
    const url = await this.platformsService.getWordPressAuthUrl(redirectUri, state, siteUrl);
    return { url };
  }

  @Get('oauth/wordpress/callback')
  @ApiOperation({ summary: 'WordPress OAuth callback' })
  async handleWordPressCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { userId } = this.readState(state);
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/wordpress/callback`;

    try {
      await this.platformsService.handleWordPressCallback(userId, code, redirectUri);
      res.redirect(`${this.configService.get('FRONTEND_URL')}/dashboard/platforms?success=wordpress`);
    } catch (error) {
      res.redirect(`${this.configService.get('FRONTEND_URL')}/dashboard/platforms?error=wordpress`);
    }
  }

  // LinkedIn OAuth
  @Get('oauth/linkedin')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get LinkedIn OAuth URL' })
  async getLinkedInAuthUrl(@CurrentUser('id') userId: string) {
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/linkedin/callback`;
    const state = this.makeState(userId);
    const url = await this.platformsService.getLinkedInAuthUrl(redirectUri, state);
    return { url };
  }

  @Get('oauth/linkedin/callback')
  @ApiOperation({ summary: 'LinkedIn OAuth callback' })
  async handleLinkedInCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { userId } = this.readState(state);
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/linkedin/callback`;

    try {
      await this.platformsService.handleLinkedInCallback(userId, code, redirectUri);
      res.redirect(`${this.configService.get('FRONTEND_URL')}/dashboard/platforms?success=linkedin`);
    } catch (error) {
      res.redirect(`${this.configService.get('FRONTEND_URL')}/dashboard/platforms?error=linkedin`);
    }
  }

  // TikTok OAuth
  @Get('oauth/tiktok')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get TikTok OAuth URL' })
  async getTikTokAuthUrl(@CurrentUser('id') userId: string) {
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/tiktok/callback`;
    const state = this.makeState(userId);
    const url = await this.platformsService.getTikTokAuthUrl(redirectUri, state);
    return { url };
  }

  @Get('oauth/tiktok/callback')
  @ApiOperation({ summary: 'TikTok OAuth callback' })
  async handleTikTokCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { userId } = this.readState(state);
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/tiktok/callback`;

    try {
      await this.platformsService.handleTikTokCallback(userId, code, redirectUri);
      res.redirect(`${this.configService.get('FRONTEND_URL')}/dashboard/platforms?success=tiktok`);
    } catch (error) {
      res.redirect(`${this.configService.get('FRONTEND_URL')}/dashboard/platforms?error=tiktok`);
    }
  }

  @Post(':id/refresh')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh connection token' })
  async refreshToken(
    @CurrentUser('id') userId: string,
    @Param('id') connectionId: string,
  ) {
    await this.platformsService.getConnection(userId, connectionId);
    return this.platformsService.refreshToken(connectionId);
  }

  @Post(':id/test')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test platform connection' })
  async testConnection(
    @CurrentUser('id') userId: string,
    @Param('id') connectionId: string,
  ) {
    return this.platformsService.testConnection(userId, connectionId);
  }

  @Delete(':id')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect platform' })
  async disconnect(
    @CurrentUser('id') userId: string,
    @Param('id') connectionId: string,
  ) {
    return this.platformsService.disconnect(userId, connectionId);
  }
}
