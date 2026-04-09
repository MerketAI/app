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
import { EmailService } from './email.service';
import {
  CreateEmailListDto,
  UpdateEmailListDto,
  CreateEmailContactDto,
  ImportContactsDto,
  CreateEmailCampaignDto,
  UpdateEmailCampaignDto,
  SendTestEmailDto,
  CreateEmailSequenceDto,
  UpdateEmailSequenceDto,
} from './dto/email.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('email')
@Controller({ path: 'email', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailController {
  constructor(private emailService: EmailService) {}

  // ============================================
  // Email Lists
  // ============================================

  @Get('lists')
  @ApiOperation({ summary: 'Get all email lists' })
  async getLists(@CurrentUser('id') userId: string) {
    return this.emailService.getLists(userId);
  }

  @Post('lists')
  @ApiOperation({ summary: 'Create an email list' })
  async createList(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEmailListDto,
  ) {
    return this.emailService.createList(userId, dto);
  }

  @Put('lists/:id')
  @ApiOperation({ summary: 'Update an email list' })
  async updateList(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmailListDto,
  ) {
    return this.emailService.updateList(userId, id, dto);
  }

  @Delete('lists/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an email list' })
  async deleteList(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.emailService.deleteList(userId, id);
  }

  // ============================================
  // Email Contacts
  // ============================================

  @Get('lists/:listId/contacts')
  @ApiOperation({ summary: 'Get contacts in a list' })
  async getContacts(
    @CurrentUser('id') userId: string,
    @Param('listId') listId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.emailService.getContacts(userId, listId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search,
    });
  }

  @Post('contacts')
  @ApiOperation({ summary: 'Add a contact to a list' })
  async createContact(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEmailContactDto,
  ) {
    return this.emailService.createContact(userId, dto);
  }

  @Post('contacts/import')
  @ApiOperation({ summary: 'Bulk import contacts to a list' })
  async importContacts(
    @CurrentUser('id') userId: string,
    @Body() dto: ImportContactsDto,
  ) {
    return this.emailService.importContacts(userId, dto);
  }

  @Delete('contacts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a contact' })
  async deleteContact(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.emailService.deleteContact(userId, id);
  }

  // ============================================
  // Email Campaigns
  // ============================================

  @Get('campaigns')
  @ApiOperation({ summary: 'Get all campaigns' })
  async getCampaigns(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    return this.emailService.getCampaigns(userId, status);
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign detail with stats' })
  async getCampaign(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.emailService.getCampaign(userId, id);
  }

  @Post('campaigns')
  @ApiOperation({ summary: 'Create a campaign' })
  async createCampaign(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEmailCampaignDto,
  ) {
    return this.emailService.createCampaign(userId, dto);
  }

  @Put('campaigns/:id')
  @ApiOperation({ summary: 'Update a campaign' })
  async updateCampaign(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmailCampaignDto,
  ) {
    return this.emailService.updateCampaign(userId, id, dto);
  }

  @Delete('campaigns/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft campaign' })
  async deleteCampaign(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.emailService.deleteCampaign(userId, id);
  }

  @Post('campaigns/:id/send')
  @ApiOperation({ summary: 'Send a campaign now' })
  async sendCampaign(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.emailService.sendCampaign(userId, id);
  }

  @Post('campaigns/:id/test')
  @ApiOperation({ summary: 'Send a test email to a single address' })
  async sendTestEmail(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SendTestEmailDto,
  ) {
    return this.emailService.sendTestEmail(userId, id, dto.testEmail);
  }

  // ============================================
  // Email Sequences
  // ============================================

  @Get('sequences')
  @ApiOperation({ summary: 'Get all sequences' })
  async getSequences(@CurrentUser('id') userId: string) {
    return this.emailService.getSequences(userId);
  }

  @Post('sequences')
  @ApiOperation({ summary: 'Create a sequence' })
  async createSequence(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEmailSequenceDto,
  ) {
    return this.emailService.createSequence(userId, dto);
  }

  @Put('sequences/:id')
  @ApiOperation({ summary: 'Update a sequence' })
  async updateSequence(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmailSequenceDto,
  ) {
    return this.emailService.updateSequence(userId, id, dto);
  }

  @Delete('sequences/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a sequence' })
  async deleteSequence(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.emailService.deleteSequence(userId, id);
  }

  @Post('sequences/:id/activate')
  @ApiOperation({ summary: 'Activate a sequence' })
  async activateSequence(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.emailService.activateSequence(userId, id);
  }

  @Post('sequences/:id/pause')
  @ApiOperation({ summary: 'Pause a sequence' })
  async pauseSequence(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.emailService.pauseSequence(userId, id);
  }

  // ============================================
  // Email Templates
  // ============================================

  @Get('templates')
  @ApiOperation({ summary: 'Get built-in email templates' })
  async getTemplates() {
    return this.emailService.getTemplates();
  }

  @Get('templates/:id/html')
  @ApiOperation({ summary: 'Get the HTML for a built-in template' })
  async getTemplateHtml(@Param('id') id: string) {
    return { html: this.emailService.getTemplateHtml(id) };
  }
}
