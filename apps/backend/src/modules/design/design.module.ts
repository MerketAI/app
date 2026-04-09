import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { DesignController } from './design.controller';
import { DesignService } from './design.service';
import { RendererService } from './renderer.service';

@Module({
  imports: [PrismaModule, CredentialsModule, SubscriptionsModule],
  controllers: [DesignController],
  providers: [DesignService, RendererService],
  exports: [DesignService],
})
export class DesignModule {}
