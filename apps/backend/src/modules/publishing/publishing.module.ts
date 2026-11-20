import { Module } from '@nestjs/common';
import { PublishingController } from './publishing.controller';
import { PublishingService } from './publishing.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlatformsModule } from '../platforms/platforms.module';

@Module({
  imports: [SubscriptionsModule, PlatformsModule],
  controllers: [PublishingController],
  providers: [PublishingService],
  exports: [PublishingService],
})
export class PublishingModule {}
