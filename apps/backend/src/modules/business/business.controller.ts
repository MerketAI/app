import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
import { BusinessService } from './business.service';
import {
  UpdateBusinessProfileDto,
  CreateProductDto,
  UpdateProductDto,
  CreateServiceDto,
  UpdateServiceDto,
  CreateCompetitorDto,
  UpdateCompetitorDto,
  CreateTargetAudienceDto,
  UpdateTargetAudienceDto,
} from './dto/business.dto';

@ApiTags('Business')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'business', version: '1' })
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  // ============================================
  // Business Profile
  // ============================================

  @Get('profile')
  @ApiOperation({ summary: 'Get business profile with all related data' })
  @ApiResponse({ status: 200, description: 'Business profile data' })
  async getBusinessProfile(@CurrentUser('id') userId: string) {
    return this.businessService.getBusinessProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update business profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateBusinessProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBusinessProfileDto,
  ) {
    return this.businessService.updateBusinessProfile(userId, dto);
  }

  // ============================================
  // Products
  // ============================================

  @Get('products')
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'List of products' })
  async getProducts(@CurrentUser('id') userId: string) {
    return this.businessService.getProducts(userId);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(
    @CurrentUser('id') userId: string,
    @Param('id') productId: string,
  ) {
    return this.businessService.getProduct(userId, productId);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create new product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async createProduct(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.businessService.createProduct(userId, dto);
  }

  @Put('products/:id')
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateProduct(
    @CurrentUser('id') userId: string,
    @Param('id') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.businessService.updateProduct(userId, productId, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete product' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async deleteProduct(
    @CurrentUser('id') userId: string,
    @Param('id') productId: string,
  ) {
    return this.businessService.deleteProduct(userId, productId);
  }

  // ============================================
  // Services
  // ============================================

  @Get('services')
  @ApiOperation({ summary: 'Get all services' })
  @ApiResponse({ status: 200, description: 'List of services' })
  async getServices(@CurrentUser('id') userId: string) {
    return this.businessService.getServices(userId);
  }

  @Get('services/:id')
  @ApiOperation({ summary: 'Get service by ID' })
  @ApiResponse({ status: 200, description: 'Service details' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getService(
    @CurrentUser('id') userId: string,
    @Param('id') serviceId: string,
  ) {
    return this.businessService.getService(userId, serviceId);
  }

  @Post('services')
  @ApiOperation({ summary: 'Create new service' })
  @ApiResponse({ status: 201, description: 'Service created' })
  async createService(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateServiceDto,
  ) {
    return this.businessService.createService(userId, dto);
  }

  @Put('services/:id')
  @ApiOperation({ summary: 'Update service' })
  @ApiResponse({ status: 200, description: 'Service updated' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async updateService(
    @CurrentUser('id') userId: string,
    @Param('id') serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.businessService.updateService(userId, serviceId, dto);
  }

  @Delete('services/:id')
  @ApiOperation({ summary: 'Delete service' })
  @ApiResponse({ status: 200, description: 'Service deleted' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async deleteService(
    @CurrentUser('id') userId: string,
    @Param('id') serviceId: string,
  ) {
    return this.businessService.deleteService(userId, serviceId);
  }

  // ============================================
  // Competitors
  // ============================================

  @Get('competitors')
  @ApiOperation({ summary: 'Get all competitors' })
  @ApiResponse({ status: 200, description: 'List of competitors' })
  async getCompetitors(@CurrentUser('id') userId: string) {
    return this.businessService.getCompetitors(userId);
  }

  @Get('competitors/:id')
  @ApiOperation({ summary: 'Get competitor by ID' })
  @ApiResponse({ status: 200, description: 'Competitor details' })
  @ApiResponse({ status: 404, description: 'Competitor not found' })
  async getCompetitor(
    @CurrentUser('id') userId: string,
    @Param('id') competitorId: string,
  ) {
    return this.businessService.getCompetitor(userId, competitorId);
  }

  @Post('competitors')
  @ApiOperation({ summary: 'Create new competitor' })
  @ApiResponse({ status: 201, description: 'Competitor created' })
  async createCompetitor(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCompetitorDto,
  ) {
    return this.businessService.createCompetitor(userId, dto);
  }

  @Put('competitors/:id')
  @ApiOperation({ summary: 'Update competitor' })
  @ApiResponse({ status: 200, description: 'Competitor updated' })
  @ApiResponse({ status: 404, description: 'Competitor not found' })
  async updateCompetitor(
    @CurrentUser('id') userId: string,
    @Param('id') competitorId: string,
    @Body() dto: UpdateCompetitorDto,
  ) {
    return this.businessService.updateCompetitor(userId, competitorId, dto);
  }

  @Delete('competitors/:id')
  @ApiOperation({ summary: 'Delete competitor' })
  @ApiResponse({ status: 200, description: 'Competitor deleted' })
  @ApiResponse({ status: 404, description: 'Competitor not found' })
  async deleteCompetitor(
    @CurrentUser('id') userId: string,
    @Param('id') competitorId: string,
  ) {
    return this.businessService.deleteCompetitor(userId, competitorId);
  }

  // ============================================
  // Target Audiences
  // ============================================

  @Get('audiences')
  @ApiOperation({ summary: 'Get all target audiences' })
  @ApiResponse({ status: 200, description: 'List of target audiences' })
  async getTargetAudiences(@CurrentUser('id') userId: string) {
    return this.businessService.getTargetAudiences(userId);
  }

  @Get('audiences/:id')
  @ApiOperation({ summary: 'Get target audience by ID' })
  @ApiResponse({ status: 200, description: 'Target audience details' })
  @ApiResponse({ status: 404, description: 'Target audience not found' })
  async getTargetAudience(
    @CurrentUser('id') userId: string,
    @Param('id') audienceId: string,
  ) {
    return this.businessService.getTargetAudience(userId, audienceId);
  }

  @Post('audiences')
  @ApiOperation({ summary: 'Create new target audience' })
  @ApiResponse({ status: 201, description: 'Target audience created' })
  async createTargetAudience(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTargetAudienceDto,
  ) {
    return this.businessService.createTargetAudience(userId, dto);
  }

  @Put('audiences/:id')
  @ApiOperation({ summary: 'Update target audience' })
  @ApiResponse({ status: 200, description: 'Target audience updated' })
  @ApiResponse({ status: 404, description: 'Target audience not found' })
  async updateTargetAudience(
    @CurrentUser('id') userId: string,
    @Param('id') audienceId: string,
    @Body() dto: UpdateTargetAudienceDto,
  ) {
    return this.businessService.updateTargetAudience(userId, audienceId, dto);
  }

  @Delete('audiences/:id')
  @ApiOperation({ summary: 'Delete target audience' })
  @ApiResponse({ status: 200, description: 'Target audience deleted' })
  @ApiResponse({ status: 404, description: 'Target audience not found' })
  async deleteTargetAudience(
    @CurrentUser('id') userId: string,
    @Param('id') audienceId: string,
  ) {
    return this.businessService.deleteTargetAudience(userId, audienceId);
  }
}
