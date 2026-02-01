import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto, UpdateUserDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatarUrl: true,
        status: true,
        authProvider: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
        profile: true,
        subscription: {
          select: {
            tier: true,
            creditsTotal: true,
            creditsRemaining: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
      },
    });
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Transform array/object fields to JSON strings for SQLite
    const data: any = { ...dto };
    if (dto.services) data.services = JSON.stringify(dto.services);
    if (dto.products) data.products = JSON.stringify(dto.products);
    if (dto.brandColors) data.brandColors = JSON.stringify(dto.brandColors);
    if (dto.competitors) data.competitors = JSON.stringify(dto.competitors);

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        ...data,
        completeness: this.calculateCompleteness(dto),
      },
      create: {
        userId,
        ...data,
        completeness: this.calculateCompleteness(dto),
      },
    });

    return profile;
  }

  async uploadAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { avatarUrl: true },
    });
  }

  async uploadLogo(userId: string, logoUrl: string) {
    return this.prisma.userProfile.update({
      where: { userId },
      data: { logoUrl },
      select: { logoUrl: true },
    });
  }

  async deleteAccount(userId: string) {
    // This will cascade delete all related data due to Prisma schema relations
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Account deleted successfully' };
  }

  private calculateCompleteness(profile: Partial<UpdateProfileDto>): number {
    const fields = [
      'businessName',
      'industry',
      'description',
      'services',
      'products',
      'targetAudience',
      'location',
      'brandColors',
    ];

    const filled = fields.filter((field) => {
      const value = profile[field as keyof UpdateProfileDto];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
      return !!value;
    });

    return Math.round((filled.length / fields.length) * 100);
  }
}
