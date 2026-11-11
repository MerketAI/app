import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  generateAppKey,
  generateAppSecret,
  generateWebhookSecret,
  hashAppSecret,
  verifyAppSecret,
  isValidAppUidFormat,
} from './partner-credentials.util';
import {
  CreatePartnerAppDto,
  UpdatePartnerAppDto,
  ProvisionSubscriberDto,
} from './dto/partner.dto';

export const APP_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  REVOKED: 'REVOKED',
} as const;

export interface AuthenticatedApp {
  id: string;
  name: string;
  appKey: string;
  scopes: string[];
  allowedPlatforms: string[];
  rateLimitPerMin: number;
}

export interface ResolvedSubscriber {
  userId: string;
  appUid: string;
  partnerAppUserId: string;
}

@Injectable()
export class PartnerService {
  private readonly logger = new Logger(PartnerService.name);

  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------
  // App lifecycle (admin-facing)
  // ---------------------------------------------------------------

  /**
   * Creates a partner app and returns the plaintext secret. This is the only
   * time the secret is ever available - it is stored hashed.
   */
  async createApp(dto: CreatePartnerAppDto) {
    const appKey = generateAppKey();
    const appSecret = generateAppSecret();
    const webhookSecret = dto.webhookUrl ? generateWebhookSecret() : null;

    const app = await this.prisma.partnerApp.create({
      data: {
        name: dto.name,
        description: dto.description,
        contactEmail: dto.contactEmail,
        appKey,
        appSecretHash: hashAppSecret(appSecret),
        appSecretLast4: appSecret.slice(-4),
        secretRotatedAt: new Date(),
        scopes: JSON.stringify(dto.scopes ?? ['*']),
        allowedPlatforms: JSON.stringify(dto.allowedPlatforms ?? []),
        ipAllowlist: JSON.stringify(dto.ipAllowlist ?? []),
        rateLimitPerMin: dto.rateLimitPerMin ?? 120,
        maxSubscribers: dto.maxSubscribers ?? null,
        defaultTier: dto.defaultTier ?? 'STARTER',
        defaultCredits: dto.defaultCredits ?? 100,
        autoProvision: dto.autoProvision ?? true,
        webhookUrl: dto.webhookUrl,
        webhookSecret,
      },
    });

    return {
      app: this.presentApp(app),
      credentials: {
        APP_KEY: appKey,
        APP_SECRET: appSecret,
        webhookSecret,
      },
      warning:
        'Store APP_SECRET now. It is hashed at rest and cannot be retrieved again.',
    };
  }

  async listApps() {
    const apps = await this.prisma.partnerApp.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { subscribers: true } } },
    });
    return apps.map((a) => ({
      ...this.presentApp(a),
      subscriberCount: a._count.subscribers,
    }));
  }

  async getApp(appId: string) {
    const app = await this.prisma.partnerApp.findUnique({
      where: { id: appId },
      include: { _count: { select: { subscribers: true } } },
    });
    if (!app) throw new NotFoundException('Partner app not found');
    return {
      ...this.presentApp(app),
      subscriberCount: app._count.subscribers,
    };
  }

  async updateApp(appId: string, dto: UpdatePartnerAppDto) {
    await this.getApp(appId);
    const data: Record<string, any> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.contactEmail !== undefined) data.contactEmail = dto.contactEmail;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.scopes !== undefined) data.scopes = JSON.stringify(dto.scopes);
    if (dto.allowedPlatforms !== undefined)
      data.allowedPlatforms = JSON.stringify(dto.allowedPlatforms);
    if (dto.ipAllowlist !== undefined)
      data.ipAllowlist = JSON.stringify(dto.ipAllowlist);
    if (dto.rateLimitPerMin !== undefined)
      data.rateLimitPerMin = dto.rateLimitPerMin;
    if (dto.maxSubscribers !== undefined)
      data.maxSubscribers = dto.maxSubscribers;
    if (dto.defaultTier !== undefined) data.defaultTier = dto.defaultTier;
    if (dto.defaultCredits !== undefined)
      data.defaultCredits = dto.defaultCredits;
    if (dto.autoProvision !== undefined) data.autoProvision = dto.autoProvision;
    if (dto.webhookUrl !== undefined) data.webhookUrl = dto.webhookUrl;

    const app = await this.prisma.partnerApp.update({
      where: { id: appId },
      data,
    });
    return this.presentApp(app);
  }

  /** Issues a new secret and invalidates the previous one immediately. */
  async rotateSecret(appId: string) {
    await this.getApp(appId);
    const appSecret = generateAppSecret();

    const app = await this.prisma.partnerApp.update({
      where: { id: appId },
      data: {
        appSecretHash: hashAppSecret(appSecret),
        appSecretLast4: appSecret.slice(-4),
        secretRotatedAt: new Date(),
      },
    });

    return {
      app: this.presentApp(app),
      credentials: { APP_KEY: app.appKey, APP_SECRET: appSecret },
      warning:
        'The previous secret stopped working immediately. Store this one now.',
    };
  }

  async revokeApp(appId: string) {
    await this.getApp(appId);
    const app = await this.prisma.partnerApp.update({
      where: { id: appId },
      data: { status: APP_STATUS.REVOKED },
    });
    return this.presentApp(app);
  }

  // ---------------------------------------------------------------
  // Request-time authentication
  // ---------------------------------------------------------------

  async authenticateApp(
    appKey: string,
    appSecret: string,
    ipAddress?: string,
  ): Promise<AuthenticatedApp> {
    const app = await this.prisma.partnerApp.findUnique({ where: { appKey } });

    // Same message whether the key is unknown or the secret is wrong, so the
    // response cannot be used to enumerate valid app keys.
    const invalid = new UnauthorizedException('Invalid APP_KEY or APP_SECRET');
    if (!app) throw invalid;
    if (!verifyAppSecret(appSecret, app.appSecretHash)) throw invalid;

    if (app.status === APP_STATUS.REVOKED) {
      throw new ForbiddenException('This application has been revoked');
    }
    if (app.status === APP_STATUS.SUSPENDED) {
      throw new ForbiddenException('This application is suspended');
    }

    const ipAllowlist = this.parseJson<string[]>(app.ipAllowlist, []);
    if (
      ipAllowlist.length > 0 &&
      ipAddress &&
      !ipAllowlist.includes(ipAddress)
    ) {
      throw new ForbiddenException(
        `Requests from ${ipAddress} are not permitted for this application`,
      );
    }

    // Fire-and-forget: a failed bookkeeping write must not fail the request.
    this.prisma.partnerApp
      .update({ where: { id: app.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return {
      id: app.id,
      name: app.name,
      appKey: app.appKey,
      scopes: this.parseJson<string[]>(app.scopes, ['*']),
      allowedPlatforms: this.parseJson<string[]>(app.allowedPlatforms, []),
      rateLimitPerMin: app.rateLimitPerMin,
    };
  }

  /**
   * Maps a partner's own subscriber id (APP_UID) onto an internal user,
   * creating that user on first sight when the app allows auto-provisioning.
   */
  async resolveSubscriber(
    appId: string,
    appUid: string,
    hints: { email?: string; name?: string } = {},
  ): Promise<ResolvedSubscriber> {
    if (!isValidAppUidFormat(appUid)) {
      throw new BadRequestException(
        'APP_UID must be 1-128 characters and contain no whitespace',
      );
    }

    const existing = await this.prisma.partnerAppUser.findUnique({
      where: { appId_appUid: { appId, appUid } },
    });

    if (existing) {
      if (existing.status !== 'ACTIVE') {
        throw new ForbiddenException(`Subscriber ${appUid} is suspended`);
      }
      this.prisma.partnerAppUser
        .update({
          where: { id: existing.id },
          data: { lastSeenAt: new Date() },
        })
        .catch(() => undefined);
      return {
        userId: existing.userId,
        appUid,
        partnerAppUserId: existing.id,
      };
    }

    const app = await this.prisma.partnerApp.findUnique({
      where: { id: appId },
    });
    if (!app) throw new NotFoundException('Partner app not found');

    if (!app.autoProvision) {
      throw new NotFoundException(
        `Unknown APP_UID "${appUid}". This application has auto-provisioning disabled; register the subscriber via POST /api/v1/partner/subscribers first.`,
      );
    }

    if (app.maxSubscribers !== null) {
      const count = await this.prisma.partnerAppUser.count({ where: { appId } });
      if (count >= app.maxSubscribers) {
        throw new ForbiddenException(
          `Subscriber limit reached (${app.maxSubscribers}). Contact your account manager to raise it.`,
        );
      }
    }

    const created = await this.provisionSubscriber(app, appUid, hints);
    return {
      userId: created.userId,
      appUid,
      partnerAppUserId: created.id,
    };
  }

  /**
   * Creates the internal user, profile, subscription and the partner mapping in
   * one transaction so a partially provisioned subscriber is never left behind.
   */
  private async provisionSubscriber(
    app: {
      id: string;
      appKey: string;
      defaultTier: string;
      defaultCredits: number;
    },
    appUid: string,
    hints: {
      email?: string;
      name?: string;
      externalRef?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const now = new Date();

    // Only attach the email when it is free - a partner's subscriber must never
    // be silently merged into an existing account belonging to someone else.
    let email: string | null = null;
    if (hints.email) {
      const taken = await this.prisma.user.findUnique({
        where: { email: hints.email },
      });
      if (!taken) {
        email = hints.email;
      } else {
        this.logger.warn(
          `Email ${hints.email} already in use; provisioning ${appUid} without it`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: hints.name || `Subscriber ${appUid}`,
          authProvider: 'PARTNER',
          status: 'ACTIVE',
          emailVerified: false,
          profile: { create: { completeness: 0 } },
          subscription: {
            create: {
              tier: app.defaultTier,
              creditsTotal: app.defaultCredits,
              creditsRemaining: app.defaultCredits,
              currentPeriodStart: now,
              currentPeriodEnd: new Date(
                now.getTime() + 30 * 24 * 60 * 60 * 1000,
              ),
            },
          },
        },
      });

      return tx.partnerAppUser.create({
        data: {
          appId: app.id,
          appUid,
          userId: user.id,
          externalRef: hints.externalRef,
          metadata: JSON.stringify(hints.metadata ?? {}),
          lastSeenAt: now,
        },
      });
    });
  }

  // ---------------------------------------------------------------
  // Subscriber management (partner-facing)
  // ---------------------------------------------------------------

  async registerSubscriber(appId: string, dto: ProvisionSubscriberDto) {
    if (!isValidAppUidFormat(dto.appUid)) {
      throw new BadRequestException(
        'APP_UID must be 1-128 characters and contain no whitespace',
      );
    }

    const existing = await this.prisma.partnerAppUser.findUnique({
      where: { appId_appUid: { appId, appUid: dto.appUid } },
    });
    if (existing) {
      throw new ConflictException(
        `APP_UID "${dto.appUid}" is already registered`,
      );
    }

    const app = await this.prisma.partnerApp.findUnique({
      where: { id: appId },
    });
    if (!app) throw new NotFoundException('Partner app not found');

    if (app.maxSubscribers !== null) {
      const count = await this.prisma.partnerAppUser.count({ where: { appId } });
      if (count >= app.maxSubscribers) {
        throw new ForbiddenException(
          `Subscriber limit reached (${app.maxSubscribers})`,
        );
      }
    }

    const record = await this.provisionSubscriber(app, dto.appUid, {
      email: dto.email,
      name: dto.name,
      externalRef: dto.externalRef,
      metadata: dto.metadata,
    });

    return this.presentSubscriber(record);
  }

  async listSubscribers(appId: string, limit = 50, offset = 0) {
    const [records, total] = await Promise.all([
      this.prisma.partnerAppUser.findMany({
        where: { appId },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 200),
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              subscription: {
                select: {
                  tier: true,
                  creditsRemaining: true,
                  creditsTotal: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.partnerAppUser.count({ where: { appId } }),
    ]);

    return {
      subscribers: records.map((r) => ({
        ...this.presentSubscriber(r),
        user: r.user,
      })),
      total,
      limit,
      offset,
    };
  }

  async getSubscriber(appId: string, appUid: string) {
    const record = await this.prisma.partnerAppUser.findUnique({
      where: { appId_appUid: { appId, appUid } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            createdAt: true,
            subscription: {
              select: {
                tier: true,
                status: true,
                creditsRemaining: true,
                creditsTotal: true,
                currentPeriodEnd: true,
              },
            },
          },
        },
      },
    });
    if (!record) throw new NotFoundException(`Unknown APP_UID "${appUid}"`);
    return { ...this.presentSubscriber(record), user: record.user };
  }

  async setSubscriberStatus(appId: string, appUid: string, status: string) {
    const record = await this.prisma.partnerAppUser.findUnique({
      where: { appId_appUid: { appId, appUid } },
    });
    if (!record) throw new NotFoundException(`Unknown APP_UID "${appUid}"`);

    const updated = await this.prisma.partnerAppUser.update({
      where: { id: record.id },
      data: { status },
    });
    return this.presentSubscriber(updated);
  }

  // ---------------------------------------------------------------

  async logRequest(entry: {
    appId: string;
    appUid?: string | null;
    userId?: string | null;
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
  }) {
    try {
      await this.prisma.partnerApiLog.create({ data: entry });
    } catch (error) {
      this.logger.warn(
        `Failed to write partner API log: ${(error as Error).message}`,
      );
    }
  }

  async getUsage(appId: string, since?: Date) {
    const from = since ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [total, failed, byPath] = await Promise.all([
      this.prisma.partnerApiLog.count({
        where: { appId, createdAt: { gte: from } },
      }),
      this.prisma.partnerApiLog.count({
        where: { appId, createdAt: { gte: from }, statusCode: { gte: 400 } },
      }),
      this.prisma.partnerApiLog.groupBy({
        by: ['path'],
        where: { appId, createdAt: { gte: from } },
        _count: true,
        orderBy: { _count: { path: 'desc' } },
        take: 20,
      }),
    ]);

    return {
      since: from,
      totalRequests: total,
      failedRequests: failed,
      successRate:
        total > 0
          ? Number((((total - failed) / total) * 100).toFixed(2))
          : null,
      topEndpoints: byPath.map((p) => ({ path: p.path, count: p._count })),
    };
  }

  // ---------------------------------------------------------------

  private presentApp(app: any) {
    return {
      id: app.id,
      name: app.name,
      description: app.description,
      contactEmail: app.contactEmail,
      appKey: app.appKey,
      appSecretPreview: `${'.'.repeat(28)}${app.appSecretLast4}`,
      secretRotatedAt: app.secretRotatedAt,
      status: app.status,
      scopes: this.parseJson<string[]>(app.scopes, ['*']),
      allowedPlatforms: this.parseJson<string[]>(app.allowedPlatforms, []),
      ipAllowlist: this.parseJson<string[]>(app.ipAllowlist, []),
      rateLimitPerMin: app.rateLimitPerMin,
      maxSubscribers: app.maxSubscribers,
      defaultTier: app.defaultTier,
      defaultCredits: app.defaultCredits,
      autoProvision: app.autoProvision,
      webhookUrl: app.webhookUrl,
      lastUsedAt: app.lastUsedAt,
      createdAt: app.createdAt,
    };
  }

  private presentSubscriber(record: any) {
    return {
      id: record.id,
      appUid: record.appUid,
      userId: record.userId,
      status: record.status,
      externalRef: record.externalRef,
      metadata: this.parseJson<Record<string, any>>(record.metadata, {}),
      lastSeenAt: record.lastSeenAt,
      createdAt: record.createdAt,
    };
  }

  private parseJson<T>(value: string | null | undefined, fallback: T): T {
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
}
