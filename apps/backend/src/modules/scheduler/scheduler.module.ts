import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PublishingModule } from '../publishing/publishing.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { TrendsModule } from '../trends/trends.module';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';

@Module({
  imports: [PrismaModule, PublishingModule, AnalyticsModule, TrendsModule],
  controllers: [SchedulerController],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
