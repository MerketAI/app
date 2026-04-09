import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TrendsController } from './trends.controller';
import { TrendsService } from './trends.service';

@Module({
  imports: [PrismaModule, CredentialsModule, SubscriptionsModule],
  controllers: [TrendsController],
  providers: [TrendsService],
  exports: [TrendsService],
})
export class TrendsModule {}
