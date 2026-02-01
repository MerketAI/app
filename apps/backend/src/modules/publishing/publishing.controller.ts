import {
  Controller,
  Post,
  Get,
  Param,
  Body,
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
import { PublishingService } from './publishing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('publishing')
@Controller({ path: 'publishing', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PublishingController {
  constructor(private publishingService: PublishingService) {}

  @Post(':contentId/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish content immediately' })
  async publishNow(
    @CurrentUser('id') userId: string,
    @Param('contentId') contentId: string,
    @Body('connectionId') connectionId?: string,
  ) {
    return this.publishingService.publishNow(userId, contentId, connectionId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get publishing history' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.publishingService.getPublishingHistory(userId, limit, offset);
  }

  @Post('process-scheduled')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process scheduled content (internal/cron)' })
  async processScheduled() {
    return this.publishingService.processScheduledContent();
  }
}
