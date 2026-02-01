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
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import {
  UserListQueryDto,
  UpdateUserDto,
  UpdateSubscriptionDto,
  CreateAdminDto,
  CreatePlanDto,
  UpdatePlanDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async getUsers(@Query() query: UserListQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    const oldUser = await this.adminService.getUserById(id);
    const result = await this.adminService.updateUser(id, dto);

    // Log audit
    await this.adminService.logAuditAction(
      adminId,
      'UPDATE_USER',
      'User',
      id,
      { status: oldUser.status, role: oldUser.role },
      dto,
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }

  @Put('users/:id/subscription')
  @ApiOperation({ summary: 'Update user subscription' })
  @ApiResponse({ status: 200, description: 'Subscription updated' })
  @ApiResponse({ status: 404, description: 'User or subscription not found' })
  async updateUserSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    const result = await this.adminService.updateUserSubscription(id, dto);

    await this.adminService.logAuditAction(
      adminId,
      'UPDATE_SUBSCRIPTION',
      'Subscription',
      result.id,
      null,
      dto,
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    const user = await this.adminService.getUserById(id);
    const result = await this.adminService.deleteUser(id);

    await this.adminService.logAuditAction(
      adminId,
      'DELETE_USER',
      'User',
      id,
      { email: user.email, name: user.name },
      null,
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }

  @Post('users/admin')
  @ApiOperation({ summary: 'Create new admin user' })
  @ApiResponse({ status: 201, description: 'Admin created' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async createAdmin(
    @Body() dto: CreateAdminDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    const result = await this.adminService.createAdmin(dto);

    await this.adminService.logAuditAction(
      adminId,
      'CREATE_ADMIN',
      'User',
      result.id,
      null,
      { email: result.email, name: result.name },
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'List of payments' })
  async getPayments(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    return this.adminService.getPayments({ page, limit, status, userId });
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
  ) {
    return this.adminService.getAuditLogs({ page, limit, entityType, userId });
  }

  // =====================
  // Plan Management
  // =====================

  @Get('plans')
  @ApiOperation({ summary: 'Get all subscription plans' })
  @ApiResponse({ status: 200, description: 'List of subscription plans' })
  async getPlans() {
    return this.adminService.getPlans();
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiResponse({ status: 200, description: 'Plan details' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlanById(@Param('id') id: string) {
    return this.adminService.getPlanById(id);
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create new subscription plan' })
  @ApiResponse({ status: 201, description: 'Plan created' })
  @ApiResponse({ status: 409, description: 'Plan name already exists' })
  async createPlan(
    @Body() dto: CreatePlanDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    const result = await this.adminService.createPlan(dto);

    await this.adminService.logAuditAction(
      adminId,
      'CREATE_PLAN',
      'SubscriptionPlan',
      result.id,
      null,
      { name: result.name, displayName: result.displayName },
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'Update subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan updated' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    const oldPlan = await this.adminService.getPlanById(id);
    const result = await this.adminService.updatePlan(id, dto);

    await this.adminService.logAuditAction(
      adminId,
      'UPDATE_PLAN',
      'SubscriptionPlan',
      id,
      { monthlyPrice: oldPlan.monthlyPrice, yearlyPrice: oldPlan.yearlyPrice },
      dto,
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Delete subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan deleted' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @ApiResponse({ status: 409, description: 'Plan has active subscriptions' })
  async deletePlan(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    const plan = await this.adminService.getPlanById(id);
    const result = await this.adminService.deletePlan(id);

    await this.adminService.logAuditAction(
      adminId,
      'DELETE_PLAN',
      'SubscriptionPlan',
      id,
      { name: plan.name, displayName: plan.displayName },
      null,
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }

  @Post('plans/seed')
  @ApiOperation({ summary: 'Seed default subscription plans' })
  @ApiResponse({ status: 201, description: 'Plans seeded' })
  async seedPlans(
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    const result = await this.adminService.seedDefaultPlans();

    await this.adminService.logAuditAction(
      adminId,
      'SEED_PLANS',
      'SubscriptionPlan',
      null,
      null,
      result,
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }
}
