import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { GoogleAnalyticsService } from './google-analytics.service';

@Module({
  imports: [PrismaModule, CredentialsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, GoogleAnalyticsService],
  exports: [AnalyticsService, GoogleAnalyticsService],
})
export class AnalyticsModule {}
