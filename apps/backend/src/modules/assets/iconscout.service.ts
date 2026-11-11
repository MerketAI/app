import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { CredentialsService } from '../credentials/credentials.service';
import { UploadService } from '../upload/upload.service';
import { LibraryService } from '../library/library.service';

export type IconScoutAsset = 'illustration' | '3d' | 'lottie' | 'icon';

export interface IconScoutItem {
  uuid: string;
  name: string;
  asset: IconScoutAsset;
  previewUrl: string | null;
  /** IconScout page for the asset, for licence records. */
  sourceUrl: string | null;
  isPremium: boolean;
  formats: string[];
}

export interface IconScoutSearchResult {
  query: string;
  asset: IconScoutAsset;
  items: IconScoutItem[];
  /** Populated when the call could not be made or returned an error. */
  note?: string;
}

export interface StoredAsset {
  url: string;
  key: string;
  uuid: string;
  format: string;
  cached: boolean;
  sourceUrl: string | null;
}

const API_BASE = 'https://api.iconscout.com/v3';

/**
 * IconScout: the paid source for illustrations, 3D objects and Lottie files.
 *
 * This fills the gap the free libraries leave. Iconify covers icons well, but
 * there is no free API for *illustrations* - unDraw publishes none, and
 * Storyset requires per-asset attribution that is awkward to surface on a
 * customer's printed flyer.
 *
 * Two caveats the operator must settle, not this code:
 *
 *  1. **API access may be a separate plan** from an asset-download subscription.
 *     If it is not included, every call here returns 401/403 and the design
 *     falls back to generated shapes.
 *  2. **The licence must permit redistribution inside customer deliverables.**
 *     Jasper is sold to partner platforms whose subscribers publish the output
 *     commercially - the asset ends up in thousands of third parties' ads. That
 *     is materially different from one designer using it in one project, and
 *     standard licences frequently exclude it. Confirm with IconScout before
 *     enabling this in production.
 *
 * Downloaded assets are copied into our own storage: the design HTML must not
 * depend on a third-party CDN at render time, and a stored copy is what makes a
 * design reproducible.
 */
@Injectable()
export class IconScoutService {
  private readonly logger = new Logger(IconScoutService.name);

  constructor(
    private credentialsService: CredentialsService,
    private uploadService: UploadService,
    private library: LibraryService,
  ) {}

  async isConfigured(): Promise<boolean> {
    return Boolean(await this.credentialsService.get('ICONSCOUT_CLIENT_ID'));
  }

  async search(
    query: string,
    options: { asset?: IconScoutAsset; perPage?: number; premium?: boolean } = {},
  ): Promise<IconScoutSearchResult> {
    const asset = options.asset || 'illustration';
    const clientId = await this.credentialsService.get('ICONSCOUT_CLIENT_ID');

    if (!clientId) {
      return {
        query,
        asset,
        items: [],
        note: 'IconScout is not configured. Set ICONSCOUT_CLIENT_ID in admin credentials.',
      };
    }

    const params = new URLSearchParams({
      query,
      product_type: 'item',
      asset,
      per_page: String(Math.min(options.perPage ?? 12, 50)),
      sort: 'relevant',
    });
    if (options.premium === false) params.set('price', 'free');

    try {
      const response = await fetch(`${API_BASE}/search?${params.toString()}`, {
        headers: this.authHeaders(clientId),
        signal: AbortSignal.timeout(15000),
      });

      const body = await response.text();

      if (!response.ok) {
        // Surface the provider's own message: the auth contract is the most
        // likely thing to be wrong, and a generic failure hides that.
        this.logger.warn(
          `IconScout search failed (${response.status}): ${body.slice(0, 200)}`,
        );
        return {
          query,
          asset,
          items: [],
          note: `IconScout returned ${response.status}: ${body.slice(0, 200)}`,
        };
      }

      const data = JSON.parse(body);
      const items = (data?.response?.items?.data || data?.data || []).map(
        (raw: any): IconScoutItem => ({
          uuid: String(raw.uuid ?? raw.id ?? ''),
          name: String(raw.name ?? ''),
          asset,
          previewUrl:
            raw.urls?.thumb ||
            raw.urls?.preview ||
            raw.preview_url ||
            null,
          sourceUrl: raw.url ?? null,
          isPremium: Boolean(raw.price ?? raw.is_premium),
          formats: raw.formats ?? [],
        }),
      );

      return { query, asset, items };
    } catch (error) {
      this.logger.warn(`IconScout search error: ${(error as Error).message}`);
      return {
        query,
        asset,
        items: [],
        note: `IconScout request failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Downloads an asset and stores it. Content-addressed by uuid+format, so the
   * same asset is only ever paid for and fetched once.
   */
  async download(
    userId: string,
    uuid: string,
    options: { format?: string } = {},
  ): Promise<StoredAsset> {
    const format = options.format || 'svg';
    const clientId = await this.credentialsService.get('ICONSCOUT_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException(
        'IconScout is not configured. Set ICONSCOUT_CLIENT_ID in admin credentials.',
      );
    }

    const hash = createHash('sha256')
      .update(`${uuid}|${format}`)
      .digest('hex')
      .slice(0, 32);
    const key = `iconscout/${userId}/${hash}.${format}`;

    const existing = await this.uploadService.objectUrlIfExists(key);
    if (existing) {
      return { url: existing, key, uuid, format, cached: true, sourceUrl: null };
    }

    // The download endpoint hands back a signed URL rather than the bytes.
    const meta = await fetch(
      `${API_BASE}/items/${encodeURIComponent(uuid)}/api-download?format=${encodeURIComponent(format)}`,
      { headers: this.authHeaders(clientId), signal: AbortSignal.timeout(20000) },
    );

    const metaBody = await meta.text();
    if (!meta.ok) {
      this.logger.error(
        `IconScout download failed (${meta.status}): ${metaBody.slice(0, 200)}`,
      );
      throw new BadRequestException(
        `IconScout download failed (${meta.status}): ${metaBody.slice(0, 200)}`,
      );
    }

    let downloadUrl: string | null = null;
    try {
      const parsed = JSON.parse(metaBody);
      downloadUrl =
        parsed?.response?.download?.url ||
        parsed?.response?.url ||
        parsed?.download_url ||
        null;
    } catch {
      downloadUrl = null;
    }

    if (!downloadUrl) {
      throw new BadRequestException(
        'IconScout did not return a download URL. The API response shape may have changed; the raw body was logged.',
      );
    }

    const file = await fetch(downloadUrl, {
      signal: AbortSignal.timeout(30000),
    });
    if (!file.ok) {
      throw new BadRequestException(
        `Could not fetch the IconScout asset (HTTP ${file.status}).`,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await this.uploadService.uploadBuffer(buffer, {
      folder: `iconscout/${userId}`,
      fileName: hash,
      extension: format,
      contentType: this.contentTypeFor(format),
    });
    // Lottie animations are JSON, so they file as json; icons as svg/png.
    await this.library.recordQuietly(userId, {
      kind: 'icon',
      url: upload.url,
      storageKey: upload.key,
      mimeType: this.contentTypeFor(format),
      extension: format,
      sizeBytes: buffer.length,
      source: 'iconscout',
      metadata: { iconscoutUuid: uuid },
    });

    return {
      url: upload.url,
      key: upload.key,
      uuid,
      format,
      cached: false,
      sourceUrl: null,
    };
  }

  /**
   * The header name is not verifiable without a live key, so both documented
   * spellings are sent. Harmless if one is ignored.
   */
  private authHeaders(clientId: string): Record<string, string> {
    return {
      'Client-ID': clientId,
      'client-id': clientId,
      Accept: 'application/json',
      'User-Agent': 'jasper-marketing/1.0',
    };
  }

  private contentTypeFor(format: string): string {
    switch (format.toLowerCase()) {
      case 'svg':
        return 'image/svg+xml';
      case 'png':
        return 'image/png';
      case 'json':
      case 'lottie':
        return 'application/json';
      case 'gif':
        return 'image/gif';
      default:
        return 'application/octet-stream';
    }
  }
}
