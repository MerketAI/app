import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as sharp from 'sharp';
import { UploadService } from '../upload/upload.service';
import { LibraryService } from '../library/library.service';

export interface IngestedPhoto {
  url: string;
  key: string;
  width: number;
  height: number;
  /** Credit text that must be displayed, when the source requires one. */
  attribution: string | null;
  sourceUrl: string | null;
  cached: boolean;
}

export type PhotoFit = 'hero' | 'square' | 'portrait' | 'wide';

/** Target boxes for the masked photo slots templates expose. */
const FIT_SIZES: Record<PhotoFit, { width: number; height: number }> = {
  hero: { width: 1600, height: 1100 },
  square: { width: 1200, height: 1200 },
  portrait: { width: 1100, height: 1500 },
  wide: { width: 2000, height: 900 },
};

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/**
 * Brings third-party photography into our own storage before it is used in a
 * design.
 *
 * Hotlinking a stock CDN from the renderer is wrong on three counts: the render
 * silently breaks if the remote 404s or rate-limits, Pexels and Pixabay both ask
 * that you not hammer their CDN at scale, and the design stops being
 * reproducible the moment the upstream URL rotates. So the bytes are fetched
 * once, normalised, and stored content-addressed.
 */
@Injectable()
export class PhotoIngestService {
  private readonly logger = new Logger(PhotoIngestService.name);

  constructor(private uploadService: UploadService, private library: LibraryService) {}

  /**
   * Downloads, re-encodes and stores a photo. Identical source + fit reuses the
   * stored object rather than downloading again.
   */
  async ingest(
    userId: string,
    sourceUrl: string,
    options: {
      fit?: PhotoFit;
      attribution?: string | null;
      sourcePage?: string | null;
      /** Focus the crop, for portraits where the face is off-centre. */
      position?: 'centre' | 'top' | 'attention';
    } = {},
  ): Promise<IngestedPhoto> {
    const fit = options.fit || 'hero';
    const box = FIT_SIZES[fit];

    this.assertFetchable(sourceUrl);

    const hash = createHash('sha256')
      .update(`${sourceUrl}|${fit}|${options.position || 'attention'}`)
      .digest('hex')
      .slice(0, 32);
    const key = `photos/${userId}/${hash}.jpg`;

    const existing = await this.uploadService.objectUrlIfExists(key);
    if (existing) {
      return {
        url: existing,
        key,
        width: box.width,
        height: box.height,
        attribution: options.attribution ?? null,
        sourceUrl: options.sourcePage ?? null,
        cached: true,
      };
    }

    const source = await this.download(sourceUrl);

    // `attention` crops toward the most visually salient region, which for
    // portraits is usually the face - a centre crop routinely decapitates.
    const position =
      options.position === 'top'
        ? sharp.gravity.north
        : options.position === 'centre'
          ? sharp.gravity.centre
          : sharp.strategy.attention;

    let processed: Buffer;
    try {
      processed = await sharp(source)
        .rotate() // honour EXIF orientation
        .resize(box.width, box.height, { fit: 'cover', position })
        .jpeg({ quality: 86, mozjpeg: true })
        .toBuffer();
    } catch (error) {
      throw new BadRequestException(
        `Could not process that image: ${(error as Error).message}`,
      );
    }

    const upload = await this.uploadService.uploadBuffer(processed, {
      folder: `photos/${userId}`,
      fileName: hash,
      extension: 'jpg',
      contentType: 'image/jpeg',
    });
    await this.library.recordQuietly(userId, {
      kind: 'stock',
      folder: 'stock/photos',
      url: upload.url,
      storageKey: upload.key,
      mimeType: 'image/jpeg',
      extension: 'jpg',
      sizeBytes: processed.length,
      width: box.width,
      height: box.height,
      source: (() => { try { return new URL(sourceUrl).hostname; } catch { return 'stock'; } })(),
      metadata: { sourceUrl, sourcePage: options.sourcePage ?? null, attribution: options.attribution ?? null, fit },
    });

    return {
      url: upload.url,
      key: upload.key,
      width: box.width,
      height: box.height,
      attribution: options.attribution ?? null,
      sourceUrl: options.sourcePage ?? null,
      cached: false,
    };
  }

  /** Stores an already-transparent cutout without flattening its alpha. */
  async storeCutout(
    userId: string,
    buffer: Buffer,
    options: { fileName?: string; maxHeight?: number } = {},
  ): Promise<IngestedPhoto> {
    const maxHeight = options.maxHeight ?? 1600;

    const processed = await sharp(buffer)
      .rotate()
      .resize({ height: maxHeight, withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();

    const hash =
      options.fileName ||
      createHash('sha256').update(processed).digest('hex').slice(0, 32);

    const upload = await this.uploadService.uploadBuffer(processed, {
      folder: `cutouts/${userId}`,
      fileName: hash,
      extension: 'png',
      contentType: 'image/png',
    });
    await this.library.recordQuietly(userId, {
      kind: 'cutout',
      url: upload.url,
      storageKey: upload.key,
      mimeType: 'image/png',
      extension: 'png',
      sizeBytes: processed.length,
      source: 'cutout',
      metadata: { transparent: true },
    });

    const meta = await sharp(processed).metadata();

    return {
      url: upload.url,
      key: upload.key,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      attribution: null,
      sourceUrl: null,
      cached: false,
    };
  }

  /**
   * Rejects anything that is not a plain public http(s) URL.
   *
   * Without this the endpoint is a server-side request forgery primitive: a
   * caller could point it at 169.254.169.254 or an internal host and have the
   * server fetch it on their behalf.
   */
  private assertFetchable(rawUrl: string): void {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Photo URL must be absolute.');
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new BadRequestException('Photo URL must be http or https.');
    }

    const host = parsed.hostname.toLowerCase();
    const blocked =
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host);

    if (blocked) {
      throw new BadRequestException(
        `Refusing to fetch from "${host}": only public hosts are allowed.`,
      );
    }
  }

  private async download(url: string): Promise<Buffer> {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'jasper-marketing/1.0' },
      signal: AbortSignal.timeout(20000),
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new BadRequestException(
        `Could not download that photo (HTTP ${response.status}).`,
      );
    }

    const type = response.headers.get('content-type') || '';
    if (!type.startsWith('image/')) {
      throw new BadRequestException(
        `That URL returned "${type || 'no content type'}", not an image.`,
      );
    }

    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_SOURCE_BYTES) {
      throw new BadRequestException('That image exceeds the 20MB limit.');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_SOURCE_BYTES) {
      throw new BadRequestException('That image exceeds the 20MB limit.');
    }
    return buffer;
  }
}
