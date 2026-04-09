import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { EmailSenderService } from './email-sender.service';
import { EmailTemplateService } from './email-template.service';

@Module({
  imports: [PrismaModule, CredentialsModule, SubscriptionsModule],
  controllers: [EmailController],
  providers: [EmailService, EmailSenderService, EmailTemplateService],
  exports: [EmailService],
})
export class EmailModule {}
