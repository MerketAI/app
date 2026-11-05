import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { UploadModule } from '../upload/upload.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { HealthController } from './health.controller';

@Module({
  imports: [PrismaModule, CredentialsModule, UploadModule, SchedulerModule],
  controllers: [HealthController],
})
export class HealthModule {}
