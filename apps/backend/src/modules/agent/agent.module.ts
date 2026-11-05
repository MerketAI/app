import { Module } from '@nestjs/common';
import { BusinessModule } from '../business/business.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { DesignModule } from '../design/design.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

@Module({
  imports: [BusinessModule, CredentialsModule, DesignModule, SubscriptionsModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
