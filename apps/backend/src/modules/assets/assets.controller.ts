import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HybridAuthGuard } from '../partner/guards/hybrid-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AssetsService } from './assets.service';
import { PhotoService } from './photo.service';
import { ImageGenerationService } from './image-generation.service';
import { PhotoIngestService } from './photo-ingest.service';
import { CutoutService } from './cutout.service';
import { IconScoutService } from './iconscout.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { GenerateArtworkDto } from './dto/artwork.dto';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Assets')
@ApiBearerAuth()
@UseGuards(HybridAuthGuard)
@Controller({ path: 'assets', version: '1' })
export class AssetsController {
  constructor(
    private assetsService: AssetsService,
    private photoService: PhotoService,
    private imageGenerationService: ImageGenerationService,
    private photoIngestService: PhotoIngestService,
    private cutoutService: CutoutService,
    private iconScoutService: IconScoutService,
    private subscriptionsService: SubscriptionsService,
    private prisma: PrismaService,
  ) {}

  @Get('icons/search')
  @ApiOperation({
    summary: 'Search the permitted icon sets',
    description:
      'Searches Health Icons, Tabler, Phosphor, Lucide and Material Design Icons - all MIT/ISC/Apache-2.0.',
  })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchIcons(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.assetsService.searchIcons(q, limit ? Number(limit) : undefined);
  }

  @Get('icons/concepts')
  @ApiOperation({
    summary: 'The icon vocabulary available to designs',
    description:
      'Semantic concepts mapped to concrete icons. Defaults to the concepts for the caller\'s own industry.',
  })
  @ApiQuery({ name: 'industry', required: false })
  async listConcepts(
    @CurrentUser('id') userId: string,
    @Query('industry') industry?: string,
  ) {
    if (industry) return this.assetsService.listConcepts(industry);

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { industry: true },
    });
    return this.assetsService.listConcepts(profile?.industry || undefined);
  }

  @Get('icons/resolve')
  @ApiOperation({
    summary: 'Resolve a concept or phrase to inline SVG',
    description:
      'Accepts a concept ("vaccination"), an Iconify id ("ph:star-fill") or a free-text feature line.',
  })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'color', required: false, example: '#0ea5e9' })
  @ApiQuery({ name: 'size', required: false, type: Number })
  async resolveIcon(
    @Query('q') q: string,
    @Query('color') color?: string,
    @Query('size') size?: number,
  ) {
    return this.assetsService.getIcon(q, {
      color,
      size: size ? Number(size) : undefined,
    });
  }

  @Get('artwork/providers')
  @ApiOperation({ summary: 'Image generation providers that are configured' })
  async artworkProviders() {
    const providers = await this.imageGenerationService.availableProviders();
    return {
      providers,
      configured: providers.length > 0,
      note:
        providers.length === 0
          ? 'Set OPENAI_API_KEY or GEMINI_API_KEY in admin credentials to enable artwork generation.'
          : undefined,
    };
  }

  @Post('artwork/preview-prompt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Show the prompt that would be sent, without generating',
    description:
      'Free. Useful for tuning, and for seeing which name-like terms get stripped before anything is paid for.',
  })
  async previewPrompt(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateArtworkDto,
  ) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { industry: true, brandColors: true },
    });

    const { subject, strippedNames } =
      this.imageGenerationService.sanitiseSubject(dto.subject);

    const prompt = this.imageGenerationService.buildPrompt(
      {
        ...dto,
        subject,
        industry: profile?.industry || undefined,
        brandColor: dto.brandColor || profile?.brandColors || undefined,
      },
      dto.aspect || 'landscape',
    );

    return { prompt, strippedNames, charged: 0 };
  }

  @Post('artwork')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate the artwork layer of a design',
    description:
      'Produces a text-free image and stores it. Copy and contact details are composited as HTML on top, so they stay exact.',
  })
  @ApiResponse({ status: 200, description: 'Stored artwork URL' })
  @ApiResponse({ status: 400, description: 'No provider configured, or generation failed' })
  async generateArtwork(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateArtworkDto,
  ) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { industry: true, brandColors: true },
    });

    // Charge only once the request is known to be serviceable.
    const providers = await this.imageGenerationService.availableProviders();
    if (providers.length === 0) {
      return {
        error:
          'No image generation provider is configured. Set OPENAI_API_KEY or GEMINI_API_KEY in admin credentials.',
        providers: [],
      };
    }

    const result = await this.imageGenerationService.generate(userId, {
      ...dto,
      industry: profile?.industry || undefined,
      brandColor: dto.brandColor || profile?.brandColors || undefined,
    });

    // A cache hit costs nothing: the image already exists.
    if (!result.cached) {
      await this.subscriptionsService.consumeCredits(userId, 'ARTWORK_GENERATE');
    }

    return result;
  }

  @Post('photos/ingest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Copy a photo into our storage and size it for a design slot',
    description:
      'Designs must not hotlink a stock CDN: the render breaks when the remote rotates or rate-limits. Re-encodes, crops to the slot, and stores content-addressed.',
  })
  async ingestPhoto(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      url: string;
      fit?: 'hero' | 'square' | 'portrait' | 'wide';
      attribution?: string;
      sourcePage?: string;
      position?: 'centre' | 'top' | 'attention';
    },
  ) {
    if (!body?.url) throw new BadRequestException('url is required');
    return this.photoIngestService.ingest(userId, body.url, {
      fit: body.fit,
      attribution: body.attribution,
      sourcePage: body.sourcePage,
      position: body.position,
    });
  }

  @Get('cutout/providers')
  @ApiOperation({ summary: 'Background removers that are configured' })
  async cutoutProviders() {
    const providers = await this.cutoutService.availableProviders();
    return {
      providers,
      configured: providers.length > 0,
      note:
        providers.length === 0
          ? 'No background remover configured. Set REMOVEBG_API_KEY, or upload a PNG that already has a transparent background.'
          : undefined,
    };
  }

  @Post('cutout')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Turn a practitioner photo into a transparent cutout',
    description:
      'Upload the photograph of your own practitioner. Stock photos of people must not be used here - those licences carry no model release.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async createCutout(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('That file is not an image.');
    }
    return this.cutoutService.cutout(userId, file.buffer);
  }

  @Get('illustrations/search')
  @ApiOperation({
    summary: 'Search IconScout illustrations, 3D objects and Lottie files',
    description:
      'Requires ICONSCOUT_CLIENT_ID. Returns a note rather than failing when unconfigured, so a design can fall back to generated shapes.',
  })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'asset', required: false, enum: ['illustration', '3d', 'lottie', 'icon'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchIllustrations(
    @Query('q') q: string,
    @Query('asset') asset?: 'illustration' | '3d' | 'lottie' | 'icon',
    @Query('limit') limit?: number,
  ) {
    return this.iconScoutService.search(q, {
      asset,
      perPage: limit ? Number(limit) : undefined,
    });
  }

  @Post('illustrations/download')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Download an IconScout asset into our storage',
    description:
      'Content-addressed by uuid+format, so an asset is fetched and paid for once. Designs must reference the stored copy, not the IconScout CDN.',
  })
  async downloadIllustration(
    @CurrentUser('id') userId: string,
    @Body() body: { uuid: string; format?: string },
  ) {
    if (!body?.uuid) throw new BadRequestException('uuid is required');
    return this.iconScoutService.download(userId, body.uuid, {
      format: body.format,
    });
  }

  @Get('photos/search')
  @ApiOperation({
    summary: 'Search free stock photography',
    description:
      'Pexels and Pixabay. Responses carry a model-release warning when the query looks like it wants a photograph of a person.',
  })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'orientation', required: false, enum: ['landscape', 'portrait', 'square'] })
  @ApiResponse({ status: 200, description: 'Matching photos, with attribution requirements' })
  async searchPhotos(
    @CurrentUser('id') userId: string,
    @Query('q') q: string,
    @Query('limit') limit?: number,
    @Query('orientation') orientation?: string,
  ) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { industry: true },
    });

    return this.photoService.search(q, {
      perPage: limit ? Number(limit) : undefined,
      orientation,
      industry: profile?.industry || undefined,
    });
  }
}
