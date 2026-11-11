import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { CompetitorAdsService } from './competitor-ads.service';

@Module({
  imports: [PrismaModule, CredentialsModule],
  controllers: [BusinessController],
  providers: [BusinessService, CompetitorAdsService],
  exports: [BusinessService, CompetitorAdsService],
})
export class BusinessModule {}
