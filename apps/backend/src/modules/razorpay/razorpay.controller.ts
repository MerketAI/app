import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RazorpayService } from './razorpay.service';
import {
  CreateOrderDto,
  VerifyPaymentDto,
  PaymentHistoryQueryDto,
  CreateSubscriptionDto,
  CreateRazorpayPlanDto,
} from './dto/razorpay.dto';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Payments')
@Controller({ path: 'payments', version: '1' })
export class RazorpayController {
  constructor(private razorpayService: RazorpayService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  @ApiResponse({ status: 200, description: 'List of plans with pricing' })
  async getPlans() {
    return this.razorpayService.getPlans();
  }

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Razorpay order for subscription' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid plan or billing cycle' })
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.razorpayService.createOrder(userId, dto);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify payment and activate subscription' })
  @ApiResponse({ status: 200, description: 'Payment verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payment signature' })
  async verifyPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.razorpayService.verifyPayment(userId, dto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Razorpay webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() payload: any,
  ) {
    // Handle subscription webhooks separately
    const event = payload.event;
    if (event?.startsWith('subscription.')) {
      return this.razorpayService.handleSubscriptionWebhook(event, payload);
    }
    return this.razorpayService.handleWebhook(payload, signature);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history for current user' })
  @ApiResponse({ status: 200, description: 'Payment history' })
  async getPaymentHistory(
    @CurrentUser('id') userId: string,
    @Query() query: PaymentHistoryQueryDto,
  ) {
    return this.razorpayService.getPaymentHistory(
      userId,
      query.page,
      query.limit,
    );
  }

  // =====================
  // Recurring Subscription Endpoints
  // =====================

  @Post('subscriptions/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a recurring subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  @ApiResponse({ status: 400, description: 'Invalid plan or billing cycle' })
  async createSubscription(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.razorpayService.createRecurringSubscription(userId, dto);
  }

  @Post('subscriptions/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel recurring subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  @ApiResponse({ status: 404, description: 'No active subscription found' })
  async cancelSubscription(@CurrentUser('id') userId: string) {
    return this.razorpayService.cancelRecurringSubscription(userId);
  }

  // =====================
  // Admin-only Endpoints
  // =====================

  @Post('admin/create-razorpay-plan')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Razorpay plan for recurring subscriptions (Admin only)' })
  @ApiResponse({ status: 201, description: 'Razorpay plan created' })
  @ApiResponse({ status: 400, description: 'Invalid plan or free tier' })
  async createRazorpayPlan(@Body() dto: CreateRazorpayPlanDto) {
    return this.razorpayService.createRazorpayPlan(dto.planId, dto.billingCycle);
  }
}
