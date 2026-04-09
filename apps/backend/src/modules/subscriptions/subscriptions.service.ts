import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  TIER_CREDITS,
  TIER_PRICES,
} from './dto/subscription.dto';
// Using string values instead of Prisma enums for SQLite compatibility
const TransactionType = {
  CREDIT_PURCHASE: 'CREDIT_PURCHASE',
  CREDIT_USAGE: 'CREDIT_USAGE',
  CREDIT_ROLLOVER: 'CREDIT_ROLLOVER',
  CREDIT_REFUND: 'CREDIT_REFUND',
  CREDIT_BONUS: 'CREDIT_BONUS',
} as const;
import Stripe from 'stripe';

export interface CreditAction {
  type: string;
  credits: number;
}

export const CREDIT_COSTS: Record<string, number> = {
  INSTAGRAM_IMAGE: 5,
  INSTAGRAM_CAROUSEL: 8,
  INSTAGRAM_VIDEO: 15,
  FACEBOOK_IMAGE: 5,
  FACEBOOK_VIDEO: 15,
  FACEBOOK_LINK: 3,
  BLOG_POST_500: 10,
  BLOG_POST_1000: 20,
  AD_CAMPAIGN: 25,
  AD_CAMPAIGN_CREATE: 25,
  AD_CAMPAIGN_OPTIMIZE: 10,
  TREND_ANALYSIS: 10,
  EMAIL_CAMPAIGN: 15,
  EMAIL_SEQUENCE: 20,
  DESIGN_GENERATE: 10,
  DESIGN_RENDER: 5,
  VIDEO_GENERATE: 30,
  VIDEO_THUMBNAIL: 5,
  LINKEDIN_POST: 5,
  TIKTOK_POST: 5,
};

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    }
  }

  async getSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async createSubscription(userId: string, dto: CreateSubscriptionDto) {
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (existingSubscription) {
      throw new BadRequestException('User already has a subscription');
    }

    const credits = TIER_CREDITS[dto.tier];
    const periodDays = dto.billingCycle === 'ANNUAL' ? 365 : 30;

    return this.prisma.subscription.create({
      data: {
        userId,
        tier: dto.tier,
        billingCycle: dto.billingCycle,
        creditsTotal: credits,
        creditsRemaining: credits,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
      },
    });
  }

  async updateSubscription(userId: string, dto: UpdateSubscriptionDto) {
    const subscription = await this.getSubscription(userId);

    const updateData: any = {};

    if (dto.tier && dto.tier !== subscription.tier) {
      updateData.tier = dto.tier;
      updateData.creditsTotal = TIER_CREDITS[dto.tier];

      // On upgrade, add difference in credits
      if (TIER_CREDITS[dto.tier] > subscription.creditsTotal) {
        const creditDiff = TIER_CREDITS[dto.tier] - subscription.creditsTotal;
        updateData.creditsRemaining = subscription.creditsRemaining + creditDiff;
      }
    }

    if (dto.billingCycle) {
      updateData.billingCycle = dto.billingCycle;
    }

    return this.prisma.subscription.update({
      where: { userId },
      data: updateData,
    });
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.getSubscription(userId);

    if (subscription.stripeSubscriptionId && this.stripe) {
      await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    }

    return this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });
  }

  async getCredits(userId: string) {
    const subscription = await this.getSubscription(userId);

    return {
      total: subscription.creditsTotal,
      remaining: subscription.creditsRemaining,
      used: subscription.creditsTotal - subscription.creditsRemaining,
      rollover: subscription.creditsRollover,
    };
  }

  async consumeCredits(userId: string, action: string, referenceId?: string) {
    const credits = CREDIT_COSTS[action];
    if (!credits) {
      throw new BadRequestException(`Unknown action: ${action}`);
    }

    const subscription = await this.getSubscription(userId);

    if (subscription.creditsRemaining < credits) {
      throw new BadRequestException('Insufficient credits');
    }

    // Update credits and create transaction
    const [updatedSubscription] = await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { userId },
        data: {
          creditsRemaining: subscription.creditsRemaining - credits,
        },
      }),
      this.prisma.creditTransaction.create({
        data: {
          userId,
          type: TransactionType.CREDIT_USAGE,
          amount: -credits,
          balance: subscription.creditsRemaining - credits,
          description: `${action} content generation`,
          referenceId,
        },
      }),
    ]);

    return updatedSubscription;
  }

  async refundCredits(userId: string, credits: number, reason: string) {
    const subscription = await this.getSubscription(userId);

    const [updatedSubscription] = await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { userId },
        data: {
          creditsRemaining: subscription.creditsRemaining + credits,
        },
      }),
      this.prisma.creditTransaction.create({
        data: {
          userId,
          type: TransactionType.CREDIT_REFUND,
          amount: credits,
          balance: subscription.creditsRemaining + credits,
          description: reason,
        },
      }),
    ]);

    return updatedSubscription;
  }

  async getCreditHistory(userId: string, limit = 50, offset = 0) {
    const [transactions, total] = await Promise.all([
      this.prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.creditTransaction.count({ where: { userId } }),
    ]);

    return {
      transactions,
      total,
      limit,
      offset,
    };
  }

  async processRollover() {
    // Get all active subscriptions where period has ended
    const expiredSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: { lte: new Date() },
      },
    });

    for (const subscription of expiredSubscriptions) {
      // Calculate rollover (max 50% of unused credits, capped at 1 month allocation)
      const maxRollover = Math.min(
        Math.floor(subscription.creditsRemaining * 0.5),
        subscription.creditsTotal,
      );

      const periodDays = subscription.billingCycle === 'ANNUAL' ? 365 : 30;
      const newPeriodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

      await this.prisma.$transaction([
        this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            creditsRemaining: subscription.creditsTotal + maxRollover,
            creditsRollover: maxRollover,
            currentPeriodStart: new Date(),
            currentPeriodEnd: newPeriodEnd,
          },
        }),
        this.prisma.creditTransaction.create({
          data: {
            userId: subscription.userId,
            type: TransactionType.CREDIT_ROLLOVER,
            amount: maxRollover,
            balance: subscription.creditsTotal + maxRollover,
            description: `Credit rollover from previous period`,
          },
        }),
      ]);
    }

    return { processed: expiredSubscriptions.length };
  }

  // Stripe Webhook handlers
  async handleStripeWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  }

  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSubscription.id },
      data: {
        status: stripeSubscription.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
      },
    });
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSubscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          creditsRemaining: subscription.creditsTotal + subscription.creditsRollover,
        },
      });
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: 'PAST_DUE' },
    });
  }

  // Public plans endpoint
  async getPublicPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice / 100, // Convert cents to dollars
      yearlyPrice: plan.yearlyPrice / 100,
      yearlyDiscount: plan.yearlyDiscount,
      credits: plan.credits,
      features: JSON.parse(plan.features || '[]'),
      isDefault: plan.isDefault,
      isPopular: plan.name === 'PROFESSIONAL', // Mark Professional as popular
    }));
  }
}
