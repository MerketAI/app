import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ContentModule } from './modules/content/content.module';
import { PublishingModule } from './modules/publishing/publishing.module';
import { PlatformsModule } from './modules/platforms/platforms.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { JasperModule } from './modules/jasper/jasper.module';
import { HealthModule } from './modules/health/health.module';
import { AdminModule } from './modules/admin/admin.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { RazorpayModule } from './modules/razorpay/razorpay.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { UploadModule } from './modules/upload/upload.module';
import { BusinessModule } from './modules/business/business.module';
import { AiScraperModule } from './modules/ai-scraper/ai-scraper.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 200,
      },
    ]),

    // Database
    PrismaModule,

    // Feature modules
    HealthModule,
    AuthModule,
    UsersModule,
    SubscriptionsModule,
    ContentModule,
    PublishingModule,
    PlatformsModule,
    AnalyticsModule,
    JasperModule,

    // Admin modules
    AdminModule,
    CredentialsModule,
    RazorpayModule,

    // Workspace & Page Builder
    WorkspaceModule,

    // File Upload
    UploadModule,

    // Business Intelligence
    BusinessModule,

    // AI Scraper (Multi-provider data fetching)
    AiScraperModule,
  ],
})
export class AppModule {}
