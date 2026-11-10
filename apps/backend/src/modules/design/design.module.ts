import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UploadModule } from '../upload/upload.module';
import { AssetsModule } from '../assets/assets.module';
import { DesignController } from './design.controller';
import { DesignService } from './design.service';
import { RendererService } from './renderer.service';
import { PostImageService } from './post-image.service';

@Module({
  imports: [PrismaModule, CredentialsModule, SubscriptionsModule, UploadModule, AssetsModule],
  controllers: [DesignController],
  providers: [DesignService, RendererService, PostImageService],
  exports: [DesignService, PostImageService],
})
export class DesignModule {}
