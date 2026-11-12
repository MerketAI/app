import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ContentCalendarService } from './content-calendar.service';
import { JasperModule } from '../jasper/jasper.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [JasperModule, SubscriptionsModule],
  controllers: [ContentController],
  providers: [ContentService, ContentCalendarService],
  exports: [ContentService, ContentCalendarService],
})
export class ContentModule {}
