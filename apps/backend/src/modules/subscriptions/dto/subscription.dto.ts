import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

// Define as string constants for SQLite compatibility
export const SubscriptionTier = {
  STARTER: 'STARTER',
  PROFESSIONAL: 'PROFESSIONAL',
  BUSINESS: 'BUSINESS',
  ENTERPRISE: 'ENTERPRISE',
} as const;
export type SubscriptionTier = typeof SubscriptionTier[keyof typeof SubscriptionTier];

export const BillingCycle = {
  MONTHLY: 'MONTHLY',
  ANNUAL: 'ANNUAL',
} as const;
export type BillingCycle = typeof BillingCycle[keyof typeof BillingCycle];

export class CreateSubscriptionDto {
  @ApiProperty({ enum: Object.values(SubscriptionTier) })
  @IsIn(Object.values(SubscriptionTier))
  tier: SubscriptionTier;

  @ApiProperty({ enum: Object.values(BillingCycle) })
  @IsIn(Object.values(BillingCycle))
  billingCycle: BillingCycle;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: Object.values(SubscriptionTier) })
  @IsOptional()
  @IsIn(Object.values(SubscriptionTier))
  tier?: SubscriptionTier;

  @ApiPropertyOptional({ enum: Object.values(BillingCycle) })
  @IsOptional()
  @IsIn(Object.values(BillingCycle))
  billingCycle?: BillingCycle;
}

export class SubscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: Object.values(SubscriptionTier) })
  tier: SubscriptionTier;

  @ApiProperty()
  creditsTotal: number;

  @ApiProperty()
  creditsRemaining: number;

  @ApiProperty()
  currentPeriodEnd: Date;
}

export const TIER_CREDITS: Record<string, number> = {
  STARTER: 100,
  PROFESSIONAL: 500,
  BUSINESS: 2000,
  ENTERPRISE: 10000,
};

export const TIER_PRICES: Record<string, { monthly: number; annual: number }> = {
  STARTER: { monthly: 0, annual: 0 },
  PROFESSIONAL: { monthly: 4900, annual: 49000 },
  BUSINESS: { monthly: 14900, annual: 149000 },
  ENTERPRISE: { monthly: 49900, annual: 499000 },
};
