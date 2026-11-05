import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { CredentialsService } from '../credentials/credentials.service';
import { UploadService } from '../upload/upload.service';

export type ImageProviderName = 'openai' | 'gemini';

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
}

export interface ArtworkResult {
  url: string;
  key: string;
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
  ) {}

  /** Providers that currently have credentials. */
  async availableProviders(): Promise<ImageProviderName[]> {
    const [openai, gemini] = await Promise.all([
      this.credentialsService.get('OPENAI_API_KEY'),
      this.credentialsService.get('GEMINI_API_KEY'),
    ]);
    const available: ImageProviderName[] = [];
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
        'No image generation provider is configured. Set OPENAI_API_KEY or GEMINI_API_KEY in admin credentials.',
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

    const existing = await this.uploadService.objectUrlIfExists(key);
    if (existing) {
      return {
        url: existing,
        key,
        provider,
        prompt,
        cached: true,
        aspect,
        warnings,
      };
    }

    const buffer =
      provider === 'openai'
        ? await this.generateWithOpenAI(prompt, aspect, request.transparent)
        : await this.generateWithGemini(prompt);

    const upload = await this.uploadService.uploadBuffer(buffer, {
      folder: `artwork/${userId}`,
      fileName: hash,
      extension: 'png',
      contentType: 'image/png',
    });

    return {
      url: upload.url,
      key: upload.key,
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
      aspect === 'portrait'
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
      model: 'gpt-image-1',
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
