import {
  Controller,
  Get,
  Post,
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
import { TrendsService } from './trends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('trends')
@Controller({ path: 'trends', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TrendsController {
  constructor(private trendsService: TrendsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current trending topics' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'region', required: false, description: 'Filter by region' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results', type: Number })
  @ApiResponse({ status: 200, description: 'List of trending topics' })
  async getTrends(
    @Query('category') category?: string,
    @Query('region') region?: string,
    @Query('limit') limit?: number,
  ) {
    return this.trendsService.getTrends({
      category,
      region,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('industry')
  @ApiOperation({ summary: 'Get industry-specific trends based on user profile' })
  @ApiResponse({ status: 200, description: 'Industry-specific trending topics' })
  async getIndustryTrends(@CurrentUser('id') userId: string) {
    return this.trendsService.getIndustryTrends(userId);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get AI content suggestions based on trends' })
  @ApiResponse({ status: 200, description: 'Content suggestions based on trending topics' })
  async getContentSuggestions(@CurrentUser('id') userId: string) {
    return this.trendsService.getContentSuggestions(userId);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force refresh trends cache' })
  @ApiResponse({ status: 200, description: 'Trends synced successfully' })
  async syncTrends() {
    return this.trendsService.syncTrends();
  }
}
