import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  LeadFilterDto,
  CreateLeadNoteDto,
  ChangeStageDto,
  ImportLeadsDto,
} from './dto/leads.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('leads')
@Controller({ path: 'leads', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'List leads with filters and pagination' })
  async getLeads(
    @CurrentUser('id') userId: string,
    @Query() filters: LeadFilterDto,
  ) {
    return this.leadsService.getLeads(userId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get pipeline statistics' })
  async getStats(@CurrentUser('id') userId: string) {
    return this.leadsService.getStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead detail with activities and notes' })
  async getLeadById(
    @CurrentUser('id') userId: string,
    @Param('id') leadId: string,
  ) {
    return this.leadsService.getLeadById(userId, leadId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  async createLead(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateLeadDto,
  ) {
    return this.leadsService.createLead(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a lead' })
  async updateLead(
    @CurrentUser('id') userId: string,
    @Param('id') leadId: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.updateLead(userId, leadId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a lead' })
  async deleteLead(
    @CurrentUser('id') userId: string,
    @Param('id') leadId: string,
  ) {
    return this.leadsService.deleteLead(userId, leadId);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add a note to a lead' })
  @ApiResponse({ status: 201, description: 'Note added successfully' })
  async addNote(
    @CurrentUser('id') userId: string,
    @Param('id') leadId: string,
    @Body() dto: CreateLeadNoteDto,
  ) {
    return this.leadsService.addNote(userId, leadId, dto);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get lead activity timeline' })
  async getActivities(
    @CurrentUser('id') userId: string,
    @Param('id') leadId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.leadsService.getActivities(
      userId,
      leadId,
      limit ? Number(limit) : 20,
      offset ? Number(offset) : 0,
    );
  }

  @Post(':id/stage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change lead stage' })
  async changeStage(
    @CurrentUser('id') userId: string,
    @Param('id') leadId: string,
    @Body() dto: ChangeStageDto,
  ) {
    return this.leadsService.changeStage(userId, leadId, dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Bulk import leads' })
  @ApiResponse({ status: 201, description: 'Import completed' })
  async importLeads(
    @CurrentUser('id') userId: string,
    @Body() dto: ImportLeadsDto,
  ) {
    return this.leadsService.importLeads(userId, dto);
  }
}
