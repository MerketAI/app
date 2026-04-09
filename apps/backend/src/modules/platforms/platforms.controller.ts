import {
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
import { PlatformsService } from './platforms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('platforms')
@Controller({ path: 'platforms', version: '1' })
export class PlatformsController {
  constructor(
    private platformsService: PlatformsService,
    private configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all platform connections' })
  async getConnections(@CurrentUser('id') userId: string) {
    return this.platformsService.getConnections(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Meta OAuth URL' })
  async getMetaAuthUrl(@CurrentUser('id') userId: string) {
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/meta/callback`;
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const url = this.platformsService.getMetaAuthUrl(redirectUri, state);
    return { url };
  }

  @Get('oauth/meta/callback')
  @ApiOperation({ summary: 'Meta OAuth callback' })
  async handleMetaCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/meta/callback`;

    try {
      await this.platformsService.handleMetaCallback(userId, code, redirectUri);
      res.redirect(`${this.configService.get('FRONTEND_URL')}/dashboard/platforms?success=meta`);
    } catch (error) {
      res.redirect(`${this.configService.get('FRONTEND_URL')}/dashboard/platforms?error=meta`);
    }
  }

  // Google OAuth
  @Get('oauth/google')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Google OAuth URL' })
  async getGoogleAuthUrl(@CurrentUser('id') userId: string) {
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/google/callback`;
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const url = this.platformsService.getGoogleAuthUrl(redirectUri, state);
    return { url };
  }

  @Get('oauth/google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async handleGoogleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get WordPress OAuth URL' })
  async getWordPressAuthUrl(
    @CurrentUser('id') userId: string,
    @Query('siteUrl') siteUrl: string,
  ) {
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/wordpress/callback`;
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const url = this.platformsService.getWordPressAuthUrl(redirectUri, state, siteUrl);
    return { url };
  }

  @Get('oauth/wordpress/callback')
  @ApiOperation({ summary: 'WordPress OAuth callback' })
  async handleWordPressCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get LinkedIn OAuth URL' })
  async getLinkedInAuthUrl(@CurrentUser('id') userId: string) {
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/linkedin/callback`;
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
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
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get TikTok OAuth URL' })
  async getTikTokAuthUrl(@CurrentUser('id') userId: string) {
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/tiktok/callback`;
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
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
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
    const redirectUri = `${this.configService.get('APP_URL')}/api/v1/platforms/oauth/tiktok/callback`;

    try {
      await this.platformsService.handleTikTokCallback(userId, code, redirectUri);
      res.redirect(`${this.configService.get('FRONTEND_URL')}/dashboard/platforms?success=tiktok`);
    } catch (error) {
      res.redirect(`${this.configService.get('FRONTEND_URL')}/dashboard/platforms?error=tiktok`);
    }
  }

  @Post(':id/refresh')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
