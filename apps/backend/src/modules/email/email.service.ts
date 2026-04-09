import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EmailSenderService } from './email-sender.service';
import { EmailTemplateService } from './email-template.service';
import {
  CreateEmailListDto,
  UpdateEmailListDto,
  CreateEmailContactDto,
  ImportContactsDto,
  CreateEmailCampaignDto,
  UpdateEmailCampaignDto,
  CreateEmailSequenceDto,
  UpdateEmailSequenceDto,
} from './dto/email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
    private emailSenderService: EmailSenderService,
    private emailTemplateService: EmailTemplateService,
  ) {}

  // ============================================
  // Email Lists
  // ============================================

  async getLists(userId: string) {
    return this.prisma.emailList.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createList(userId: string, dto: CreateEmailListDto) {
    return this.prisma.emailList.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description || null,
        tags: JSON.stringify(dto.tags || []),
      },
    });
  }

  async updateList(userId: string, id: string, dto: UpdateEmailListDto) {
    const list = await this.findListOrThrow(userId, id);

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.tags !== undefined) updateData.tags = JSON.stringify(dto.tags);

    return this.prisma.emailList.update({
      where: { id: list.id },
      data: updateData,
    });
  }

  async deleteList(userId: string, id: string) {
    const list = await this.findListOrThrow(userId, id);
    await this.prisma.emailList.delete({ where: { id: list.id } });
  }

  private async findListOrThrow(userId: string, id: string) {
    const list = await this.prisma.emailList.findUnique({ where: { id } });
    if (!list) {
      throw new NotFoundException('Email list not found');
    }
    if (list.userId !== userId) {
      throw new ForbiddenException('You do not own this email list');
    }
    return list;
  }

  // ============================================
  // Email Contacts
  // ============================================

  async getContacts(
    userId: string,
    listId: string,
    options: { page: number; limit: number; search?: string },
  ) {
    await this.findListOrThrow(userId, listId);

    const { page, limit, search } = options;
    const skip = (page - 1) * limit;

    const where: any = { listId };
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const [contacts, total] = await Promise.all([
      this.prisma.emailContact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emailContact.count({ where }),
    ]);

    return {
      contacts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createContact(userId: string, dto: CreateEmailContactDto) {
    await this.findListOrThrow(userId, dto.listId);

    // Check for duplicate
    const existing = await this.prisma.emailContact.findUnique({
      where: {
        listId_email: { listId: dto.listId, email: dto.email },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Contact ${dto.email} already exists in this list`,
      );
    }

    const contact = await this.prisma.emailContact.create({
      data: {
        userId,
        listId: dto.listId,
        email: dto.email,
        name: dto.name || null,
        metadata: JSON.stringify(dto.metadata || {}),
      },
    });

    // Update contact count
    await this.updateListContactCount(dto.listId);

    return contact;
  }

  async importContacts(userId: string, dto: ImportContactsDto) {
    await this.findListOrThrow(userId, dto.listId);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of dto.contacts) {
      try {
        const existing = await this.prisma.emailContact.findUnique({
          where: {
            listId_email: { listId: dto.listId, email: entry.email },
          },
        });

        if (existing) {
          // Update existing contact name/metadata if provided
          await this.prisma.emailContact.update({
            where: { id: existing.id },
            data: {
              ...(entry.name ? { name: entry.name } : {}),
              ...(entry.metadata
                ? { metadata: JSON.stringify(entry.metadata) }
                : {}),
            },
          });
          skipped++;
        } else {
          await this.prisma.emailContact.create({
            data: {
              userId,
              listId: dto.listId,
              email: entry.email,
              name: entry.name || null,
              metadata: JSON.stringify(entry.metadata || {}),
            },
          });
          imported++;
        }
      } catch (error) {
        errors.push(`${entry.email}: ${(error as Error).message}`);
      }
    }

    // Update contact count
    await this.updateListContactCount(dto.listId);

    return {
      imported,
      skipped,
      errors,
      total: dto.contacts.length,
    };
  }

  async deleteContact(userId: string, id: string) {
    const contact = await this.prisma.emailContact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    if (contact.userId !== userId) {
      throw new ForbiddenException('You do not own this contact');
    }

    await this.prisma.emailContact.delete({ where: { id } });
    await this.updateListContactCount(contact.listId);
  }

  private async updateListContactCount(listId: string) {
    const count = await this.prisma.emailContact.count({
      where: { listId, status: 'SUBSCRIBED' },
    });
    await this.prisma.emailList.update({
      where: { id: listId },
      data: { contactCount: count },
    });
  }

  // ============================================
  // Email Campaigns
  // ============================================

  async getCampaigns(userId: string, status?: string) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.emailCampaign.findMany({
      where,
      include: { list: { select: { id: true, name: true, contactCount: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaign(userId: string, id: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id },
      include: { list: { select: { id: true, name: true, contactCount: true } } },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    if (campaign.userId !== userId) {
      throw new ForbiddenException('You do not own this campaign');
    }

    return campaign;
  }

  async createCampaign(userId: string, dto: CreateEmailCampaignDto) {
    return this.prisma.emailCampaign.create({
      data: {
        userId,
        name: dto.name,
        subject: dto.subject,
        previewText: dto.previewText || null,
        htmlContent: dto.htmlContent,
        listId: dto.listId || null,
        type: dto.type || 'BROADCAST',
        status: dto.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      },
    });
  }

  async updateCampaign(
    userId: string,
    id: string,
    dto: UpdateEmailCampaignDto,
  ) {
    const campaign = await this.findCampaignOrThrow(userId, id);

    if (campaign.status === 'SENT' || campaign.status === 'SENDING') {
      throw new BadRequestException('Cannot edit a campaign that has been sent or is sending');
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.subject !== undefined) updateData.subject = dto.subject;
    if (dto.previewText !== undefined) updateData.previewText = dto.previewText;
    if (dto.htmlContent !== undefined) updateData.htmlContent = dto.htmlContent;
    if (dto.listId !== undefined) updateData.listId = dto.listId;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.scheduledAt !== undefined) {
      updateData.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
      updateData.status = dto.scheduledAt ? 'SCHEDULED' : 'DRAFT';
    }

    return this.prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: updateData,
    });
  }

  async deleteCampaign(userId: string, id: string) {
    const campaign = await this.findCampaignOrThrow(userId, id);

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      throw new BadRequestException('Only draft or scheduled campaigns can be deleted');
    }

    await this.prisma.emailCampaign.delete({ where: { id: campaign.id } });
  }

  async sendCampaign(userId: string, campaignId: string) {
    const campaign = await this.findCampaignOrThrow(userId, campaignId);

    if (campaign.status === 'SENT' || campaign.status === 'SENDING') {
      throw new BadRequestException('Campaign has already been sent or is currently sending');
    }

    if (!campaign.listId) {
      throw new BadRequestException('Campaign has no email list assigned. Assign a list before sending.');
    }

    // Check SMTP configuration
    const isConfigured = await this.emailSenderService.isConfigured();
    if (!isConfigured) {
      throw new BadRequestException('SMTP is not configured. Set SMTP credentials in Admin > Credentials.');
    }

    // Get subscribed contacts from the list
    const contacts = await this.prisma.emailContact.findMany({
      where: { listId: campaign.listId, status: 'SUBSCRIBED' },
    });

    if (contacts.length === 0) {
      throw new BadRequestException('No subscribed contacts in the assigned list');
    }

    // Consume credits
    try {
      await this.subscriptionsService.consumeCredits(
        userId,
        'EMAIL_CAMPAIGN',
        campaignId,
      );
    } catch (error) {
      throw new BadRequestException(
        `Insufficient credits to send campaign: ${(error as Error).message}`,
      );
    }

    // Mark campaign as sending
    await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' },
    });

    // Prepare emails
    const emails = contacts.map((contact) => {
      const html = this.emailTemplateService.renderTemplate(
        campaign.htmlContent,
        {
          name: contact.name || 'there',
          email: contact.email,
          unsubscribe_url: `{{unsubscribe_url}}`,
        },
      );

      return {
        to: contact.email,
        subject: campaign.subject,
        html,
      };
    });

    // Send in batches
    this.logger.log(
      `Sending campaign "${campaign.name}" to ${emails.length} contacts`,
    );

    const batchSize = 50;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const result = await this.emailSenderService.sendBatch(batch);
      totalSent += result.sent;
      totalFailed += result.failed;
    }

    // Update campaign stats
    const finalStatus = totalSent > 0 ? 'SENT' : 'FAILED';
    await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: finalStatus,
        totalSent,
        sentAt: new Date(),
        creditsConsumed: 15, // EMAIL_CAMPAIGN cost
      },
    });

    this.logger.log(
      `Campaign "${campaign.name}" completed: ${totalSent} sent, ${totalFailed} failed`,
    );

    return {
      status: finalStatus,
      totalSent,
      totalFailed,
      totalContacts: contacts.length,
    };
  }

  async sendTestEmail(userId: string, campaignId: string, testEmail: string) {
    const campaign = await this.findCampaignOrThrow(userId, campaignId);

    const isConfigured = await this.emailSenderService.isConfigured();
    if (!isConfigured) {
      throw new BadRequestException('SMTP is not configured. Set SMTP credentials in Admin > Credentials.');
    }

    const html = this.emailTemplateService.renderTemplate(
      campaign.htmlContent,
      {
        name: 'Test User',
        email: testEmail,
        unsubscribe_url: '#',
      },
    );

    const result = await this.emailSenderService.sendEmail({
      to: testEmail,
      subject: `[TEST] ${campaign.subject}`,
      html,
    });

    if (!result.success) {
      throw new BadRequestException(`Failed to send test email: ${result.error}`);
    }

    return {
      success: true,
      messageId: result.messageId,
      sentTo: testEmail,
    };
  }

  private async findCampaignOrThrow(userId: string, id: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    if (campaign.userId !== userId) {
      throw new ForbiddenException('You do not own this campaign');
    }
    return campaign;
  }

  // ============================================
  // Email Sequences
  // ============================================

  async getSequences(userId: string) {
    const sequences = await this.prisma.emailSequence.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return sequences.map((seq) => ({
      ...seq,
      steps: JSON.parse(seq.steps),
    }));
  }

  async createSequence(userId: string, dto: CreateEmailSequenceDto) {
    const sequence = await this.prisma.emailSequence.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description || null,
        triggerType: dto.triggerType || 'MANUAL',
        steps: JSON.stringify(dto.steps),
      },
    });

    return {
      ...sequence,
      steps: JSON.parse(sequence.steps),
    };
  }

  async updateSequence(
    userId: string,
    id: string,
    dto: UpdateEmailSequenceDto,
  ) {
    const sequence = await this.findSequenceOrThrow(userId, id);

    if (sequence.status === 'ACTIVE') {
      throw new BadRequestException(
        'Pause the sequence before making changes',
      );
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.triggerType !== undefined) updateData.triggerType = dto.triggerType;
    if (dto.steps !== undefined) updateData.steps = JSON.stringify(dto.steps);

    const updated = await this.prisma.emailSequence.update({
      where: { id: sequence.id },
      data: updateData,
    });

    return {
      ...updated,
      steps: JSON.parse(updated.steps),
    };
  }

  async deleteSequence(userId: string, id: string) {
    const sequence = await this.findSequenceOrThrow(userId, id);

    if (sequence.status === 'ACTIVE') {
      throw new BadRequestException(
        'Pause the sequence before deleting it',
      );
    }

    await this.prisma.emailSequence.delete({ where: { id: sequence.id } });
  }

  async activateSequence(userId: string, id: string) {
    const sequence = await this.findSequenceOrThrow(userId, id);

    const steps = JSON.parse(sequence.steps);
    if (!steps || steps.length === 0) {
      throw new BadRequestException('Sequence must have at least one step');
    }

    // Consume credits for activating a sequence
    try {
      await this.subscriptionsService.consumeCredits(
        userId,
        'EMAIL_SEQUENCE',
        id,
      );
    } catch (error) {
      throw new BadRequestException(
        `Insufficient credits: ${(error as Error).message}`,
      );
    }

    const updated = await this.prisma.emailSequence.update({
      where: { id: sequence.id },
      data: { status: 'ACTIVE' },
    });

    return {
      ...updated,
      steps: JSON.parse(updated.steps),
    };
  }

  async pauseSequence(userId: string, id: string) {
    const sequence = await this.findSequenceOrThrow(userId, id);

    if (sequence.status !== 'ACTIVE') {
      throw new BadRequestException('Only active sequences can be paused');
    }

    const updated = await this.prisma.emailSequence.update({
      where: { id: sequence.id },
      data: { status: 'PAUSED' },
    });

    return {
      ...updated,
      steps: JSON.parse(updated.steps),
    };
  }

  private async findSequenceOrThrow(userId: string, id: string) {
    const sequence = await this.prisma.emailSequence.findUnique({
      where: { id },
    });
    if (!sequence) {
      throw new NotFoundException('Email sequence not found');
    }
    if (sequence.userId !== userId) {
      throw new ForbiddenException('You do not own this sequence');
    }
    return sequence;
  }

  // ============================================
  // Templates
  // ============================================

  getTemplates() {
    return this.emailTemplateService.getTemplates();
  }

  getTemplateHtml(templateId: string) {
    return this.emailTemplateService.getTemplateHtml(templateId);
  }
}
