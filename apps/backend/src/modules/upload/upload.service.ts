import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { CredentialsService } from '../credentials/credentials.service';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs, existsSync } from 'fs';
import * as path from 'path';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  provider: 'r2' | 's3' | 'local';
}

/** Where local-only uploads live, and the route main.ts serves them from. */
export const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), 'local-uploads');
export const LOCAL_UPLOAD_ROUTE = '/local-uploads';

/**
 * Disk storage for a developer machine with no R2/S3. Opt-in (LOCAL_UPLOADS=true)
 * and never in production: the URLs are localhost, so Instagram and Facebook
 * cannot fetch them - they are for previewing drafts locally, not publishing.
 */
export const localUploadsEnabled = () =>
  process.env.LOCAL_UPLOADS === 'true' && process.env.NODE_ENV !== 'production';

/**
 * Types a browser would run if opened directly. Storage is served from a
 * subdomain of the product's own domain, where a script could read cookies
 * scoped to the parent, so these are stored as downloads ("attachment"). An
 * SVG still renders inside <img>; only direct navigation is affected.
 */
export const isActiveContent = (contentType = '') =>
  /^(text\/html|application\/xhtml\+xml|image\/svg\+xml|text\/xml|application\/xml|(text|application)\/(x-)?javascript)\b/i.test(
    contentType.trim(),
  );

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

/**
 * Object storage for user uploads and generated assets.
 *
 * Cloudflare R2 is the primary target. R2 speaks the S3 API, but differs in
 * three ways that matter here:
 *
 *   1. It needs an explicit account-scoped endpoint.
 *   2. Its region is always "auto".
 *   3. It does not implement ACLs - sending `ACL: public-read` is an error,
 *      so buckets are made public in the Cloudflare dashboard instead and the
 *      public hostname is configured as R2_PUBLIC_BASE_URL.
 *
 * AWS S3 remains supported as a fallback when no R2 credentials are present.
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  private client: S3Client | null = null;
  private provider: 'r2' | 's3' | 'local' = 'r2';
  private bucket = '';
  private region = 'auto';
  private publicBaseUrl = '';

  constructor(private credentialsService: CredentialsService) {}

  private async initializeClient(): Promise<void> {
    if (this.client || this.provider === 'local') return;

    const [
      r2AccountId,
      r2AccessKeyId,
      r2SecretAccessKey,
      r2Bucket,
      r2PublicBaseUrl,
    ] = await Promise.all([
      this.credentialsService.get('R2_ACCOUNT_ID'),
      this.credentialsService.get('R2_ACCESS_KEY_ID'),
      this.credentialsService.get('R2_SECRET_ACCESS_KEY'),
      this.credentialsService.get('R2_BUCKET'),
      this.credentialsService.get('R2_PUBLIC_BASE_URL'),
    ]);

    if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2Bucket) {
      if (!r2PublicBaseUrl) {
        // Without this, uploads would succeed but produce URLs that social
        // platforms cannot fetch - fail loudly rather than store a dead link.
        throw new BadRequestException(
          'R2_PUBLIC_BASE_URL is not configured. Set it to your bucket\'s public hostname (the r2.dev URL, or your custom domain) so uploaded media is reachable by Instagram, Facebook and TikTok.',
        );
      }

      this.provider = 'r2';
      this.bucket = r2Bucket;
      this.region = 'auto';
      this.publicBaseUrl = r2PublicBaseUrl.replace(/\/+$/, '');
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      });
      this.logger.log(`Object storage: Cloudflare R2 (bucket "${this.bucket}")`);
      return;
    }

    // Fall back to AWS S3.
    const [accessKeyId, secretAccessKey, bucket, region, endpoint, publicBase] =
      await Promise.all([
        this.credentialsService.get('AWS_ACCESS_KEY_ID'),
        this.credentialsService.get('AWS_SECRET_ACCESS_KEY'),
        this.credentialsService.get('AWS_S3_BUCKET'),
        this.credentialsService.get('AWS_S3_REGION'),
        // Set for S3-compatible stores (MinIO, Ceph, self-hosted gateways).
        this.credentialsService.get('S3_ENDPOINT'),
        this.credentialsService.get('S3_PUBLIC_BASE_URL'),
      ]);

    if (!accessKeyId || !secretAccessKey || !bucket) {
      if (localUploadsEnabled()) {
        this.provider = 'local';
        this.bucket = 'local';
        this.publicBaseUrl = `${(process.env.APP_URL || `http://localhost:${process.env.PORT || 3002}`).replace(/\/+$/, '')}${LOCAL_UPLOAD_ROUTE}`;
        this.logger.warn(`Object storage: local disk at ${LOCAL_UPLOAD_DIR} (LOCAL_UPLOADS=true, development only)`);
        return;
      }
      throw new BadRequestException(
        'Object storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_BASE_URL in admin credentials (or the AWS_* equivalents to use S3).',
      );
    }

    this.provider = 's3';
    this.bucket = bucket;
    this.region = region || 'ap-south-1';
    this.publicBaseUrl = publicBase
      ? publicBase.replace(/\/+$/, '')
      : endpoint
        ? `${endpoint.replace(/\/+$/, '')}/${bucket}`
        : `https://${bucket}.s3.${this.region}.amazonaws.com`;
    this.client = new S3Client({
      region: this.region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint
        ? { endpoint, forcePathStyle: true }
        : {}),
    });
    this.logger.log(`Object storage: AWS S3 (bucket "${this.bucket}")`);
  }

  private async put(key: string, body: Buffer, contentType: string) {
    if (this.provider === 'local') {
      const file = this.localPath(key);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, body);
      return `${this.publicBaseUrl}/${key}`;
    }
    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...(isActiveContent(contentType) ? { ContentDisposition: 'attachment' } : {}),
        // Cache generated assets aggressively; keys are content-unique.
        CacheControl: 'public, max-age=31536000, immutable',
        // R2 rejects ACLs outright, so only send one on S3.
        ...(this.provider === 's3' ? { ACL: 'public-read' as const } : {}),
      }),
    );

    return `${this.publicBaseUrl}/${key}`;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'uploads',
  ): Promise<UploadResult> {
    await this.initializeClient();

    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed types: JPEG, PNG, GIF, WebP, SVG',
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    const extension = (file.originalname.split('.').pop() || 'bin')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const key = `${folder}/${uuidv4()}.${extension}`;
    const url = await this.put(key, file.buffer, file.mimetype);

    return { url, key, bucket: this.bucket, provider: this.provider };
  }

  /**
   * Uploads an in-memory buffer, for assets this service produces itself
   * (rendered designs, generated thumbnails) rather than multipart uploads.
   */
  async uploadBuffer(
    buffer: Buffer,
    options: {
      folder?: string;
      extension?: string;
      contentType?: string;
      fileName?: string;
    } = {},
  ): Promise<UploadResult> {
    await this.initializeClient();

    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('No file data provided');
    }

    const maxSize = 25 * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw new BadRequestException('Generated file exceeds the 25MB limit');
    }

    const folder = options.folder || 'uploads';
    const extension = options.extension || 'png';
    const key = `${folder}/${options.fileName || uuidv4()}.${extension}`;
    const url = await this.put(
      key,
      buffer,
      options.contentType || 'application/octet-stream',
    );

    return { url, key, bucket: this.bucket, provider: this.provider };
  }

  /**
   * Returns the public URL when an object already exists, else null.
   *
   * Used for content-addressed assets such as generated artwork: the same brief
   * resolves to the same key, so a repeat request reuses the stored image
   * instead of paying a provider to redraw it.
   */
  async objectUrlIfExists(key: string): Promise<string | null> {
    await this.initializeClient();

    if (this.provider === 'local') {
      return existsSync(this.localPath(key)) ? `${this.publicBaseUrl}/${key}` : null;
    }

    try {
      await this.client!.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return `${this.publicBaseUrl}/${key}`;
    } catch (error) {
      const name = (error as any)?.name;
      const status = (error as any)?.$metadata?.httpStatusCode;
      if (name === 'NotFound' || name === 'NoSuchKey' || status === 404) {
        return null;
      }
      // A permissions or network problem must not be read as "absent", or we
      // would silently regenerate and overwrite on every call.
      this.logger.warn(
        `Could not check for "${key}" in ${this.provider}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /** Resolves a storage key under LOCAL_UPLOAD_DIR, refusing anything that escapes it. */
  private localPath(key: string): string {
    const file = path.resolve(LOCAL_UPLOAD_DIR, key);
    if (!file.startsWith(LOCAL_UPLOAD_DIR + path.sep)) {
      throw new BadRequestException('Invalid storage key');
    }
    return file;
  }

  async deleteFile(key: string): Promise<void> {
    if (!key) return;
    await this.initializeClient();

    if (this.provider === 'local') {
      await fs.rm(this.localPath(key), { force: true });
      return;
    }

    try {
      await this.client!.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete "${key}" from ${this.provider}: ${(error as Error).message}`,
      );
    }
  }

  /** Reports configuration state without throwing, for health checks. */
  async getStatus(): Promise<{
    configured: boolean;
    provider?: 'r2' | 's3' | 'local';
    bucket?: string;
    publicBaseUrl?: string;
    error?: string;
  }> {
    try {
      await this.initializeClient();
      return {
        configured: true,
        provider: this.provider,
        bucket: this.bucket,
        publicBaseUrl: this.publicBaseUrl,
      };
    } catch (error) {
      return { configured: false, error: (error as Error).message };
    }
  }

  async isConfigured(): Promise<boolean> {
    return (await this.getStatus()).configured;
  }

  /**
   * Recovers the object key from a stored URL. Handles both the R2 public
   * hostname and the S3 virtual-host form.
   */
  extractKeyFromUrl(url: string): string | null {
    if (!url) return null;
    try {
      return new URL(url).pathname.replace(/^\/+/, '') || null;
    } catch {
      return null;
    }
  }
}
