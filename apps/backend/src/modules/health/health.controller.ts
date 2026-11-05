import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { UploadService } from '../upload/upload.service';
import { SchedulerService } from '../scheduler/scheduler.service';

/**
 * Integration keys that change what the product can actually do. Missing ones
 * do not stop the app booting, but they silently downgrade features - so they
 * are reported explicitly rather than discovered mid-test.
 */
const FEATURE_CREDENTIALS: {
  key: string;
  feature: string;
  degradedBehaviour: string;
}[] = [
  {
    key: 'ANTHROPIC_API_KEY',
    feature: 'AI design + page generation',
    degradedBehaviour: 'falls back to a static template',
  },
  {
    key: 'META_APP_ID',
    feature: 'Facebook + Instagram publishing',
    degradedBehaviour: 'OAuth connect is unavailable',
  },
  {
    key: 'META_AD_LIBRARY_TOKEN',
    feature: 'Competitor ad observation (Meta)',
    degradedBehaviour: 'only AI-estimated ad data is available',
  },
  {
    key: 'SERPAPI_KEY',
    feature: 'Google Trends + Google Ads Transparency',
    degradedBehaviour: 'trends fall back to sample data',
  },
  {
    key: 'OPENAI_API_KEY',
    feature: 'Competitor research (OpenAI provider)',
    degradedBehaviour: 'that provider is skipped',
  },
  {
    key: 'PERPLEXITY_API_KEY',
    feature: 'Competitor research (Perplexity provider)',
    degradedBehaviour: 'that provider is skipped',
  },
];

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private credentialsService: CredentialsService,
    private uploadService: UploadService,
    private schedulerService: SchedulerService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check() {
    const dbHealthy = await this.checkDatabase();

    return {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
      },
    };
  }

  @Get('readiness')
  @ApiOperation({
    summary: 'What is configured, and which features are degraded without it',
    description:
      'Intended for pre-test verification. Reports object storage, background jobs and the integration keys that silently downgrade behaviour when absent.',
  })
  async readiness() {
    const [dbHealthy, storage] = await Promise.all([
      this.checkDatabase(),
      this.uploadService.getStatus(),
    ]);

    const credentials = await Promise.all(
      FEATURE_CREDENTIALS.map(async (entry) => ({
        key: entry.key,
        configured: Boolean(await this.credentialsService.get(entry.key)),
        feature: entry.feature,
        whenMissing: entry.degradedBehaviour,
      })),
    );

    const missing = credentials.filter((c) => !c.configured);
    const scheduler = this.schedulerService.getStatus();

    // Publishing to Instagram and TikTok needs a public media URL, so storage
    // is not optional for those - call it out rather than leaving it to fail
    // at publish time.
    const blockers: string[] = [];
    if (!dbHealthy) blockers.push('Database is unreachable.');
    if (!storage.configured) {
      blockers.push(
        `Object storage is not configured (${storage.error}). Instagram and TikTok publishing, and design export, will fail without it.`,
      );
    }
    if (!scheduler.enabled) {
      blockers.push(
        'Background jobs are disabled on this instance, so scheduled posts will not publish.',
      );
    }

    return {
      ready: blockers.length === 0,
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      storage,
      scheduler,
      credentials,
      missingCredentials: missing.map((c) => c.key),
      blockers,
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
