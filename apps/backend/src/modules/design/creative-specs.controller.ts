import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HybridAuthGuard } from '../partner/guards/hybrid-auth.guard';
import { CREATIVE_SPECS, SIZE_LIMITS, specCatalogue } from './creative-specs';
import { THEME_IDS, THEMES } from './post-themes';

/** The size catalogue, for pickers in partner apps (category -> platform -> placement). */
@ApiTags('Creative specs')
@ApiBearerAuth()
@Controller({ path: 'creative-specs', version: '1' })
@UseGuards(HybridAuthGuard)
export class CreativeSpecsController {
  @Get()
  @ApiOperation({ summary: 'Every placement with its size, ratio, orientation and safe area, grouped by category and platform, plus the visual themes' })
  list() {
    const themes = THEME_IDS.map((id) => ({
      id,
      label: THEMES[id].label,
      description: THEMES[id].description,
      useFor: THEMES[id].useFor,
      pictureStyle: THEMES[id].image.style,
      dark: THEMES[id].dark,
    }));
    return { catalogue: specCatalogue(), specs: CREATIVE_SPECS, customLimits: SIZE_LIMITS, themes };
  }
}
