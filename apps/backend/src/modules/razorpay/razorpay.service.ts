import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import {
  CreateOrderDto,
  VerifyPaymentDto,
  CreateSubscriptionDto,
  BillingCycle,
} from './dto/razorpay.dto';

// Razorpay types
interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

interface RazorpayPlan {
  id: string;
  entity: string;
  interval: number;
  period: string;
  item: {
    id: string;
    name: string;
    amount: number;
    currency: string;
  };
}

interface RazorpaySubscription {
  id: string;
  entity: string;
  plan_id: string;
  status: string;
  current_start: number;
  current_end: number;
  short_url: string;
  customer_id?: string;
}

@Injectable()
export class RazorpayService {
  private razorpay: any;

  constructor(
    private prisma: PrismaService,
    private credentialsService: CredentialsService,
  ) {}

  private async getRazorpayInstance() {
    if (!this.razorpay) {
      const keyId = await this.credentialsService.get('RAZORPAY_KEY_ID');
      const keySecret = await this.credentialsService.get('RAZORPAY_KEY_SECRET');

      if (!keyId || !keySecret) {
        throw new InternalServerErrorException(
          'Razorpay credentials not configured. Please configure them in the admin panel.',
        );
      }

      const Razorpay = require('razorpay');
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }
    return this.razorpay;
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get plan from database
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { name: dto.plan },
    });

    if (!plan) {
      throw new BadRequestException('Invalid plan');
    }

    const amount = dto.billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;
    if (amount === 0) {
      throw new BadRequestException('Cannot create payment for free tier');
    }

    const razorpay = await this.getRazorpayInstance();
    const keyId = await this.credentialsService.get('RAZORPAY_KEY_ID');

    // Create Razorpay order
    const options = {
      amount: amount, // Amount in paise
      currency: 'INR',
      receipt: `order_${userId}_${Date.now()}`,
      notes: {
        userId: userId,
        plan: dto.plan,
        billingCycle: dto.billingCycle,
      },
    };

    const razorpayOrder: RazorpayOrder = await razorpay.orders.create(options);

    // Save payment record in database
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        subscriptionId: user.subscription?.id,
        razorpayOrderId: razorpayOrder.id,
        amount: amount,
        currency: 'INR',
        status: 'CREATED',
        planId: dto.plan,
        metadata: JSON.stringify({
          billingCycle: dto.billingCycle,
          credits: plan.credits,
        }),
      },
    });

    return {
      id: payment.id,
      razorpayOrderId: razorpayOrder.id,
      amount: amount,
      currency: 'INR',
      plan: dto.plan,
      billingCycle: dto.billingCycle,
      razorpayKeyId: keyId,
      prefill: {
        name: user.name,
        email: user.email || '',
        contact: user.phone || '',
      },
    };
  }

  async verifyPayment(userId: string, dto: VerifyPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId: dto.razorpay_order_id },
      include: { user: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.userId !== userId) {
      throw new BadRequestException('Payment does not belong to user');
    }

    if (payment.status === 'PAID') {
      throw new BadRequestException('Payment already verified');
    }

    // Verify signature
    const keySecret = await this.credentialsService.get('RAZORPAY_KEY_SECRET');
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${dto.razorpay_order_id}|${dto.razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== dto.razorpay_signature) {
      // Update payment as failed
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: 'Invalid payment signature',
        },
      });
      throw new BadRequestException('Invalid payment signature');
    }

    // Payment verified - update status and activate subscription
    const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
    const billingCycle = metadata.billingCycle as BillingCycle;

    // Get plan from database
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { name: payment.planId! },
    });

    if (!plan) {
      throw new BadRequestException('Plan not found');
    }

    // Calculate subscription period
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Use transaction to update payment and subscription
    const [updatedPayment, subscription] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId: dto.razorpay_payment_id,
          razorpaySignature: dto.razorpay_signature,
          status: 'PAID',
        },
      }),
      this.prisma.subscription.upsert({
        where: { userId },
        update: {
          tier: payment.planId!,
          status: 'ACTIVE',
          billingCycle: billingCycle,
          creditsTotal: plan.credits,
          creditsRemaining: plan.credits,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        create: {
          userId,
          tier: payment.planId!,
          status: 'ACTIVE',
          billingCycle: billingCycle,
          creditsTotal: plan.credits,
          creditsRemaining: plan.credits,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      }),
    ]);

    // Create credit transaction
    await this.prisma.creditTransaction.create({
      data: {
        userId,
        type: 'PURCHASE',
        amount: plan.credits,
        balance: plan.credits,
        description: `Purchased ${payment.planId} plan (${billingCycle})`,
        referenceId: payment.id,
      },
    });

    return {
      success: true,
      message: 'Payment verified and subscription activated',
      payment: {
        id: updatedPayment.id,
        amount: updatedPayment.amount / 100, // Convert to rupees
        status: updatedPayment.status,
      },
      subscription: {
        tier: subscription.tier,
        credits: subscription.creditsRemaining,
        expiresAt: subscription.currentPeriodEnd,
      },
    };
  }

  async handleWebhook(payload: any, signature: string) {
    const webhookSecret = await this.credentialsService.get('RAZORPAY_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new InternalServerErrorException('Webhook secret not configured');
    }

    // Verify webhook signature
    const generatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (generatedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = payload.event;
    const paymentData = payload.payload?.payment?.entity;

    switch (event) {
      case 'payment.captured':
        // Payment successful - this is a backup in case verify wasn't called
        if (paymentData?.order_id) {
          const payment = await this.prisma.payment.findUnique({
            where: { razorpayOrderId: paymentData.order_id },
          });

          if (payment && payment.status !== 'PAID') {
            await this.prisma.payment.update({
              where: { id: payment.id },
              data: {
                razorpayPaymentId: paymentData.id,
                status: 'PAID',
              },
            });
          }
        }
        break;

      case 'payment.failed':
        if (paymentData?.order_id) {
          await this.prisma.payment.updateMany({
            where: { razorpayOrderId: paymentData.order_id },
            data: {
              status: 'FAILED',
              failureReason: paymentData.error_description || 'Payment failed',
            },
          });
        }
        break;

      case 'refund.created':
        const refundData = payload.payload?.refund?.entity;
        if (refundData?.payment_id) {
          await this.prisma.payment.updateMany({
            where: { razorpayPaymentId: refundData.payment_id },
            data: { status: 'REFUNDED' },
          });
        }
        break;

      default:
        // Log unknown events
        console.log('Unhandled Razorpay webhook event:', event);
    }

    return { received: true };
  }

  async getPaymentHistory(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);

    return {
      payments: payments.map((p) => ({
        id: p.id,
        orderId: p.razorpayOrderId,
        paymentId: p.razorpayPaymentId,
        amount: p.amount / 100, // Convert to rupees
        currency: p.currency,
        status: p.status,
        plan: p.planId,
        createdAt: p.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map((plan) => ({
      id: plan.name,
      name: plan.displayName,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice / 100, // Convert paise to rupees
      yearlyPrice: plan.yearlyPrice / 100,
      yearlyDiscount: plan.yearlyDiscount,
      credits: plan.credits,
      features: JSON.parse(plan.features || '[]'),
      isDefault: plan.isDefault,
    }));
  }

  // =====================
  // Razorpay Recurring Subscriptions
  // =====================

  /**
   * Create a Razorpay Plan for recurring subscriptions
   * This should be called from admin when setting up a plan
   */
  async createRazorpayPlan(planId: string, billingCycle: BillingCycle) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const razorpay = await this.getRazorpayInstance();
    const amount = billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;

    if (amount === 0) {
      throw new BadRequestException('Cannot create Razorpay plan for free tier');
    }

    // Create Razorpay plan
    const razorpayPlan: RazorpayPlan = await razorpay.plans.create({
      period: billingCycle === 'YEARLY' ? 'yearly' : 'monthly',
      interval: 1,
      item: {
        name: `${plan.displayName} - ${billingCycle === 'YEARLY' ? 'Annual' : 'Monthly'}`,
        amount: amount,
        currency: 'INR',
        description: plan.description || `${plan.displayName} subscription`,
      },
    });

    // Update our plan with Razorpay plan ID
    const updateField = billingCycle === 'YEARLY'
      ? { razorpayYearlyPlanId: razorpayPlan.id }
      : { razorpayMonthlyPlanId: razorpayPlan.id };

    await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: updateField,
    });

    return {
      razorpayPlanId: razorpayPlan.id,
      billingCycle,
      amount: amount / 100,
      message: `Razorpay ${billingCycle.toLowerCase()} plan created successfully`,
    };
  }

  /**
   * Create a recurring subscription for a user
   * This uses Razorpay's Subscriptions API for automatic recurring payments
   */
  async createRecurringSubscription(userId: string, dto: CreateSubscriptionDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get plan from database
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { name: dto.planId },
    });

    if (!plan) {
      throw new BadRequestException('Invalid plan');
    }

    // Get the Razorpay plan ID based on billing cycle
    const razorpayPlanId = dto.billingCycle === 'YEARLY'
      ? plan.razorpayYearlyPlanId
      : plan.razorpayMonthlyPlanId;

    if (!razorpayPlanId) {
      throw new BadRequestException(
        `Razorpay ${dto.billingCycle.toLowerCase()} plan not configured. Please set it up in admin.`,
      );
    }

    const razorpay = await this.getRazorpayInstance();
    const keyId = await this.credentialsService.get('RAZORPAY_KEY_ID');

    // Create or get Razorpay customer
    let customerId = user.subscription?.razorpayCustomerId;

    if (!customerId) {
      const customer = await razorpay.customers.create({
        name: user.name,
        email: user.email || undefined,
        contact: user.phone || undefined,
        notes: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Update subscription with customer ID
      if (user.subscription) {
        await this.prisma.subscription.update({
          where: { id: user.subscription.id },
          data: { razorpayCustomerId: customerId },
        });
      }
    }

    // Create Razorpay subscription with auto-renewal
    const razorpaySubscription: RazorpaySubscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      customer_id: customerId,
      total_count: dto.billingCycle === 'YEARLY' ? 10 : 120, // 10 years or 10 years of monthly
      quantity: 1,
      customer_notify: 1, // Razorpay will notify customer
      notes: {
        userId: user.id,
        planName: plan.name,
        billingCycle: dto.billingCycle,
      },
    });

    // Update our subscription with Razorpay subscription ID
    await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        razorpaySubId: razorpaySubscription.id,
        razorpayCustomerId: customerId,
        tier: plan.name,
        billingCycle: dto.billingCycle,
        status: 'PENDING', // Will be updated to ACTIVE on payment
      },
      create: {
        userId,
        razorpaySubId: razorpaySubscription.id,
        razorpayCustomerId: customerId,
        tier: plan.name,
        billingCycle: dto.billingCycle,
        status: 'PENDING',
        creditsTotal: plan.credits,
        creditsRemaining: plan.credits,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + (dto.billingCycle === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000),
      },
    });

    const amount = dto.billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;

    return {
      subscriptionId: razorpaySubscription.id,
      shortUrl: razorpaySubscription.short_url,
      status: razorpaySubscription.status,
      plan: plan.name,
      billingCycle: dto.billingCycle,
      amount: amount / 100,
      razorpayKeyId: keyId,
    };
  }

  /**
   * Cancel a recurring subscription
   */
  async cancelRecurringSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || !subscription.razorpaySubId) {
      throw new NotFoundException('No active subscription found');
    }

    const razorpay = await this.getRazorpayInstance();

    // Cancel the Razorpay subscription
    await razorpay.subscriptions.cancel(subscription.razorpaySubId);

    // Update our subscription
    await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELLED',
        canceledAt: new Date(),
      },
    });

    return {
      message: 'Subscription cancelled successfully. You will continue to have access until the end of your billing period.',
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }

  /**
   * Handle subscription-related webhooks from Razorpay
   */
  async handleSubscriptionWebhook(event: string, payload: any) {
    const subscriptionData = payload.payload?.subscription?.entity;

    switch (event) {
      case 'subscription.authenticated':
        // Customer authorized the subscription
        console.log('Subscription authenticated:', subscriptionData?.id);
        break;

      case 'subscription.activated':
        // Subscription is now active (first payment successful)
        if (subscriptionData?.notes?.userId) {
          await this.activateSubscription(subscriptionData);
        }
        break;

      case 'subscription.charged':
        // Recurring payment successful
        if (subscriptionData?.notes?.userId) {
          await this.handleRecurringPayment(subscriptionData);
        }
        break;

      case 'subscription.pending':
        // Payment pending
        if (subscriptionData?.notes?.userId) {
          await this.prisma.subscription.updateMany({
            where: { razorpaySubId: subscriptionData.id },
            data: { status: 'PENDING' },
          });
        }
        break;

      case 'subscription.halted':
      case 'subscription.cancelled':
        // Subscription stopped
        if (subscriptionData?.notes?.userId) {
          await this.prisma.subscription.updateMany({
            where: { razorpaySubId: subscriptionData.id },
            data: {
              status: event === 'subscription.cancelled' ? 'CANCELLED' : 'SUSPENDED',
              canceledAt: new Date(),
            },
          });
        }
        break;

      case 'subscription.completed':
        // Subscription completed all billing cycles
        if (subscriptionData?.notes?.userId) {
          await this.prisma.subscription.updateMany({
            where: { razorpaySubId: subscriptionData.id },
            data: { status: 'EXPIRED' },
          });
        }
        break;

      default:
        console.log('Unhandled subscription webhook event:', event);
    }
  }

  private async activateSubscription(subscriptionData: any) {
    const userId = subscriptionData.notes?.userId;
    const planName = subscriptionData.notes?.planName;
    const billingCycle = subscriptionData.notes?.billingCycle;

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { name: planName },
    });

    if (!plan) return;

    const now = new Date();
    const periodEnd = new Date(subscriptionData.current_end * 1000);

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'ACTIVE',
        tier: planName,
        billingCycle,
        creditsTotal: plan.credits,
        creditsRemaining: plan.credits,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    // Create credit transaction
    await this.prisma.creditTransaction.create({
      data: {
        userId,
        type: 'SUBSCRIPTION_START',
        amount: plan.credits,
        balance: plan.credits,
        description: `Subscription activated: ${plan.displayName} (${billingCycle})`,
        referenceId: subscriptionData.id,
      },
    });
  }

  private async handleRecurringPayment(subscriptionData: any) {
    const userId = subscriptionData.notes?.userId;
    const planName = subscriptionData.notes?.planName;
    const billingCycle = subscriptionData.notes?.billingCycle;

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { name: planName },
    });

    if (!plan) return;

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) return;

    const periodEnd = new Date(subscriptionData.current_end * 1000);
    const periodStart = new Date(subscriptionData.current_start * 1000);

    // Renew credits and extend period
    await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'ACTIVE',
        creditsTotal: plan.credits,
        creditsRemaining: subscription.creditsRemaining + plan.credits,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    // Record the renewal payment
    const amount = billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;

    await this.prisma.payment.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        razorpayOrderId: `sub_${subscriptionData.id}_${Date.now()}`,
        razorpayPaymentId: subscriptionData.payment_id,
        amount,
        currency: 'INR',
        status: 'PAID',
        planId: planName,
        metadata: JSON.stringify({
          billingCycle,
          type: 'recurring',
          credits: plan.credits,
        }),
      },
    });

    // Create credit transaction
    await this.prisma.creditTransaction.create({
      data: {
        userId,
        type: 'SUBSCRIPTION_RENEWAL',
        amount: plan.credits,
        balance: subscription.creditsRemaining + plan.credits,
        description: `Subscription renewed: ${plan.displayName} (${billingCycle})`,
        referenceId: subscriptionData.id,
      },
    });
  }
}
