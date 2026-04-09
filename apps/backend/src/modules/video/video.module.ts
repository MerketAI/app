import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { HeygenProvider } from './providers/heygen.provider';
import { RunwayProvider } from './providers/runway.provider';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [VideoController],
  providers: [VideoService, HeygenProvider, RunwayProvider],
  exports: [VideoService],
})
export class VideoModule {}
