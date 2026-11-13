import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { FormatId } from '@jasper/post-renderer';

import { HybridAuthGuard } from '../partner/guards/hybrid-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PostDesignService } from './post-design.service';
import { ArtDirectorService, type ArtDirection } from './art-director.service';
import { PostBriefDto, RenderPostDto } from './dto/post-design.dto';

/**
 * Posts and flyers built from versioned templates.
 *
 * Separate from `/designs`, which asks a model for a whole HTML document. Here
 * a model only writes copy into declared slots of a template that has already
 * been validated against an allow-list, and every verified fact is injected
 * afterwards from the profile. Nothing a model produces becomes markup.
 */
@ApiTags('post-designs')
@Controller({ path: 'post-designs', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiBearerAuth()
export class PostDesignController {
  constructor(
    private postDesigns: PostDesignService,
    private artDirector: ArtDirectorService,
    private subscriptions: SubscriptionsService,
  ) {}

  @Get('templates')
  @ApiOperation({
    summary: 'The template catalogue',
    description:
      'Every layout available, with the slots the Art Director may write and the slots injected from the verified profile. This is the contract: anything not listed as a campaign slot cannot be authored by a model.',
  })
  async templates() {
    const templates = this.postDesigns.templates();
    return {
      configured: await this.artDirector.isConfigured(),
      templates: templates.map((template) => ({
        id: template.id,
        title: template.title,
        templateVersion: template.templateVersion,
        schemaVersion: template.schemaVersion,
        family: template.family,
        description: template.description,
        formats: template.formats,
        referenceFormat: template.referenceFormat,
        campaignTypes: template.campaignTypes,
        requiresPhoto: Boolean(template.slots.heroImage?.required),
        slots: Object.entries(template.slots).map(([name, spec]) => ({
          name,
          kind: spec.kind,
          source: spec.source,
          required: spec.required,
          maxChars: spec.maxChars,
          maxItems: spec.maxItems,
          maxItemChars: spec.maxItemChars,
          maxLines: spec.maxLines,
          description: spec.description,
          /** False for anything the Art Director is not allowed to write. */
          authorable: spec.source === 'campaign',
        })),
      })),
    };
  }

  @Post('plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ask the Art Director for a plan, without rendering it',
    description:
      'Returns the chosen layout and the copy. Cheap and inspectable, so a caller can iterate before paying for a render. The response also lists every correction applied to the model output - including any attempt to write a verified fact, which is always discarded.',
  })
  @ApiResponse({ status: 200, description: 'The plan' })
  @ApiResponse({ status: 400, description: 'No usable plan, or no provider configured' })
  async plan(
    @CurrentUser('id') userId: string,
    @Body() dto: PostBriefDto,
  ): Promise<ArtDirection> {
    const direction = await this.postDesigns.plan(userId, {
      ...dto,
      format: dto.format as FormatId | undefined,
    });
    await this.subscriptions.consumeCredits(userId, 'POST_DIRECT');
    return direction;
  }

  @Post('render')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Render a post or flyer',
    description:
      'Runs the whole pipeline: plan (or an approved plan you supply), verified-fact injection, composition, Chromium, storage. Returns the stored image URL, the per-zone fit result, and an immutable snapshot id identifying exactly what produced it.',
  })
  @ApiResponse({ status: 200, description: 'The rendered design' })
  @ApiResponse({
    status: 400,
    description:
      'The brief cannot be rendered - commonly a required verified field missing from the profile, or a photo-led layout with no photograph.',
  })
  async render(@CurrentUser('id') userId: string, @Body() dto: RenderPostDto) {
    const result = await this.postDesigns.render(userId, {
      ...dto,
      format: dto.format as FormatId | undefined,
      direction: dto.direction as ArtDirection | undefined,
    });

    // Charged after the render, and only for work actually done: a caller who
    // supplied their own plan did not pay the model, and a render that fell
    // back to a placeholder produced nothing publishable.
    if (result.renderer === 'puppeteer') {
      await this.subscriptions.consumeCredits(
        userId,
        'POST_RENDER',
        result.designId,
      );
      if (!dto.direction) {
        await this.subscriptions.consumeCredits(userId, 'POST_DIRECT');
      }
    }

    return result;
  }
}
