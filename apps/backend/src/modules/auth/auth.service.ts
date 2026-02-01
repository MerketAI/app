import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  VerifyCodeDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
// Using string values instead of Prisma enums for SQLite compatibility
const AuthProvider = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  GOOGLE: 'GOOGLE',
  FACEBOOK: 'FACEBOOK',
  APPLE: 'APPLE',
} as const;
type AuthProvider = typeof AuthProvider[keyof typeof AuthProvider];

const SubscriptionTier = {
  STARTER: 'STARTER',
  PROFESSIONAL: 'PROFESSIONAL',
  BUSINESS: 'BUSINESS',
  ENTERPRISE: 'ENTERPRISE',
} as const;
type SubscriptionTier = typeof SubscriptionTier[keyof typeof SubscriptionTier];

@Injectable()
export class AuthService {
  private readonly verificationCodes: Map<string, { code: string; expiresAt: Date }> = new Map();
  private readonly resetTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const { email, phone, password, name } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    // Check if user exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phone ? { phone } : {},
        ].filter((o) => Object.keys(o).length > 0),
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user with default subscription
    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        passwordHash,
        name,
        authProvider: email ? AuthProvider.EMAIL : AuthProvider.PHONE,
        status: 'PENDING',
        profile: {
          create: {
            completeness: 10,
          },
        },
        subscription: {
          create: {
            tier: SubscriptionTier.STARTER,
            creditsTotal: 100,
            creditsRemaining: 100,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
      },
    });

    // Generate and store verification code
    await this.sendVerificationCode(email || phone!, email ? 'email' : 'phone');

    return {
      ...user,
      message: `Verification code sent to your ${email ? 'email' : 'phone'}`,
    };
  }

  async login(dto: LoginDto) {
    const { email, phone, password, mfaCode } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    const user = await this.prisma.user.findFirst({
      where: email ? { email } : { phone },
      include: {
        subscription: true,
      },
    }) as any; // Include role field from database

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'PENDING') {
      throw new UnauthorizedException('Please verify your account first');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is suspended');
    }

    // Check MFA if enabled
    if (user.mfaEnabled && !mfaCode) {
      return { requiresMfa: true };
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user);
  }

  async refreshToken(dto: RefreshTokenDto) {
    const { refreshToken } = dto;

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Delete old refresh token
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    return this.generateTokens(storedToken.user);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    } else {
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    return { message: 'Logged out successfully' };
  }

  async sendVerificationCode(identifier: string, type: 'email' | 'phone') {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    this.verificationCodes.set(identifier, { code, expiresAt });

    // TODO: Implement actual email/SMS sending
    console.log(`Verification code for ${identifier}: ${code}`);

    return { message: `Verification code sent to ${type}` };
  }

  async verifyCode(dto: VerifyCodeDto) {
    const { email, phone, code } = dto;
    const identifier = email || phone;

    if (!identifier) {
      throw new BadRequestException('Either email or phone is required');
    }

    const stored = this.verificationCodes.get(identifier);
    if (!stored || stored.expiresAt < new Date() || stored.code !== code) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    this.verificationCodes.delete(identifier);

    // Update user verification status
    const updateData = email
      ? { emailVerified: true, status: 'ACTIVE' as const }
      : { phoneVerified: true, status: 'ACTIVE' as const };

    const user = await this.prisma.user.update({
      where: email ? { email } : { phone },
      data: updateData,
    });

    return this.generateTokens(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Return success even if user doesn't exist (security)
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    this.resetTokens.set(token, { userId: user.id, expiresAt });

    // TODO: Implement actual email sending
    console.log(`Password reset link: /reset-password?token=${token}`);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const stored = this.resetTokens.get(dto.token);
    if (!stored || stored.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash },
    });

    this.resetTokens.delete(dto.token);

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: { userId: stored.userId },
    });

    return { message: 'Password reset successfully' };
  }

  async handleOAuthUser(profile: {
    providerId: string;
    email: string;
    name: string;
    avatarUrl?: string;
    provider: AuthProvider;
  }) {
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          authProvider: profile.provider,
          emailVerified: true,
          status: 'ACTIVE',
          profile: {
            create: {
              completeness: 10,
            },
          },
          subscription: {
            create: {
              tier: SubscriptionTier.STARTER,
              creditsTotal: 100,
              creditsRemaining: 100,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    return this.generateTokens(user);
  }

  private async generateTokens(user: { id: string; email?: string | null; phone?: string | null; name: string; role?: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = uuidv4();
    const refreshExpiresAt = new Date(
      Date.now() + parseInt(this.configService.get('REFRESH_TOKEN_DAYS', '7')) * 24 * 60 * 60 * 1000,
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role || 'USER',
      },
    };
  }
}
