import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UploadModule } from '../upload/upload.module';
import { AssetsModule } from '../assets/assets.module';
import { LibraryModule } from '../library/library.module';
import { DesignController } from './design.controller';
import { DesignService } from './design.service';
import { RendererService } from './renderer.service';
import { PostImageService } from './post-image.service';
import { CreativeSpecsController } from './creative-specs.controller';

@Module({
  imports: [PrismaModule, CredentialsModule, SubscriptionsModule, UploadModule, AssetsModule, LibraryModule],
  controllers: [DesignController, CreativeSpecsController],
  providers: [DesignService, RendererService, PostImageService],
  exports: [DesignService, PostImageService],
})
export class DesignModule {}
