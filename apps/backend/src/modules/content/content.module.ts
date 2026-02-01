import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { JasperModule } from '../jasper/jasper.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [JasperModule, SubscriptionsModule],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
