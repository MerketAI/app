import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';

export const SubscriptionPlan = {
  STARTER: 'STARTER',
  PROFESSIONAL: 'PROFESSIONAL',
  BUSINESS: 'BUSINESS',
  ENTERPRISE: 'ENTERPRISE',
} as const;
export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

export const BillingCycle = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const;
export type BillingCycle = (typeof BillingCycle)[keyof typeof BillingCycle];

// Pricing in INR (paise)
export const PLAN_PRICES = {
  STARTER: {
    MONTHLY: 0, // Free tier
    YEARLY: 0,
    credits: 100,
  },
  PROFESSIONAL: {
    MONTHLY: 99900, // Rs 999/month
    YEARLY: 999900, // Rs 9999/year (2 months free)
    credits: 500,
  },
  BUSINESS: {
    MONTHLY: 299900, // Rs 2999/month
    YEARLY: 2999900, // Rs 29999/year
    credits: 2000,
  },
  ENTERPRISE: {
    MONTHLY: 999900, // Rs 9999/month
    YEARLY: 9999900, // Rs 99999/year
    credits: 10000,
  },
} as const;

export class CreateOrderDto {
  @ApiProperty({ enum: SubscriptionPlan, example: 'PROFESSIONAL' })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiProperty({ enum: BillingCycle, example: 'MONTHLY' })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;
}

export class VerifyPaymentDto {
  @ApiProperty({ example: 'order_xxx' })
  @IsString()
  razorpay_order_id: string;

  @ApiProperty({ example: 'pay_xxx' })
  @IsString()
  razorpay_payment_id: string;

  @ApiProperty({ example: 'signature_xxx' })
  @IsString()
  razorpay_signature: string;
}

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  razorpayOrderId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  plan: string;

  @ApiProperty()
  billingCycle: string;

  @ApiProperty()
  razorpayKeyId: string;

  @ApiProperty()
  prefill: {
    name: string;
    email: string;
    contact?: string;
  };
}

export class PaymentHistoryQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['CREATED', 'PAID', 'FAILED', 'REFUNDED'] })
  @IsOptional()
  @IsString()
  status?: string;
}

// Razorpay Subscription DTOs
export class CreateRazorpayPlanDto {
  @ApiProperty({ example: 'plan_xxx' })
  @IsString()
  planId: string; // Our internal plan ID

  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;
}

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'plan_xxx' })
  @IsString()
  planId: string; // Our internal plan ID

  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;
}

export class SubscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  razorpaySubscriptionId: string;

  @ApiProperty()
  shortUrl: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  plan: string;

  @ApiProperty()
  billingCycle: string;
}
