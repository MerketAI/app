import { BadRequestException, Injectable } from '@nestjs/common';
import { UploadService } from '../upload/upload.service';
import { PlatformsService } from './platforms.service';

const MAX_BYTES = 25 * 1024 * 1024; // UploadService's own limit
const ALLOWED = /^(image\/(jpeg|png|webp)|video\/mp4)$/;

/** Copies a file the user picked in Google Drive into public storage, ready to post. */
@Injectable()
export class DriveService {
  constructor(
    private platforms: PlatformsService,
    private upload: UploadService,
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
    const stored = await this.upload.uploadBuffer(Buffer.from(await file.arrayBuffer()), {
      folder: 'drive-imports',
      contentType: meta.mimeType,
      extension: meta.mimeType.split('/')[1].replace('jpeg', 'jpg'),
      fileName: meta.name,
    });
    return { url: stored.url, name: meta.name, mimeType: meta.mimeType };
  }
}
