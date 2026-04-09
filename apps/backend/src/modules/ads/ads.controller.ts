import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
} from '@nestjs/swagger';
import { AdsService } from './ads.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignFilterDto,
} from './dto/ads.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('ads')
@Controller({ path: 'ads', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdsController {
  constructor(private adsService: AdsService) {}

  @Get('campaigns')
  @ApiOperation({ summary: 'List ad campaigns with filters' })
  async getCampaigns(
    @CurrentUser('id') userId: string,
    @Query() filters: CampaignFilterDto,
  ) {
    return this.adsService.getCampaigns(userId, filters);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get AI optimization suggestions for campaigns' })
  async getSuggestions(@CurrentUser('id') userId: string) {
    return this.adsService.getSuggestions(userId);
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign details with metrics' })
  async getCampaignById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.adsService.getCampaignById(userId, id);
  }

  @Post('campaigns')
  @ApiOperation({ summary: 'Create a new campaign draft' })
  async createCampaign(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.adsService.createCampaign(userId, dto);
  }

  @Put('campaigns/:id')
  @ApiOperation({ summary: 'Update a campaign' })
  async updateCampaign(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.adsService.updateCampaign(userId, id, dto);
  }

  @Post('campaigns/:id/launch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Launch campaign to Google/Meta Ads platform' })
  async launchCampaign(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.adsService.launchCampaign(userId, id);
  }

  @Post('campaigns/:id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause an active campaign' })
  async pauseCampaign(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.adsService.pauseCampaign(userId, id);
  }

  @Post('campaigns/:id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a paused campaign' })
  async resumeCampaign(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.adsService.resumeCampaign(userId, id);
  }

  @Delete('campaigns/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft campaign' })
  async deleteCampaign(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.adsService.deleteCampaign(userId, id);
  }

  @Get('campaigns/:id/metrics')
  @ApiOperation({ summary: 'Get campaign performance metrics for a date range' })
  async getCampaignMetrics(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adsService.getCampaignMetrics(userId, id, startDate, endDate);
  }

  @Post('campaigns/:id/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync campaign metrics from the ad platform' })
  async syncMetrics(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.adsService.syncMetrics(userId, id);
  }
}
