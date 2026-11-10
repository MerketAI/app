import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HybridAuthGuard } from '../partner/guards/hybrid-auth.guard';
import { CREATIVE_SPECS, SIZE_LIMITS, specCatalogue } from './creative-specs';

/** The size catalogue, for pickers in partner apps (category -> platform -> placement). */
@ApiTags('Creative specs')
@ApiBearerAuth()
@Controller({ path: 'creative-specs', version: '1' })
@UseGuards(HybridAuthGuard)
export class CreativeSpecsController {
  @Get()
  @ApiOperation({ summary: 'Every placement with its size, ratio, orientation and safe area, grouped by category and platform' })
  list() {
    return { catalogue: specCatalogue(), specs: CREATIVE_SPECS, customLimits: SIZE_LIMITS };
  }
}
