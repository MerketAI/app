import { Module } from '@nestjs/common';
import { UploadModule } from '../upload/upload.module';
import { LibraryModule } from '../library/library.module';
import { DriveService } from './drive.service';
import { PlatformsController } from './platforms.controller';
import { PlatformsService } from './platforms.service';

@Module({
  imports: [UploadModule, LibraryModule],
  controllers: [PlatformsController],
  providers: [PlatformsService, DriveService],
  exports: [PlatformsService, DriveService],
})
export class PlatformsModule {}
