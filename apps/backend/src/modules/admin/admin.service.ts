import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UserListQueryDto,
  UpdateUserDto,
  UpdateSubscriptionDto,
  CreateAdminDto,
  CreatePlanDto,
  UpdatePlanDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      totalSubscriptions,
      subscriptionsByTier,
      totalRevenue,
      revenueThisMonth,
      totalContent,
      publishedContent,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.subscription.count(),
      this.prisma.subscription.groupBy({
        by: ['tier'],
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: 'PAID',
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
      }),
      this.prisma.content.count(),
      this.prisma.content.count({ where: { status: 'PUBLISHED' } }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: newUsersThisMonth,
        newThisWeek: newUsersThisWeek,
      },
      subscriptions: {
        total: totalSubscriptions,
        byTier: subscriptionsByTier.map((s) => ({
          tier: s.tier,
          count: s._count,
        })),
      },
      revenue: {
        total: (totalRevenue._sum.amount || 0) / 100, // Convert paise to rupees
        thisMonth: (revenueThisMonth._sum.amount || 0) / 100,
      },
      content: {
        total: totalContent,
        published: publishedContent,
      },
    };
  }

  async getUsers(query: UserListQueryDto) {
    const { page = 1, limit = 20, search, status, role, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
          subscription: {
            select: {
              tier: true,
              status: true,
              creditsRemaining: true,
              creditsTotal: true,
              currentPeriodEnd: true,
            },
          },
          _count: {
            select: {
              contents: true,
              platformConnections: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        subscription: true,
        platformConnections: {
          select: {
            id: true,
            platform: true,
            status: true,
            accountName: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            contents: true,
            creditTransactions: true,
            payments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get recent activity
    const recentContent = await this.prisma.content.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        status: true,
        title: true,
        createdAt: true,
      },
    });

    const recentPayments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      ...user,
      recentContent,
      recentPayments,
    };
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check email uniqueness if changing email
    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async updateUserSubscription(userId: string, dto: UpdateSubscriptionDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.prisma.subscription.update({
      where: { userId },
      data: dto,
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting admin users
    if (user.role === 'ADMIN') {
      throw new ConflictException('Cannot delete admin users');
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }

  async createAdmin(dto: CreateAdminDto) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const admin = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        profile: {
          create: {
            completeness: 100,
          },
        },
        subscription: {
          create: {
            tier: 'ENTERPRISE',
            creditsTotal: 999999,
            creditsRemaining: 999999,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return admin;
  }

  async getPayments(query: { page?: number; limit?: number; status?: string; userId?: string }) {
    const { page = 1, limit = 20, status, userId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async logAuditAction(
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string | null,
    oldValue?: any,
    newValue?: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        ipAddress,
        userAgent,
      },
    });
  }

  async getAuditLogs(query: { page?: number; limit?: number; entityType?: string; userId?: string }) {
    const { page = 1, limit = 50, entityType, userId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =====================
  // Plan Management
  // =====================

  async getPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map((plan) => ({
      ...plan,
      features: JSON.parse(plan.features || '[]'),
      monthlyPriceDisplay: plan.monthlyPrice / 100, // Convert paise to rupees
      yearlyPriceDisplay: plan.yearlyPrice / 100,
    }));
  }

  async getPlanById(planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return {
      ...plan,
      features: JSON.parse(plan.features || '[]'),
      monthlyPriceDisplay: plan.monthlyPrice / 100,
      yearlyPriceDisplay: plan.yearlyPrice / 100,
    };
  }

  async createPlan(dto: CreatePlanDto) {
    // Check if plan name already exists
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Plan with this name already exists');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.subscriptionPlan.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        displayName: dto.displayName,
        description: dto.description,
        monthlyPrice: dto.monthlyPrice,
        yearlyPrice: dto.yearlyPrice,
        yearlyDiscount: dto.yearlyDiscount || 0,
        credits: dto.credits,
        features: JSON.stringify(dto.features || []),
        isActive: dto.isActive ?? true,
        isDefault: dto.isDefault ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return {
      ...plan,
      features: JSON.parse(plan.features),
      monthlyPriceDisplay: plan.monthlyPrice / 100,
      yearlyPriceDisplay: plan.yearlyPrice / 100,
    };
  }

  async updatePlan(planId: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.subscriptionPlan.updateMany({
        where: { isDefault: true, id: { not: planId } },
        data: { isDefault: false },
      });
    }

    const updateData: any = { ...dto };
    if (dto.features) {
      updateData.features = JSON.stringify(dto.features);
    }

    const updated = await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: updateData,
    });

    return {
      ...updated,
      features: JSON.parse(updated.features),
      monthlyPriceDisplay: updated.monthlyPrice / 100,
      yearlyPriceDisplay: updated.yearlyPrice / 100,
    };
  }

  async deletePlan(planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Check if any subscriptions are using this plan
    const subscriptionsUsingPlan = await this.prisma.subscription.count({
      where: { tier: plan.name },
    });

    if (subscriptionsUsingPlan > 0) {
      throw new ConflictException(
        `Cannot delete plan. ${subscriptionsUsingPlan} subscriptions are using this plan.`,
      );
    }

    await this.prisma.subscriptionPlan.delete({
      where: { id: planId },
    });

    return { message: 'Plan deleted successfully' };
  }

  async seedDefaultPlans() {
    const defaultPlans = [
      {
        name: 'STARTER',
        displayName: 'Starter',
        description: 'Perfect for individuals getting started',
        monthlyPrice: 0,
        yearlyPrice: 0,
        yearlyDiscount: 0,
        credits: 100,
        features: JSON.stringify([
          '100 credits/month',
          'Instagram & Facebook posting',
          'Basic analytics',
          'Email support',
        ]),
        isActive: true,
        isDefault: true,
        sortOrder: 0,
      },
      {
        name: 'PROFESSIONAL',
        displayName: 'Professional',
        description: 'Best for growing businesses',
        monthlyPrice: 99900, // Rs 999
        yearlyPrice: 959000, // Rs 9590 (20% off)
        yearlyDiscount: 20,
        credits: 500,
        features: JSON.stringify([
          '500 credits/month',
          'All social platforms',
          'Advanced analytics',
          'Priority support',
          'Content scheduling',
        ]),
        isActive: true,
        isDefault: false,
        sortOrder: 1,
      },
      {
        name: 'BUSINESS',
        displayName: 'Business',
        description: 'For teams and agencies',
        monthlyPrice: 299900, // Rs 2999
        yearlyPrice: 2879000, // Rs 28790 (20% off)
        yearlyDiscount: 20,
        credits: 2000,
        features: JSON.stringify([
          '2000 credits/month',
          'All Professional features',
          'Team collaboration',
          'Custom branding',
          'API access',
        ]),
        isActive: true,
        isDefault: false,
        sortOrder: 2,
      },
      {
        name: 'ENTERPRISE',
        displayName: 'Enterprise',
        description: 'Custom solutions for large organizations',
        monthlyPrice: 999900, // Rs 9999
        yearlyPrice: 9599000, // Rs 95990 (20% off)
        yearlyDiscount: 20,
        credits: 10000,
        features: JSON.stringify([
          '10000 credits/month',
          'All Business features',
          'Dedicated support',
          'Custom integrations',
          'SLA guarantee',
        ]),
        isActive: true,
        isDefault: false,
        sortOrder: 3,
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const plan of defaultPlans) {
      const existing = await this.prisma.subscriptionPlan.findUnique({
        where: { name: plan.name },
      });

      if (!existing) {
        await this.prisma.subscriptionPlan.create({ data: plan });
        created++;
      } else {
        skipped++;
      }
    }

    return { message: `Created ${created} plans, skipped ${skipped} existing plans` };
  }
}
