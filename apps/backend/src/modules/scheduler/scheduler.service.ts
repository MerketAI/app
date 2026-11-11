import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PublishingService } from '../publishing/publishing.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { TrendsService } from '../trends/trends.service';

/**
 * The background jobs that make the product "automatic". Without these, content
 * scheduled for later is never published and engagement figures never refresh.
 *
 * Every job is guarded by an in-process lock so a long run cannot overlap with
 * the next tick. For multi-instance deployments this should move to a shared
 * lock (Redis) - see JASPER_SCHEDULER_ENABLED below for the interim control.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly running = new Set<string>();

  /**
   * Lets you run several API instances but only one scheduler. Defaults to on,
   * so a single-instance deployment needs no configuration.
   */
  private readonly enabled = process.env.JASPER_SCHEDULER_ENABLED !== 'false';

  constructor(
    private prisma: PrismaService,
    private publishingService: PublishingService,
    private analyticsService: AnalyticsService,
    private trendsService: TrendsService,
  ) {
    if (!this.enabled) {
      this.logger.warn(
        'JASPER_SCHEDULER_ENABLED=false - background jobs are disabled on this instance',
      );
    }
  }

  private async runExclusive(name: string, job: () => Promise<void>) {
    if (!this.enabled) return;
    if (this.running.has(name)) {
      this.logger.warn(`Skipping "${name}" - previous run still in progress`);
      return;
    }

    this.running.add(name);
    const startedAt = Date.now();
    try {
      await job();
    } catch (error) {
      this.logger.error(
        `Job "${name}" failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
    } finally {
      this.running.delete(name);
      this.logger.debug(`Job "${name}" finished in ${Date.now() - startedAt}ms`);
    }
  }

  /** Publishes content whose scheduled time has arrived. */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'publish-scheduled-content' })
  async publishScheduledContent() {
    await this.runExclusive('publish-scheduled-content', async () => {
      const result = await this.publishingService.processScheduledContent();
      if (result.processed > 0) {
        this.logger.log(
          `Scheduled publishing: ${result.succeeded} published, ${result.failed} failed`,
        );
      }
    });
  }

  /**
   * Refreshes engagement metrics for recently published posts. Anything older
   * than 30 days is left alone - the numbers have stopped moving by then.
   */
  @Cron(CronExpression.EVERY_30_MINUTES, { name: 'sync-content-analytics' })
  async syncContentAnalytics() {
    await this.runExclusive('sync-content-analytics', async () => {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const staleBefore = new Date(Date.now() - 60 * 60 * 1000);

      const contents = await this.prisma.content.findMany({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: cutoff },
          platformPostId: { not: null },
          connection: { platform: { in: ['INSTAGRAM', 'FACEBOOK'] } },
          OR: [
            { analytics: null },
            { analytics: { lastSyncAt: { lt: staleBefore } } },
          ],
        },
        select: { id: true },
        orderBy: { publishedAt: 'desc' },
        take: 200,
      });

      let synced = 0;
      for (const content of contents) {
        try {
          const result = await this.analyticsService.syncAnalytics(content.id);
          if (result) synced++;
        } catch (error) {
          this.logger.warn(
            `Analytics sync failed for content ${content.id}: ${(error as Error).message}`,
          );
        }
      }

      if (contents.length > 0) {
        this.logger.log(
          `Analytics sync: ${synced}/${contents.length} posts refreshed`,
        );
      }
    });
  }

  /** Refreshes the trending-topics cache; entries expire after 24h. */
  @Cron(CronExpression.EVERY_6_HOURS, { name: 'sync-trends' })
  async syncTrends() {
    await this.runExclusive('sync-trends', async () => {
      const result = await this.trendsService.syncTrends();
      this.logger.log(
        `Trends sync: ${result.synced} topics from ${result.source}`,
      );
    });
  }

  /** Clears expired trending topics so queries stay fast. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'prune-expired-trends' })
  async pruneExpiredTrends() {
    await this.runExclusive('prune-expired-trends', async () => {
      const { count } = await this.prisma.trendingTopic.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (count > 0) this.logger.log(`Pruned ${count} expired trending topics`);
    });
  }

  /**
   * Marks platform connections whose token has expired, so the UI can prompt a
   * reconnect instead of letting publishing fail with an opaque API error.
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'flag-expired-connections' })
  async flagExpiredConnections() {
    await this.runExclusive('flag-expired-connections', async () => {
      const { count } = await this.prisma.platformConnection.updateMany({
        where: {
          status: 'CONNECTED',
          tokenExpiry: { not: null, lt: new Date() },
        },
        data: { status: 'EXPIRED' },
      });
      if (count > 0) {
        this.logger.warn(`Marked ${count} platform connection(s) as EXPIRED`);
      }
    });
  }

  /** Removes partner API logs older than 90 days. */
  @Cron(CronExpression.EVERY_DAY_AT_4AM, { name: 'prune-partner-logs' })
  async prunePartnerLogs() {
    await this.runExclusive('prune-partner-logs', async () => {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const { count } = await this.prisma.partnerApiLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (count > 0) this.logger.log(`Pruned ${count} partner API log rows`);
    });
  }

  /** Snapshot of job wiring, surfaced through the admin scheduler endpoint. */
  getStatus() {
    return {
      enabled: this.enabled,
      running: Array.from(this.running),
      jobs: [
        { name: 'publish-scheduled-content', schedule: 'every minute' },
        { name: 'sync-content-analytics', schedule: 'every 30 minutes' },
        { name: 'sync-trends', schedule: 'every 6 hours' },
        { name: 'flag-expired-connections', schedule: 'hourly' },
        { name: 'prune-expired-trends', schedule: 'daily 03:00' },
        { name: 'prune-partner-logs', schedule: 'daily 04:00' },
      ],
    };
  }
}
