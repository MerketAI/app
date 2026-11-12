import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthDay, healthDaysBetween, isoDate, SeasonalTopic, seasonalTopicsBetween } from './health-calendar';

/** Calendar days are Indian dates: a post planned for "14 Nov" is 14 Nov in IST. */
const IST_MS = 5.5 * 60 * 60 * 1000;
const MAX_DAYS = 93;

/** The IST calendar date of an instant. */
export function istDate(at: Date): string {
  return new Date(at.getTime() + IST_MS).toISOString().slice(0, 10);
}

/** Midday IST on a date: stored for a planned post, so no timezone moves its day. */
export function plannedInstant(date: string): Date {
  return new Date(`${date}T06:30:00.000Z`);
}

export interface CalendarPost {
  id: string;
  date: string;
  /** published, scheduled (goes out by itself), planned (a draft with a date), failed. */
  state: 'published' | 'scheduled' | 'planned' | 'failed';
  platform: string;
  title: string | null;
  caption: string;
  imageUrl: string | null;
  at: string;
}

export interface ContentCalendar {
  from: string;
  to: string;
  healthDays: HealthDay[];
  seasons: SeasonalTopic[];
  posts: CalendarPost[];
}

/**
 * A provider's month: health awareness days and seasonal topics, and their posts by
 * date - published, scheduled, and drafts the assistant planned for a day.
 */
@Injectable()
export class ContentCalendarService {
  constructor(private prisma: PrismaService) {}

  async calendar(userId: string, fromRaw: unknown, toRaw: unknown): Promise<ContentCalendar> {
    const from = isoDate(fromRaw);
    const to = isoDate(toRaw);
    if (!from || !to || to < from) throw new BadRequestException('Give from and to as YYYY-MM-DD, with to on or after from.');
    const span = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
    if (span > MAX_DAYS) throw new BadRequestException(`A calendar covers at most ${MAX_DAYS} days.`);

    // A day either side, then exact IST dates below.
    const start = new Date(Date.parse(`${from}T00:00:00Z`) - IST_MS);
    const end = new Date(Date.parse(`${to}T00:00:00Z`) + 86400000 - IST_MS);
    const inRange = { gte: start, lt: end };
    const [rows, profile] = await Promise.all([
      this.prisma.content.findMany({
        where: { userId, OR: [{ plannedFor: inRange }, { scheduledAt: inRange }, { publishedAt: inRange }] },
        orderBy: { createdAt: 'asc' },
        take: 300,
        select: { id: true, status: true, title: true, caption: true, mediaUrls: true, thumbnailUrl: true, aiMetadata: true, type: true, plannedFor: true, scheduledAt: true, publishedAt: true },
      }),
      this.prisma.userProfile.findUnique({ where: { userId }, select: { brandKeywords: true, industry: true } }),
    ]);

    const posts = rows
      .map((row) => {
        const at = row.publishedAt || row.scheduledAt || row.plannedFor;
        if (!at) return null;
        const state: CalendarPost['state'] =
          row.status === 'PUBLISHED' ? 'published' : row.status === 'FAILED' ? 'failed' : row.status === 'SCHEDULED' || row.status === 'PUBLISHING' ? 'scheduled' : 'planned';
        return {
          id: row.id,
          date: istDate(at),
          state,
          platform: platformOf(row.aiMetadata, row.type),
          title: row.title,
          caption: (row.caption || '').slice(0, 280),
          imageUrl: row.thumbnailUrl || firstOf(row.mediaUrls),
          at: at.toISOString(),
        } as CalendarPost;
      })
      .filter((p): p is CalendarPost => !!p && p.date >= from && p.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || a.at.localeCompare(b.at));

    return {
      from,
      to,
      healthDays: healthDaysBetween(from, to, listOf(profile?.brandKeywords)),
      seasons: seasonalTopicsBetween(from, to),
      posts,
    };
  }
}

function listOf(value: unknown): string[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function firstOf(value: unknown): string | null {
  return listOf(value)[0] || null;
}

function platformOf(aiMetadata: string | null, type: string): string {
  try {
    const platform = JSON.parse(aiMetadata || '{}').platform;
    if (platform) return platform;
  } catch {
    /* fall through */
  }
  return type.startsWith('INSTAGRAM') ? 'instagram' : type.startsWith('FACEBOOK') ? 'facebook' : type === 'BLOG_POST' ? 'blog' : type.toLowerCase();
}
