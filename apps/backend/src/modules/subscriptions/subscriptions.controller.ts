import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
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
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService, CREDIT_COSTS } from './subscriptions.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  TIER_CREDITS,
  TIER_PRICES,
} from './dto/subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import Stripe from 'stripe';

@ApiTags('subscriptions')
@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {
  private stripe: Stripe;

  constructor(
    private subscriptionsService: SubscriptionsService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    }
  }

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'Get available subscription plans (public)' })
  async getPlans() {
    const plans = await this.subscriptionsService.getPublicPlans();
    return {
      plans,
      creditCosts: CREDIT_COSTS,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription' })
  async getSubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getSubscription(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create subscription' })
  async createSubscription(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.createSubscription(userId, dto);
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update subscription (upgrade/downgrade)' })
  async updateSubscription(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.updateSubscription(userId, dto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.cancelSubscription(userId);
  }

  @Get('credits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get credit balance' })
  async getCredits(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getCredits(userId);
  }

  @Get('credits/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get credit transaction history' })
  async getCreditHistory(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.subscriptionsService.getCreditHistory(userId, limit, offset);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!this.stripe) {
      return { received: false, error: 'Stripe not configured' };
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return { received: false, error: 'Webhook secret not configured' };
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        req.rawBody!,
        signature,
        webhookSecret,
      );

      await this.subscriptionsService.handleStripeWebhook(event);

      return { received: true };
    } catch (err) {
      return { received: false, error: (err as Error).message };
    }
  }
}
