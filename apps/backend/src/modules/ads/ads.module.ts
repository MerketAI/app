import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { GoogleAdsService } from './google-ads.service';
import { MetaAdsService } from './meta-ads.service';

@Module({
  imports: [PrismaModule, SubscriptionsModule, CredentialsModule],
  controllers: [AdsController],
  providers: [AdsService, GoogleAdsService, MetaAdsService],
  exports: [AdsService],
})
export class AdsModule {}
