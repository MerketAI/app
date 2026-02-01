import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsEmail,
} from 'class-validator';

export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export class UserListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: ['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'] })
  @IsOptional()
  @IsString()
  tier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  creditsRemaining?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  creditsTotal?: number;
}

export class CreateAdminDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty()
  @IsString()
  name: string;
}

// Plan Management DTOs
export class CreatePlanDto {
  @ApiProperty({ example: 'PROFESSIONAL' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Professional Plan' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ example: 'Best for growing businesses' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 99900, description: 'Monthly price in paise' })
  @IsInt()
  @Min(0)
  monthlyPrice: number;

  @ApiProperty({ example: 959000, description: 'Yearly price in paise' })
  @IsInt()
  @Min(0)
  yearlyPrice: number;

  @ApiPropertyOptional({ example: 20, description: 'Yearly discount percentage' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  yearlyDiscount?: number;

  @ApiProperty({ example: 500, description: 'Credits per billing cycle' })
  @IsInt()
  @Min(0)
  credits: number;

  @ApiPropertyOptional({ example: ['Feature 1', 'Feature 2'] })
  @IsOptional()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Professional Plan' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'Best for growing businesses' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 99900, description: 'Monthly price in paise' })
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyPrice?: number;

  @ApiPropertyOptional({ example: 959000, description: 'Yearly price in paise' })
  @IsOptional()
  @IsInt()
  @Min(0)
  yearlyPrice?: number;

  @ApiPropertyOptional({ example: 20, description: 'Yearly discount percentage' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  yearlyDiscount?: number;

  @ApiPropertyOptional({ example: 500, description: 'Credits per billing cycle' })
  @IsOptional()
  @IsInt()
  @Min(0)
  credits?: number;

  @ApiPropertyOptional({ example: ['Feature 1', 'Feature 2'] })
  @IsOptional()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Razorpay Plan ID for monthly billing' })
  @IsOptional()
  @IsString()
  razorpayMonthlyPlanId?: string;

  @ApiPropertyOptional({ description: 'Razorpay Plan ID for yearly billing' })
  @IsOptional()
  @IsString()
  razorpayYearlyPlanId?: string;
}
