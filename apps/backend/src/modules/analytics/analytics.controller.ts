import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { GoogleAnalyticsService } from './google-analytics.service';
import { HybridAuthGuard } from '../partner/guards/hybrid-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { withDataSource } from '../../common/utils/data-source.util';

@ApiTags('analytics')
@Controller({ path: 'analytics', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private googleAnalyticsService: GoogleAnalyticsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboardStats(@CurrentUser('id') userId: string) {
    return this.analyticsService.getDashboardStats(userId);
  }

  @Get('content/:id')
  @ApiOperation({ summary: 'Get analytics for specific content' })
  async getContentAnalytics(
    @CurrentUser('id') userId: string,
    @Param('id') contentId: string,
  ) {
    return this.analyticsService.getContentAnalytics(userId, contentId);
  }

  @Get('report')
  @ApiOperation({ summary: 'Get performance report for date range' })
  async getPerformanceReport(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getPerformanceReport(
      userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Post('content/:id/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync analytics from platform' })
  async syncAnalytics(@Param('id') contentId: string) {
    return this.analyticsService.syncAnalytics(contentId);
  }

  // ==========================================
  // Google Analytics (GA4) Endpoints
  // ==========================================

  @Get('ga/properties')
  @ApiOperation({ summary: 'List GA4 properties accessible to the user' })
  async getGAProperties(@CurrentUser('id') userId: string) {
    return withDataSource(
      await this.googleAnalyticsService.getProperties(userId),
      { key: 'properties' },
    );
  }

  @Get('ga/dashboard')
  @ApiOperation({ summary: 'Get GA4 traffic dashboard' })
  async getGADashboard(
    @CurrentUser('id') userId: string,
    @Query('propertyId') propertyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return withDataSource(
      await this.googleAnalyticsService.getDashboard(
        userId,
        propertyId,
        startDate,
        endDate,
      ),
      { key: 'dashboard' },
    );
  }

  @Get('ga/traffic-sources')
  @ApiOperation({ summary: 'Get GA4 traffic source breakdown' })
  async getGATrafficSources(
    @CurrentUser('id') userId: string,
    @Query('propertyId') propertyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return withDataSource(
      await this.googleAnalyticsService.getTrafficSources(
        userId,
        propertyId,
        startDate,
        endDate,
      ),
      { key: 'trafficSources' },
    );
  }

  @Post('ga/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync GA4 analytics data for last 30 days' })
  async syncGAAnalytics(
    @CurrentUser('id') userId: string,
    @Query('propertyId') propertyId: string,
  ) {
    return this.googleAnalyticsService.syncAnalytics(userId, propertyId);
  }
}
