import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { UploadModule } from '../upload/upload.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { LibraryModule } from '../library/library.module';
import { AssetsService } from './assets.service';
import { DecorativeService } from './decorative.service';
import { PhotoService } from './photo.service';
import { ImageGenerationService } from './image-generation.service';
import { PhotoIngestService } from './photo-ingest.service';
import { CutoutService } from './cutout.service';
import { IconScoutService } from './iconscout.service';
import { AssetsController } from './assets.controller';

@Module({
  imports: [PrismaModule, CredentialsModule, UploadModule, SubscriptionsModule, LibraryModule],
  controllers: [AssetsController],
  providers: [
    AssetsService,
    DecorativeService,
    PhotoService,
    ImageGenerationService,
    PhotoIngestService,
    CutoutService,
    IconScoutService,
  ],
  exports: [
    AssetsService,
    DecorativeService,
    PhotoService,
    ImageGenerationService,
    PhotoIngestService,
    CutoutService,
    IconScoutService,
  ],
})
export class AssetsModule {}
