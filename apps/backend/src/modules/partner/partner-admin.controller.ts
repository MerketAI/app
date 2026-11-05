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
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PartnerService } from './partner.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import {
  CreatePartnerAppDto,
  UpdatePartnerAppDto,
} from './dto/partner.dto';

/** Internal administration of partner applications. Requires ADMIN role. */
@ApiTags('admin')
@ApiBearerAuth()
@Controller({ path: 'admin/partner-apps', version: '1' })
@UseGuards(AdminGuard)
export class PartnerAdminController {
  constructor(private partnerService: PartnerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Onboard a partner platform',
    description:
      'Returns APP_KEY and APP_SECRET. The secret is shown once and stored hashed.',
  })
  async createApp(@Body() dto: CreatePartnerAppDto) {
    return this.partnerService.createApp(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List partner applications' })
  async listApps() {
    return this.partnerService.listApps();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one partner application' })
  async getApp(@Param('id') id: string) {
    return this.partnerService.getApp(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update limits, scopes or status' })
  async updateApp(@Param('id') id: string, @Body() dto: UpdatePartnerAppDto) {
    return this.partnerService.updateApp(id, dto);
  }

  @Post(':id/rotate-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Issue a new APP_SECRET',
    description: 'The previous secret stops working immediately.',
  })
  @ApiResponse({ status: 200, description: 'New secret, shown once' })
  async rotateSecret(@Param('id') id: string) {
    return this.partnerService.rotateSecret(id);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an application permanently' })
  async revokeApp(@Param('id') id: string) {
    return this.partnerService.revokeApp(id);
  }

  @Get(':id/subscribers')
  @ApiOperation({ summary: "List an application's subscribers" })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listSubscribers(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.partnerService.listSubscribers(
      id,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'API usage for an application' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async usage(@Param('id') id: string, @Query('days') days?: number) {
    const window = days ? Number(days) : 7;
    return this.partnerService.getUsage(
      id,
      new Date(Date.now() - window * 24 * 60 * 60 * 1000),
    );
  }
}
