import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  LeadFilterDto,
  CreateLeadNoteDto,
  ChangeStageDto,
  ImportLeadsDto,
  LeadSource,
} from './dto/leads.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async createLead(userId: string, dto: CreateLeadDto) {
    const score = this.calculateScore(dto);

    const lead = await this.prisma.lead.create({
      data: {
        userId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        company: dto.company,
        source: dto.source,
        sourceId: dto.sourceId,
        score,
        tags: JSON.stringify(dto.tags ?? []),
        customFields: JSON.stringify(dto.customFields ?? {}),
      },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'FORM_SUBMIT',
        data: JSON.stringify({
          source: dto.source ?? 'MANUAL',
          initialScore: score,
        }),
      },
    });

    return {
      ...lead,
      tags: JSON.parse(lead.tags),
      customFields: JSON.parse(lead.customFields),
    };
  }

  async updateLead(userId: string, leadId: string, dto: UpdateLeadDto) {
    const lead = await this.findLeadOrFail(leadId, userId);

    const updateData: Record<string, any> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.company !== undefined) updateData.company = dto.company;
    if (dto.source !== undefined) updateData.source = dto.source;
    if (dto.sourceId !== undefined) updateData.sourceId = dto.sourceId;
    if (dto.stage !== undefined) updateData.stage = dto.stage;
    if (dto.assignedTo !== undefined) updateData.assignedTo = dto.assignedTo;
    if (dto.lostReason !== undefined) updateData.lostReason = dto.lostReason;
    if (dto.tags !== undefined) updateData.tags = JSON.stringify(dto.tags);
    if (dto.customFields !== undefined) updateData.customFields = JSON.stringify(dto.customFields);

    if (dto.score !== undefined) {
      updateData.score = dto.score;
    } else if (
      dto.email !== undefined ||
      dto.phone !== undefined ||
      dto.company !== undefined ||
      dto.source !== undefined
    ) {
      // Recalculate score when relevant fields change
      const merged = {
        email: dto.email ?? lead.email,
        phone: dto.phone ?? lead.phone,
        company: dto.company ?? lead.company,
        source: (dto.source ?? lead.source) as LeadSource | undefined,
      };
      updateData.score = this.calculateScore(merged);
    }

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    return {
      ...updated,
      tags: JSON.parse(updated.tags),
      customFields: JSON.parse(updated.customFields),
    };
  }

  async changeStage(userId: string, leadId: string, dto: ChangeStageDto) {
    const lead = await this.findLeadOrFail(leadId, userId);

    const fromStage = lead.stage;
    const toStage = dto.stage;

    const updateData: Record<string, any> = { stage: toStage };

    if (toStage === 'CONVERTED') {
      updateData.convertedAt = new Date();
    }

    if (toStage === 'LOST' && dto.reason) {
      updateData.lostReason = dto.reason;
    }

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId,
        type: 'STAGE_CHANGE',
        data: JSON.stringify({
          fromStage,
          toStage,
          reason: dto.reason ?? null,
        }),
      },
    });

    return {
      ...updated,
      tags: JSON.parse(updated.tags),
      customFields: JSON.parse(updated.customFields),
    };
  }

  async getLeads(userId: string, filters: LeadFilterDto) {
    const where: Record<string, any> = { userId };

    if (filters.stage) {
      where.stage = filters.stage;
    }

    if (filters.source) {
      where.source = filters.source;
    }

    if (filters.scoreMin !== undefined || filters.scoreMax !== undefined) {
      where.score = {};
      if (filters.scoreMin !== undefined) where.score.gte = filters.scoreMin;
      if (filters.scoreMax !== undefined) where.score.lte = filters.scoreMax;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { email: { contains: filters.search } },
        { company: { contains: filters.search } },
      ];
    }

    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data: leads.map((lead) => ({
        ...lead,
        tags: JSON.parse(lead.tags),
        customFields: JSON.parse(lead.customFields),
      })),
      total,
      limit,
      offset,
    };
  }

  async getLeadById(userId: string, leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.userId !== userId) {
      throw new ForbiddenException('You do not have access to this lead');
    }

    return {
      ...lead,
      tags: JSON.parse(lead.tags),
      customFields: JSON.parse(lead.customFields),
      activities: lead.activities.map((a) => ({
        ...a,
        data: JSON.parse(a.data),
      })),
    };
  }

  async addNote(userId: string, leadId: string, dto: CreateLeadNoteDto) {
    await this.findLeadOrFail(leadId, userId);

    const note = await this.prisma.leadNote.create({
      data: {
        leadId,
        content: dto.content,
      },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId,
        type: 'NOTE',
        data: JSON.stringify({
          noteId: note.id,
          preview: dto.content.substring(0, 100),
        }),
      },
    });

    return note;
  }

  async getActivities(
    userId: string,
    leadId: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    await this.findLeadOrFail(leadId, userId);

    const [activities, total] = await Promise.all([
      this.prisma.leadActivity.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.leadActivity.count({ where: { leadId } }),
    ]);

    return {
      data: activities.map((a) => ({
        ...a,
        data: JSON.parse(a.data),
      })),
      total,
      limit,
      offset,
    };
  }

  async getStats(userId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { userId },
      select: { stage: true, score: true, source: true },
    });

    const total = leads.length;

    const byStage: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let totalScore = 0;
    let convertedCount = 0;

    for (const lead of leads) {
      byStage[lead.stage] = (byStage[lead.stage] ?? 0) + 1;
      if (lead.source) {
        bySource[lead.source] = (bySource[lead.source] ?? 0) + 1;
      }
      totalScore += lead.score;
      if (lead.stage === 'CONVERTED') {
        convertedCount++;
      }
    }

    return {
      total,
      byStage,
      bySource,
      conversionRate: total > 0 ? Math.round((convertedCount / total) * 10000) / 100 : 0,
      averageScore: total > 0 ? Math.round((totalScore / total) * 100) / 100 : 0,
    };
  }

  async importLeads(userId: string, dto: ImportLeadsDto) {
    let imported = 0;
    let skipped = 0;
    const errors: Array<{ index: number; name: string; error: string }> = [];

    for (let i = 0; i < dto.leads.length; i++) {
      const item = dto.leads[i];

      try {
        // Skip duplicates by email
        if (item.email) {
          const existing = await this.prisma.lead.findFirst({
            where: { userId, email: item.email },
          });

          if (existing) {
            skipped++;
            continue;
          }
        }

        const score = this.calculateScore(item);

        await this.prisma.lead.create({
          data: {
            userId,
            name: item.name,
            email: item.email,
            phone: item.phone,
            company: item.company,
            source: item.source,
            score,
            tags: JSON.stringify(item.tags ?? []),
            customFields: JSON.stringify({}),
          },
        });

        imported++;
      } catch (err) {
        errors.push({
          index: i,
          name: item.name,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return { imported, skipped, errors };
  }

  async deleteLead(userId: string, leadId: string) {
    await this.findLeadOrFail(leadId, userId);

    await this.prisma.lead.delete({ where: { id: leadId } });

    return { deleted: true };
  }

  // ---- Private helpers ----

  private async findLeadOrFail(leadId: string, userId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.userId !== userId) {
      throw new ForbiddenException('You do not have access to this lead');
    }

    return lead;
  }

  private calculateScore(data: {
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    source?: string | null;
  }): number {
    let score = 10; // Base score

    if (data.email) score += 10;
    if (data.phone) score += 10;
    if (data.company) score += 5;

    if (data.source === 'GOOGLE_ADS' || data.source === 'META_ADS') {
      score += 15;
    } else if (data.source === 'FORM') {
      score += 20;
    } else if (data.source === 'WEBSITE') {
      score += 10;
    }

    return Math.min(score, 100);
  }
}
