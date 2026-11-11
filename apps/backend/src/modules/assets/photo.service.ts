import { Injectable, Logger } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';

export interface StockPhoto {
  provider: 'pexels' | 'pixabay';
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  photographer: string | null;
  sourceUrl: string | null;
  /** Attribution the caller is obliged to display, or null when not required. */
  attribution: string | null;
}

export interface PhotoSearchResult {
  query: string;
  photos: StockPhoto[];
  providers: string[];
  notes: string[];
  /** Present when the query looks like it needs a model release. */
  warning?: string;
}

/**
 * Stock photo search across free providers.
 *
 * Deliberately conservative about people. Pexels, Pixabay and Unsplash all
 * grant broad commercial use, but none of them conveys a **model release** -
 * the depicted person has not agreed to endorse anything. Using a stock face in
 * healthcare, finance or legal marketing implies an endorsement that was never
 * given, and can defame the model as well as mislead the customer.
 *
 * So: queries that look like they are fishing for a person in a regulated
 * context are flagged, loudly, in the response.
 */
@Injectable()
export class PhotoService {
  private readonly logger = new Logger(PhotoService.name);

  /** Terms that imply a recognisable person is wanted. */
  private static readonly PERSON_TERMS = [
    'doctor',
    'dentist',
    'nurse',
    'surgeon',
    'physician',
    'patient',
    'therapist',
    'lawyer',
    'client',
    'customer',
    'model',
    'person',
    'people',
    'man',
    'woman',
    'child',
    'kid',
    'baby',
    'family',
    'staff',
    'team',
    'portrait',
    'face',
    'headshot',
  ];

  /** Sectors where an implied endorsement is most damaging. */
  private static readonly SENSITIVE_INDUSTRIES = [
    'healthcare',
    'finance',
    'legal',
    'insurance',
    'pharma',
  ];

  constructor(private credentialsService: CredentialsService) {}

  async search(
    query: string,
    options: { perPage?: number; industry?: string; orientation?: string } = {},
  ): Promise<PhotoSearchResult> {
    const perPage = Math.min(options.perPage ?? 12, 40);
    const notes: string[] = [];
    const providers: string[] = [];
    let photos: StockPhoto[] = [];

    const pexels = await this.searchPexels(query, perPage, options.orientation);
    photos = photos.concat(pexels.photos);
    if (pexels.photos.length > 0) providers.push('pexels');
    if (pexels.note) notes.push(pexels.note);

    if (photos.length < perPage) {
      const pixabay = await this.searchPixabay(query, perPage);
      photos = photos.concat(pixabay.photos);
      if (pixabay.photos.length > 0) providers.push('pixabay');
      if (pixabay.note) notes.push(pixabay.note);
    }

    return {
      query,
      photos: photos.slice(0, perPage),
      providers,
      notes,
      warning: this.modelReleaseWarning(query, options.industry),
    };
  }

  /**
   * Returns a warning when the search appears to want a photograph of a person
   * for a context where implied endorsement is a real risk.
   */
  modelReleaseWarning(query: string, industry?: string): string | undefined {
    const q = query.toLowerCase();
    const wantsPerson = PhotoService.PERSON_TERMS.some((t) => q.includes(t));
    if (!wantsPerson) return undefined;

    const sensitive = PhotoService.SENSITIVE_INDUSTRIES.includes(
      (industry || '').toLowerCase(),
    );

    const base =
      'These licences permit commercial use but do NOT include a model release. Do not present a stock person as your practitioner, staff member, client or patient.';

    return sensitive
      ? `${base} For ${industry} marketing this is a particular risk: it implies an endorsement the person never gave. Use the real practitioner's own photograph, or an illustration instead.`
      : base;
  }

  // ---------------------------------------------------------------

  private async searchPexels(
    query: string,
    perPage: number,
    orientation?: string,
  ): Promise<{ photos: StockPhoto[]; note?: string }> {
    const apiKey = await this.credentialsService.get('PEXELS_API_KEY');
    if (!apiKey) {
      return {
        photos: [],
        note: 'Pexels was not queried: set PEXELS_API_KEY in admin credentials (the API is free).',
      };
    }

    const params = new URLSearchParams({
      query,
      per_page: String(perPage),
    });
    if (orientation) params.set('orientation', orientation);

    try {
      const response = await fetch(
        `https://api.pexels.com/v1/search?${params.toString()}`,
        {
          headers: { Authorization: apiKey },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!response.ok) {
        return { photos: [], note: `Pexels returned ${response.status}` };
      }

      const data = (await response.json()) as any;
      const photos: StockPhoto[] = (data.photos || []).map((p: any) => ({
        provider: 'pexels' as const,
        id: String(p.id),
        url: p.src?.large2x || p.src?.large || p.src?.original,
        thumbnailUrl: p.src?.medium || p.src?.small,
        width: p.width,
        height: p.height,
        photographer: p.photographer ?? null,
        sourceUrl: p.url ?? null,
        // Pexels' API terms require crediting Pexels and the photographer.
        attribution: p.photographer
          ? `Photo by ${p.photographer} on Pexels`
          : 'Photo on Pexels',
      }));

      return { photos };
    } catch (error) {
      this.logger.warn(`Pexels request failed: ${(error as Error).message}`);
      return { photos: [], note: `Pexels request failed: ${(error as Error).message}` };
    }
  }

  private async searchPixabay(
    query: string,
    perPage: number,
  ): Promise<{ photos: StockPhoto[]; note?: string }> {
    const apiKey = await this.credentialsService.get('PIXABAY_API_KEY');
    if (!apiKey) {
      return {
        photos: [],
        note: 'Pixabay was not queried: set PIXABAY_API_KEY in admin credentials (the API is free).',
      };
    }

    const params = new URLSearchParams({
      key: apiKey,
      q: query,
      image_type: 'photo',
      safesearch: 'true',
      per_page: String(Math.max(perPage, 3)),
    });

    try {
      const response = await fetch(
        `https://pixabay.com/api/?${params.toString()}`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok) {
        return { photos: [], note: `Pixabay returned ${response.status}` };
      }

      const data = (await response.json()) as any;
      const photos: StockPhoto[] = (data.hits || []).map((h: any) => ({
        provider: 'pixabay' as const,
        id: String(h.id),
        url: h.largeImageURL || h.webformatURL,
        thumbnailUrl: h.previewURL || h.webformatURL,
        width: h.imageWidth,
        height: h.imageHeight,
        photographer: h.user ?? null,
        sourceUrl: h.pageURL ?? null,
        // The Pixabay Content Licence does not require attribution.
        attribution: null,
      }));

      return { photos };
    } catch (error) {
      this.logger.warn(`Pixabay request failed: ${(error as Error).message}`);
      return {
        photos: [],
        note: `Pixabay request failed: ${(error as Error).message}`,
      };
    }
  }
}
