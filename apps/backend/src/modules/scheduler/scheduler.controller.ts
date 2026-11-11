import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';
import { AdminGuard } from '../../common/guards/admin.guard';

/**
 * Manual triggers for the background jobs. Admin-only: these act across every
 * tenant, so they must never be reachable with an ordinary user token.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller({ path: 'admin/scheduler', version: '1' })
@UseGuards(AdminGuard)
export class SchedulerController {
  constructor(private schedulerService: SchedulerService) {}

  @Get('status')
  @ApiOperation({ summary: 'Registered background jobs and their state' })
  getStatus() {
    return this.schedulerService.getStatus();
  }

  @Post('run/publish-scheduled')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run the scheduled-publishing job now' })
  async runPublishScheduled() {
    await this.schedulerService.publishScheduledContent();
    return { triggered: 'publish-scheduled-content' };
  }

  @Post('run/sync-analytics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run the analytics sync job now' })
  async runSyncAnalytics() {
    await this.schedulerService.syncContentAnalytics();
    return { triggered: 'sync-content-analytics' };
  }

  @Post('run/sync-trends')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run the trends sync job now' })
  async runSyncTrends() {
    await this.schedulerService.syncTrends();
    return { triggered: 'sync-trends' };
  }
}
