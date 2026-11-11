import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { CredentialsService } from '../credentials/credentials.service';
import { UploadService } from '../upload/upload.service';
import { LibraryFiling, LibraryService } from '../library/library.service';

export type ImageProviderName = 'magnific' | 'openai' | 'gemini';

export type ArtworkAspect = 'square' | 'portrait' | 'landscape';

export interface ArtworkRequest {
  /** What the picture shows. Never contains a real person's name - see below. */
  subject: string;
  industry?: string;
  /** Hex brand colour to steer the palette. */
  brandColor?: string;
  aspect?: ArtworkAspect;
  style?: 'illustration' | 'photographic' | 'flat-vector' | '3d';
  /** Transparent PNG, for compositing over a layout. OpenAI only. */
  transparent?: boolean;
  provider?: ImageProviderName;
  /** Where the subject goes, leaving the rest clear for the text layer. */
  composition?: 'subject-right' | 'subject-bottom';
  /** How to file the picture in the library: folder, title, tags, notes. */
  filing?: Partial<LibraryFiling>;
}

export interface ArtworkResult {
  url: string;
  key: string;
  /** The picture's entry in the asset library, when filing succeeded. */
  libraryId?: string;
  provider: ImageProviderName;
  prompt: string;
  cached: boolean;
  aspect: ArtworkAspect;
  warnings: string[];
}

/**
 * Generates the *artwork* layer of a design - the illustrated scene or
 * background - and stores it for compositing.
 *
 * Two rules are enforced here rather than left to prompt discipline, because
 * both have caused real harm in marketing tooling:
 *
 *  1. **The model never draws text.** Diffusion models garble letterforms, and
 *     a mangled phone number on a clinic's printed flyer is a genuine problem.
 *     Copy, contact details and logos are composited as HTML on top, where they
 *     are exact and editable. The prompt says so, repeatedly and negatively.
 *
 *  2. **The model never depicts a named real person.** Asking for "Dr. Mohit
 *     Gupta" fabricates a likeness of a real, identifiable individual and
 *     presents it as them. Names are stripped from the subject and the prompt
 *     explicitly asks for a generic, non-identifiable figure.
 */
@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);

  /** Aspect -> the nearest size each provider actually supports. */
  private static readonly OPENAI_SIZES: Record<ArtworkAspect, string> = {
    square: '1024x1024',
    portrait: '1024x1536',
    landscape: '1536x1024',
  };

  private static readonly STYLE_DIRECTIVES: Record<string, string> = {
    illustration:
      'warm modern editorial illustration, soft rounded shapes, gentle shading, friendly and approachable',
    'flat-vector':
      'clean flat vector illustration, simple geometric shapes, minimal detail, generous negative space',
    photographic:
      'bright natural photography, soft diffused daylight, shallow depth of field, candid and unposed',
    '3d': 'soft 3D render, matte clay materials, rounded forms, gentle studio lighting',
  };

  /**
   * Repeated and varied because a single "no text" rarely holds. Ideogram and
   * gpt-image-1 in particular will happily add signage unless pushed hard.
   */
  private static readonly NO_TEXT_CLAUSE =
    'ABSOLUTELY NO TEXT of any kind: no words, no letters, no numbers, no captions, no labels, no signage, no logos, no watermarks, no signatures, no UI elements. The image must be purely pictorial.';

  private static readonly NO_LIKENESS_CLAUSE =
    'Any people shown must be generic and non-identifiable, not a specific or recognisable real individual, and not a celebrity or public figure.';

  constructor(
    private credentialsService: CredentialsService,
    private uploadService: UploadService,
    private library: LibraryService,
  ) {}

  /** Magnific (formerly the Freepik API); MAGNIFY_API_KEY is accepted as an alias. */
  private async magnificKey(): Promise<string> {
    return (
      (await this.credentialsService.get('MAGNIFIC_API_KEY')) ||
      (await this.credentialsService.get('MAGNIFY_API_KEY'))
    );
  }

  /** Providers that currently have credentials, in order of preference. */
  async availableProviders(): Promise<ImageProviderName[]> {
    const [magnific, openai, gemini] = await Promise.all([
      this.magnificKey(),
      this.credentialsService.get('OPENAI_API_KEY'),
      this.credentialsService.get('GEMINI_API_KEY'),
    ]);
    const available: ImageProviderName[] = [];
    if (magnific) available.push('magnific');
    if (openai) available.push('openai');
    if (gemini) available.push('gemini');
    return available;
  }

  async generate(userId: string, request: ArtworkRequest): Promise<ArtworkResult> {
    const warnings: string[] = [];
    const aspect = request.aspect || 'landscape';

    const { subject, strippedNames } = this.sanitiseSubject(request.subject);
    if (strippedNames.length > 0) {
      warnings.push(
        `Removed name-like terms from the artwork prompt (${strippedNames.join(', ')}). Generated imagery must not depict a named real person; composite a real photograph instead if you need the practitioner shown.`,
      );
    }

    const prompt = this.buildPrompt({ ...request, subject }, aspect);

    const available = await this.availableProviders();
    if (available.length === 0) {
      throw new BadRequestException(
        'No image generation provider is configured. Set MAGNIFIC_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY in admin credentials.',
      );
    }

    const provider =
      request.provider && available.includes(request.provider)
        ? request.provider
        : available[0];

    if (request.provider && provider !== request.provider) {
      warnings.push(
        `Requested provider "${request.provider}" is not configured; used "${provider}" instead.`,
      );
    }

    // Deterministic key: the same brief for the same tenant reuses the stored
    // artwork rather than paying to regenerate a near-identical picture.
    const hash = createHash('sha256')
      .update(`${provider}|${aspect}|${request.transparent ? 't' : 'o'}|${prompt}`)
      .digest('hex')
      .slice(0, 32);
    const key = `artwork/${userId}/${hash}.png`;

    const file = (url: string, storageKey: string, bytes?: Buffer) =>
      this.library.recordQuietly(userId, {
        ...request.filing,
        kind: 'artwork',
        url,
        storageKey,
        mimeType: 'image/png',
        extension: 'png',
        sizeBytes: bytes?.length,
        contentHash: bytes ? createHash('sha256').update(bytes).digest('hex') : undefined,
        source: provider,
        prompt,
        scene: subject,
        metadata: { ...(request.filing?.metadata || {}), aspect, style: request.style || 'illustration' },
      });

    const existing = await this.uploadService.objectUrlIfExists(key);
    if (existing) {
      const filed = await file(existing, key);
      return {
        url: existing,
        key,
        libraryId: filed?.id,
        provider,
        prompt,
        cached: true,
        aspect,
        warnings,
      };
    }

    if (request.transparent && provider !== 'openai') {
      warnings.push(`A transparent background is only supported by OpenAI; "${provider}" returned an opaque image.`);
    }

    const buffer =
      provider === 'magnific'
        ? await this.generateWithMagnific(prompt, aspect, request.style)
        : provider === 'openai'
          ? await this.generateWithOpenAI(prompt, aspect, request.transparent)
          : await this.generateWithGemini(prompt);

    const upload = await this.uploadService.uploadBuffer(buffer, {
      folder: `artwork/${userId}`,
      fileName: hash,
      extension: 'png',
      contentType: 'image/png',
    });
    const filed = await file(upload.url, upload.key, buffer);

    return {
      url: upload.url,
      key: upload.key,
      libraryId: filed?.id,
      provider,
      prompt,
      cached: false,
      aspect,
      warnings,
    };
  }

  // ---------------------------------------------------------------
  // Prompt construction
  // ---------------------------------------------------------------

  buildPrompt(request: ArtworkRequest, aspect: ArtworkAspect): string {
    const style =
      ImageGenerationService.STYLE_DIRECTIVES[request.style || 'illustration'];

    const parts: string[] = [
      `Style: ${style}.`,
      `Scene: ${request.subject}.`,
    ];

    if (request.industry) {
      parts.push(
        `Context: ${request.industry}. The mood should feel trustworthy, calm and welcoming rather than clinical or corporate.`,
      );
    }

    if (request.brandColor) {
      parts.push(
        `Colour palette built around ${request.brandColor}, with soft complementary tones and plenty of light.`,
      );
    }

    // Composition guidance matters because the text layer is composited over
    // this: the subject must not occupy the region the copy will sit in.
    parts.push(
      request.composition === 'subject-right'
        // The post layout crops a central vertical strip of this into its photo
        // panel, so ask for a centred subject with room around it. (Asking
        // models to place a subject off-centre proved unreliable.)
        ? 'Composition: a single main subject, centred horizontally, framed from the waist up with the head in the upper third and clear space above it; plain, softly lit background.'
        : request.composition === 'subject-bottom' || aspect === 'portrait'
          ? 'Composition: subject in the lower two-thirds, uncluttered open space at the top.'
          : 'Composition: subject to one side, with generous uncluttered open space on the opposite side.',
    );

    parts.push(
      request.transparent
        ? 'Isolated subject on a fully transparent background, clean edges, no ground shadow.'
        : 'Soft, simple, low-contrast background that does not compete with overlaid content.',
    );

    parts.push(ImageGenerationService.NO_TEXT_CLAUSE);
    parts.push(ImageGenerationService.NO_LIKENESS_CLAUSE);

    return parts.join(' ');
  }

  /**
   * Strips personal-name-like tokens (titles and the capitalised words that
   * follow them) so the model is never asked for a specific person's likeness.
   */
  sanitiseSubject(subject: string): { subject: string; strippedNames: string[] } {
    const stripped: string[] = [];

    // "Dr. Mohit Gupta", "Doctor Jane Smith", "Mr Patel".
    //
    // Titles are listed in both written forms rather than using the `i` flag:
    // `i` would also make [A-Z][a-z]+ case-insensitive, so the name group
    // greedily swallowed the ordinary words that followed it.
    const titled =
      /\b(Dr|Doctor|dr|doctor|Mr|Mrs|Ms|Miss|Prof|Professor)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;

    // Keep the role, drop the identity: the title still conveys the scene.
    const ROLE_FOR_TITLE: Record<string, string> = {
      dr: 'a doctor',
      doctor: 'a doctor',
      prof: 'a professor',
      professor: 'a professor',
    };

    let cleaned = subject.replace(titled, (_match, title, name) => {
      stripped.push(String(name));
      const key = String(title).toLowerCase().replace('.', '');
      return ROLE_FOR_TITLE[key] || 'a person';
    });
    // A bare "Firstname Lastname" pair is also treated as a name.
    cleaned = cleaned.replace(
      /\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b/g,
      (match) => {
        stripped.push(match);
        return 'a person';
      },
    );

    return { subject: cleaned.trim(), strippedNames: stripped };
  }

  // ---------------------------------------------------------------
  // Providers
  // ---------------------------------------------------------------

  private async generateWithOpenAI(
    prompt: string,
    aspect: ArtworkAspect,
    transparent?: boolean,
  ): Promise<Buffer> {
    const apiKey = await this.credentialsService.get('OPENAI_API_KEY');
    // Azure OpenAI and corporate gateways expose the same API elsewhere.
    const baseUrl =
      (await this.credentialsService.get('OPENAI_BASE_URL')) ||
      'https://api.openai.com/v1';

    const body: Record<string, any> = {
      // Not every key has every image model (some only have gpt-image-1.5/2).
      model: (await this.credentialsService.get('OPENAI_IMAGE_MODEL')) || 'gpt-image-1',
      prompt,
      size: ImageGenerationService.OPENAI_SIZES[aspect],
      n: 1,
    };
    // gpt-image-1 needs a transparent-capable format for background removal.
    if (transparent) {
      body.background = 'transparent';
      body.output_format = 'png';
    }

    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    const data = (await response.json()) as any;

    if (!response.ok || data.error) {
      const message = data?.error?.message || `HTTP ${response.status}`;
      this.logger.error(`OpenAI image generation failed: ${message}`);
      throw new BadRequestException(`Image generation failed: ${message}`);
    }

    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      throw new BadRequestException(
        'Image generation returned no image data.',
      );
    }
    return Buffer.from(b64, 'base64');
  }

  /** Aspect -> Magnific Mystic's named ratios, matched to the OpenAI sizes. */
  private static readonly MAGNIFIC_ASPECTS: Record<ArtworkAspect, string> = {
    square: 'square_1_1',
    portrait: 'portrait_2_3',
    landscape: 'standard_3_2',
  };

  /**
   * Magnific Mystic. Jobs are asynchronous: submit, then poll the task until it
   * completes. Polling rather than a webhook keeps this working on a developer
   * machine, which Magnific cannot call back.
   */
  private async generateWithMagnific(
    prompt: string,
    aspect: ArtworkAspect,
    style?: ArtworkRequest['style'],
  ): Promise<Buffer> {
    const apiKey = await this.magnificKey();
    const base =
      ((await this.credentialsService.get('MAGNIFIC_API_URL')) || 'https://api.magnific.com/v1/ai').replace(/\/+$/, '');
    const headers = { 'Content-Type': 'application/json', 'x-magnific-api-key': apiKey };
    const fail = (message: string): never => {
      this.logger.error(`Magnific image generation failed: ${message}`);
      throw new BadRequestException(`Image generation failed: ${message}`);
    };

    const submit = await fetch(`${base}/mystic`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        // "realism" for photographs; "fluid" handles illustration styles better.
        model: style === 'photographic' ? 'realism' : 'fluid',
        aspect_ratio: ImageGenerationService.MAGNIFIC_ASPECTS[aspect],
        resolution: '2k',
      }),
      signal: AbortSignal.timeout(30000),
    });
    const submitted = (await submit.json().catch(() => ({}))) as any;
    const taskId = submitted?.data?.task_id;
    if (!submit.ok || !taskId) {
      fail(submitted?.message || `HTTP ${submit.status}`);
    }

    const deadline = Date.now() + 150000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const poll = await fetch(`${base}/mystic/${taskId}`, {
        headers,
        signal: AbortSignal.timeout(30000),
      });
      const task = ((await poll.json().catch(() => ({}))) as any)?.data || {};
      if (task.status === 'FAILED') fail('the task failed');
      if (task.status === 'COMPLETED') {
        const url = task.generated?.[0];
        if (!url) fail('the task returned no image');
        const image = await fetch(url, { signal: AbortSignal.timeout(60000) });
        if (!image.ok) fail(`could not download the image (HTTP ${image.status})`);
        return Buffer.from(await image.arrayBuffer());
      }
    }
    return fail('timed out after 150 seconds');
  }

  private async generateWithGemini(prompt: string): Promise<Buffer> {
    const apiKey = await this.credentialsService.get('GEMINI_API_KEY');
    const model = 'gemini-2.5-flash-image';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
        signal: AbortSignal.timeout(120000),
      },
    );

    const data = (await response.json()) as any;

    if (!response.ok || data.error) {
      const message = data?.error?.message || `HTTP ${response.status}`;
      this.logger.error(`Gemini image generation failed: ${message}`);
      throw new BadRequestException(`Image generation failed: ${message}`);
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const inline = parts.find((p: any) => p.inlineData?.data)?.inlineData;
    if (!inline?.data) {
      throw new BadRequestException('Image generation returned no image data.');
    }
    return Buffer.from(inline.data, 'base64');
  }
}
