import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiScraperService } from './ai-scraper.service';
import {
  FetchCompetitorDto,
  FetchProductsDto,
  FetchServicesDto,
  FetchAudiencesDto,
  FetchBrandDto,
  ScanBusinessUrlDto,
  CREDIT_COSTS,
} from './dto/scraper.dto';

@ApiTags('AI Scraper')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'ai-scraper', version: '1' })
export class AiScraperController {
  constructor(private aiScraperService: AiScraperService) {}

  @Get('providers')
  @ApiOperation({ summary: 'Get available AI providers' })
  @ApiResponse({ status: 200, description: 'List of available providers' })
  async getProviders(@CurrentUser('id') userId: string) {
    return this.aiScraperService.getAvailableProviders(userId);
  }

  @Get('credit-costs')
  @ApiOperation({ summary: 'Get credit costs for each operation' })
  @ApiResponse({ status: 200, description: 'Credit costs' })
  getCreditCosts() {
    return CREDIT_COSTS;
  }

  @Post('competitors')
  @ApiOperation({ summary: 'Fetch competitor data using AI' })
  @ApiResponse({ status: 200, description: 'Competitor data fetched' })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient credits' })
  async fetchCompetitor(
    @CurrentUser('id') userId: string,
    @Body() dto: FetchCompetitorDto,
  ) {
    return this.aiScraperService.fetchCompetitorData(userId, dto);
  }

  @Post('products')
  @ApiOperation({ summary: 'Fetch product suggestions using AI' })
  @ApiResponse({ status: 200, description: 'Product suggestions fetched' })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient credits' })
  async fetchProducts(
    @CurrentUser('id') userId: string,
    @Body() dto: FetchProductsDto,
  ) {
    return this.aiScraperService.fetchProductSuggestions(userId, dto);
  }

  @Post('services')
  @ApiOperation({ summary: 'Fetch service suggestions using AI' })
  @ApiResponse({ status: 200, description: 'Service suggestions fetched' })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient credits' })
  async fetchServices(
    @CurrentUser('id') userId: string,
    @Body() dto: FetchServicesDto,
  ) {
    return this.aiScraperService.fetchServiceSuggestions(userId, dto);
  }

  @Post('audiences')
  @ApiOperation({ summary: 'Fetch audience insights using AI' })
  @ApiResponse({ status: 200, description: 'Audience insights fetched' })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient credits' })
  async fetchAudiences(
    @CurrentUser('id') userId: string,
    @Body() dto: FetchAudiencesDto,
  ) {
    return this.aiScraperService.fetchAudienceInsights(userId, dto);
  }

  @Post('brand')
  @ApiOperation({ summary: 'Fetch brand suggestions using AI' })
  @ApiResponse({ status: 200, description: 'Brand suggestions fetched' })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient credits' })
  async fetchBrand(
    @CurrentUser('id') userId: string,
    @Body() dto: FetchBrandDto,
  ) {
    return this.aiScraperService.fetchBrandSuggestions(userId, dto);
  }

  @Post('scan')
  @ApiOperation({ summary: 'Scan a business URL to extract company information' })
  @ApiResponse({ status: 200, description: 'Business data scanned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient credits' })
  async scanBusinessUrl(
    @CurrentUser('id') userId: string,
    @Body() dto: ScanBusinessUrlDto,
  ) {
    return this.aiScraperService.scanBusinessUrl(userId, dto);
  }
}
