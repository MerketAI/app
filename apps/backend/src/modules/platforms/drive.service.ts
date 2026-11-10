import { BadRequestException, Injectable } from '@nestjs/common';
import { LibraryService } from '../library/library.service';
import { PlatformsService } from './platforms.service';

const MAX_BYTES = 25 * 1024 * 1024; // UploadService's own limit
const ALLOWED = /^(image\/(jpeg|png|webp)|video\/mp4)$/;

/**
 * Copies a file the user picked in Google Drive into public storage, ready to
 * post, and files it in their library under uploads/google-drive. Stored per
 * provider and by content hash: keying on the Drive file name alone let two
 * providers' "photo.jpg" overwrite each other.
 */
@Injectable()
export class DriveService {
  constructor(
    private platforms: PlatformsService,
    private library: LibraryService,
  ) {}

  async importFile(userId: string, connectionId: string, fileId: string) {
    if (!fileId || !/^[\w-]+$/.test(fileId)) {
      throw new BadRequestException('Invalid Drive file id');
    }
    const { accessToken } = await this.platforms.getDriveAccessToken(userId, connectionId);
    const headers = { Authorization: `Bearer ${accessToken}` };
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;

    const metaResponse = await fetch(`${url}?fields=name,mimeType,size`, { headers });
    if (!metaResponse.ok) {
      throw new BadRequestException('That file could not be read from Google Drive');
    }
    const meta = (await metaResponse.json()) as { name: string; mimeType: string; size?: string };
    if (!ALLOWED.test(meta.mimeType)) {
      throw new BadRequestException('Pick a JPG, PNG or WebP image, or an MP4 video');
    }
    if (Number(meta.size || 0) > MAX_BYTES) {
      throw new BadRequestException('That file is larger than 25 MB');
    }

    const file = await fetch(`${url}?alt=media`, { headers });
    if (!file.ok) {
      throw new BadRequestException('That file could not be downloaded from Google Drive');
    }
    const stored = await this.library.store(
      userId,
      {
        buffer: Buffer.from(await file.arrayBuffer()),
        mimeType: meta.mimeType,
        extension: meta.mimeType.split('/')[1].replace('jpeg', 'jpg'),
        name: meta.name,
      },
      {
        kind: 'upload',
        folder: 'uploads/google-drive',
        title: meta.name,
        source: 'google-drive',
        metadata: { driveFileId: fileId },
      },
    );
    return { url: stored.url, name: meta.name, mimeType: meta.mimeType, libraryId: stored.id };
  }
}
