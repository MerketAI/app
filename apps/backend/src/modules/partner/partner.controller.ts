import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
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
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { PartnerService } from './partner.service';
import { PartnerAppGuard } from './guards/partner-app.guard';
import { CurrentApp } from './decorators/current-app.decorator';
import {
  ProvisionSubscriberDto,
  UpdateSubscriberStatusDto,
} from './dto/partner.dto';

/**
 * Partner-facing API. Authenticated with APP_KEY + APP_SECRET only - these
 * routes act on the application itself, so no APP_UID is required.
 */
@ApiTags('partner')
@ApiHeader({
  name: 'X-App-Key',
  required: true,
  description: 'Your application key, e.g. U877666FX667777Z566-dhdhhdhhdhdhd',
})
@ApiHeader({
  name: 'X-App-Secret',
  required: true,
  description: 'Your system-generated application secret.',
})
@Controller({ path: 'partner', version: '1' })
@UseGuards(PartnerAppGuard)
export class PartnerController {
  constructor(private partnerService: PartnerService) {}

  @Get('me')
  @ApiOperation({ summary: 'Details and limits for the calling application' })
  async me(@CurrentApp('id') appId: string) {
    return this.partnerService.getApp(appId);
  }

  @Get('usage')
  @ApiOperation({ summary: 'API usage for the calling application' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async usage(@CurrentApp('id') appId: string, @Query('days') days?: number) {
    const window = days ? Number(days) : 7;
    const since = new Date(Date.now() - window * 24 * 60 * 60 * 1000);
    return this.partnerService.getUsage(appId, since);
  }

  @Post('subscribers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register one of your subscribers',
    description:
      'Optional when auto-provisioning is enabled - an unknown APP_UID is then created on first use. Call this when you want to set a name, email or metadata up front.',
  })
  @ApiResponse({ status: 409, description: 'APP_UID already registered' })
  async registerSubscriber(
    @CurrentApp('id') appId: string,
    @Body() dto: ProvisionSubscriberDto,
  ) {
    return this.partnerService.registerSubscriber(appId, dto);
  }

  @Get('subscribers')
  @ApiOperation({ summary: 'List your subscribers' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listSubscribers(
    @CurrentApp('id') appId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.partnerService.listSubscribers(
      appId,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );
  }

  @Get('subscribers/:appUid')
  @ApiOperation({ summary: 'Look up one subscriber by your APP_UID' })
  async getSubscriber(
    @CurrentApp('id') appId: string,
    @Param('appUid') appUid: string,
  ) {
    return this.partnerService.getSubscriber(appId, appUid);
  }

  @Patch('subscribers/:appUid/status')
  @ApiOperation({ summary: 'Suspend or reactivate a subscriber' })
  async setSubscriberStatus(
    @CurrentApp('id') appId: string,
    @Param('appUid') appUid: string,
    @Body() dto: UpdateSubscriberStatusDto,
  ) {
    return this.partnerService.setSubscriberStatus(appId, appUid, dto.status);
  }
}
