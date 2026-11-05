import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';
import { PhotoIngestService, IngestedPhoto } from './photo-ingest.service';

export type CutoutProvider = 'removebg' | 'local' | 'none';

export interface CutoutResult extends IngestedPhoto {
  provider: CutoutProvider;
  warnings: string[];
}

/**
 * Turns a photograph of a practitioner into a transparent cutout, the figure
 * that stands over the layout in most clinic creative.
 *
 * Deliberately provider-based, because the licensing here is not uniform:
 *
 *  - **remove.bg** is a paid API with plain commercial terms. Implemented, and
 *    the recommended default for a product sold to customers.
 *  - **A local ONNX model** (@imgly/background-removal-node, rembg) avoids the
 *    per-image cost, but @imgly ships a custom licence - "SEE LICENSE IN
 *    LICENSE.md" rather than an SPDX identifier - and model weights carry their
 *    own terms. That is a decision for whoever owns the commercial risk, so it
 *    is loaded dynamically and only used if deliberately installed.
 *  - **none** - the tenant uploads a transparent PNG they already own. Always
 *    available, and the only path with no third-party question at all.
 */
@Injectable()
export class CutoutService {
  private readonly logger = new Logger(CutoutService.name);

  constructor(
    private credentialsService: CredentialsService,
    private photoIngestService: PhotoIngestService,
  ) {}

  async availableProviders(): Promise<CutoutProvider[]> {
    const providers: CutoutProvider[] = [];
    if (await this.credentialsService.get('REMOVEBG_API_KEY')) {
      providers.push('removebg');
    }
    if (await this.localModuleAvailable()) providers.push('local');
    return providers;
  }

  /**
   * Produces a cutout from an uploaded image buffer.
   *
   * When no remover is configured the original is stored unchanged, so a
   * tenant who uploads an already-transparent PNG still gets a usable asset.
   */
  async cutout(
    userId: string,
    image: Buffer,
    options: { provider?: CutoutProvider } = {},
  ): Promise<CutoutResult> {
    const warnings: string[] = [];
    const available = await this.availableProviders();

    const provider: CutoutProvider =
      options.provider && available.includes(options.provider)
        ? options.provider
        : available[0] || 'none';

    if (options.provider && provider !== options.provider) {
      warnings.push(
        `Requested remover "${options.provider}" is not configured; used "${provider}".`,
      );
    }

    let output = image;

    if (provider === 'removebg') {
      output = await this.removeWithRemoveBg(image);
    } else if (provider === 'local') {
      output = await this.removeWithLocalModel(image);
    } else {
      warnings.push(
        'No background remover is configured, so the image was stored unchanged. Set REMOVEBG_API_KEY, or upload a PNG that already has a transparent background.',
      );
    }

    const stored = await this.photoIngestService.storeCutout(userId, output);
    return { ...stored, provider, warnings };
  }

  // ---------------------------------------------------------------

  private async removeWithRemoveBg(image: Buffer): Promise<Buffer> {
    const apiKey = await this.credentialsService.get('REMOVEBG_API_KEY');

    const form = new FormData();
    form.append('image_file', new Blob([new Uint8Array(image)]), 'upload.png');
    form.append('size', 'auto');
    // "person" is the right hint for practitioner portraits and is markedly
    // more reliable than auto-detection on clinical backgrounds.
    form.append('type', 'person');
    form.append('format', 'png');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: form,
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as any;
        detail = body?.errors?.[0]?.title || detail;
      } catch {
        // Non-JSON error body; the status is enough.
      }
      this.logger.error(`remove.bg failed: ${detail}`);
      throw new BadRequestException(`Background removal failed: ${detail}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  private async removeWithLocalModel(image: Buffer): Promise<Buffer> {
    const mod = await this.loadLocalModule();
    if (!mod) {
      throw new BadRequestException(
        'The local background remover is not installed.',
      );
    }

    try {
      const blob = await mod.removeBackground(
        new Blob([new Uint8Array(image)]),
      );
      return Buffer.from(await blob.arrayBuffer());
    } catch (error) {
      this.logger.error(
        `Local background removal failed: ${(error as Error).message}`,
      );
      throw new BadRequestException(
        `Background removal failed: ${(error as Error).message}`,
      );
    }
  }

  private async localModuleAvailable(): Promise<boolean> {
    return (await this.loadLocalModule()) !== null;
  }

  /** Dynamic import so the app builds and boots without the optional module. */
  private async loadLocalModule(): Promise<any | null> {
    try {
      const mod = await (Function(
        'return import("@imgly/background-removal-node")',
      )() as Promise<any>);
      return mod?.removeBackground ? mod : (mod?.default ?? null);
    } catch {
      return null;
    }
  }
}
