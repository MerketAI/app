import { Injectable, BadRequestException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { CredentialsService } from '../credentials/credentials.service';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

@Injectable()
export class UploadService {
  private s3Client: S3Client | null = null;
  private bucket: string = '';
  private region: string = '';

  constructor(private credentialsService: CredentialsService) {}

  private async initializeS3Client(): Promise<void> {
    if (this.s3Client) return;

    const accessKeyId = await this.credentialsService.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = await this.credentialsService.get('AWS_SECRET_ACCESS_KEY');
    this.bucket = await this.credentialsService.get('AWS_S3_BUCKET');
    this.region = await this.credentialsService.get('AWS_S3_REGION') || 'ap-south-1';

    if (!accessKeyId || !secretAccessKey || !this.bucket) {
      throw new BadRequestException(
        'AWS S3 credentials not configured. Please configure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET in admin credentials.',
      );
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<UploadResult> {
    await this.initializeS3Client();

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed types: JPEG, PNG, GIF, WebP, SVG',
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const uniqueFileName = `${folder}/${uuidv4()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: uniqueFileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    });

    await this.s3Client!.send(command);

    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${uniqueFileName}`;

    return {
      url,
      key: uniqueFileName,
      bucket: this.bucket,
    };
  }

  async deleteFile(key: string): Promise<void> {
    await this.initializeS3Client();

    if (!key) return;

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client!.send(command);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
    }
  }

  extractKeyFromUrl(url: string): string | null {
    if (!url) return null;

    try {
      const urlObj = new URL(url);
      // Remove leading slash
      return urlObj.pathname.slice(1);
    } catch {
      return null;
    }
  }
}
