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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('analytics')
@Controller({ path: 'analytics', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

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
}
