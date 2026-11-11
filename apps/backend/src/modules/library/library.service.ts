import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';

export type MediaType =
  | 'image' | 'gif' | 'svg' | 'video' | 'audio' | 'html' | 'react' | 'json' | 'pdf' | 'text' | 'other';

/**
 * Top-level folders. Anything filed elsewhere lands under "misc/", so the tree
 * stays browsable however many assets a provider builds up.
 */
export const LIBRARY_ROOTS = [
  'campaigns', 'awareness-days', 'health-tips', 'services', 'products', 'clinic',
  'festivals', 'brand', 'uploads', 'stock', 'icons', 'designs', 'templates', 'components', 'data', 'misc',
] as const;

export interface LibraryFiling {
  kind: string;
  folder?: string;
  title?: string;
  tags?: string[];
  notes?: string;
  source?: string;
  prompt?: string;
  scene?: string;
  parentId?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface LibrarySearch {
  query?: string;
  folder?: string;
  tags?: string[];
  kind?: string;
  mediaType?: string;
  cursor?: string;
  limit?: number;
}

const EXT_TYPES: Record<string, MediaType> = {
  gif: 'gif', svg: 'svg', html: 'html', htm: 'html', jsx: 'react', tsx: 'react', json: 'json',
  pdf: 'pdf', txt: 'text', md: 'text', css: 'text', js: 'text',
};

/** Media type from MIME type and extension; React is told apart by extension. */
export function detectMediaType(mimeType = '', extension = ''): MediaType {
  const ext = extension.toLowerCase().replace(/^\./, '');
  if (EXT_TYPES[ext]) return EXT_TYPES[ext];
  const mime = mimeType.toLowerCase();
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/svg+xml') return 'svg';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'text/html') return 'html';
  if (mime === 'application/json') return 'json';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('text/')) return 'text';
  return 'other';
}

const slug = (value: string) =>
  value.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 48);

/** "Campaigns / Eye Test Camp" -> "campaigns/eye-test-camp"; unknown roots go under misc/. */
export function normaliseFolder(folder: string | undefined, fallback: string): string {
  const parts = String(folder || fallback).split('/').map(slug).filter(Boolean).slice(0, 4);
  if (parts.length === 0) return fallback;
  if (!(LIBRARY_ROOTS as readonly string[]).includes(parts[0])) parts.unshift('misc');
  return parts.slice(0, 4).join('/');
}

export function normaliseTags(tags: string[] | undefined): string[] {
  return [...new Set((tags || []).map(slug).filter(Boolean))].slice(0, 20);
}

/** Default folder by kind, for assets filed without one. */
const KIND_FOLDERS: Record<string, string> = {
  artwork: 'misc/artwork', post: 'misc/posts', design: 'designs', upload: 'uploads',
  stock: 'stock', cutout: 'stock/cutouts', icon: 'icons', template: 'templates', component: 'components', data: 'data',
};

/** The compact shape the assistant sees: enough to choose, never the bytes. */
const SUMMARY = {
  id: true, mediaType: true, kind: true, folder: true, title: true, tags: true, notes: true,
  url: true, width: true, height: true, durationMs: true, scene: true, source: true,
  usageCount: true, createdAt: true, prompt: true,
} as const;

/**
 * The provider's asset library. Everything Jasper generates or pulls in is
 * filed here, so it can be browsed by folder, found by tag or text, and reused
 * rather than generated again - which is where the cost and token savings come
 * from: a reused picture costs nothing, and the assistant reads a few lines of
 * metadata instead of the file.
 */
@Injectable()
export class LibraryService {
  private readonly logger = new Logger(LibraryService.name);

  constructor(private prisma: PrismaService, private uploads: UploadService) {}

  /** Uploads a new file into its folder and files it. The same bytes are stored once. */
  async store(
    userId: string,
    file: { buffer: Buffer; mimeType: string; extension: string; name?: string },
    filing: LibraryFiling,
  ) {
    if (!file.buffer?.length) throw new BadRequestException('Nothing to store');
    const contentHash = createHash('sha256').update(file.buffer).digest('hex');

    const existing = await this.prisma.libraryAsset.findFirst({ where: { userId, contentHash } });
    if (existing) return existing;

    const folder = normaliseFolder(filing.folder, KIND_FOLDERS[filing.kind] || 'misc');
    const extension = file.extension.replace(/^\./, '').toLowerCase();
    const base = slug(filing.title || file.name || filing.kind) || filing.kind;
    const upload = await this.uploads.uploadBuffer(file.buffer, {
      folder: `library/${userId}/${folder}`,
      fileName: `${base}-${contentHash.slice(0, 12)}`,
      extension,
      contentType: file.mimeType,
    });

    return this.record(userId, {
      ...filing,
      folder,
      url: upload.url,
      storageKey: upload.key,
      mimeType: file.mimeType,
      extension,
      sizeBytes: file.buffer.length,
      contentHash,
    });
  }

  /**
   * Files something already uploaded elsewhere (content-addressed artwork,
   * stock photos...). Filing the same storage key again updates its details.
   */
  async record(
    userId: string,
    asset: LibraryFiling & {
      url: string;
      storageKey: string;
      mimeType?: string;
      extension?: string;
      sizeBytes?: number;
      contentHash?: string;
    },
  ) {
    const extension = (asset.extension || asset.storageKey.split('.').pop() || '').toLowerCase();
    const data = {
      mediaType: detectMediaType(asset.mimeType, extension),
      kind: asset.kind,
      folder: normaliseFolder(asset.folder, KIND_FOLDERS[asset.kind] || 'misc'),
      title: asset.title?.slice(0, 200),
      tags: normaliseTags(asset.tags),
      notes: asset.notes?.slice(0, 2000),
      url: asset.url,
      mimeType: asset.mimeType,
      extension,
      sizeBytes: asset.sizeBytes,
      contentHash: asset.contentHash,
      width: asset.width,
      height: asset.height,
      durationMs: asset.durationMs,
      source: asset.source,
      prompt: asset.prompt?.slice(0, 4000),
      scene: asset.scene?.slice(0, 1000),
      parentId: asset.parentId,
      metadata: (asset.metadata as any) ?? undefined,
    };
    // A re-file keeps details the caller did not supply this time.
    const update = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)));
    return this.prisma.libraryAsset.upsert({
      where: { userId_storageKey: { userId, storageKey: asset.storageKey } },
      create: { userId, storageKey: asset.storageKey, ...data },
      update,
    });
  }

  /** Never lets a library failure break the thing that produced the asset. */
  async recordQuietly(userId: string, asset: Parameters<LibraryService['record']>[1]) {
    try {
      return await this.record(userId, asset);
    } catch (error) {
      this.logger.warn(`Could not file ${asset.storageKey} in the library: ${(error as Error).message}`);
      return null;
    }
  }

  async search(userId: string, params: LibrarySearch = {}) {
    const limit = Math.min(Math.max(params.limit || 12, 1), 50);
    const words = String(params.query || '').toLowerCase().split(/\s+/).filter((w) => w.length > 1).slice(0, 6);
    const folder = params.folder ? normaliseFolder(params.folder, 'misc') : undefined;
    const tags = normaliseTags(params.tags);

    const where: any = {
      userId,
      ...(params.kind ? { kind: params.kind } : {}),
      ...(params.mediaType ? { mediaType: params.mediaType } : {}),
      ...(folder ? { folder: { startsWith: folder } } : {}),
      ...(tags.length ? { tags: { hasSome: tags } } : {}),
      ...(words.length
        ? {
            AND: words.map((word) => ({
              OR: [
                { title: { contains: word, mode: 'insensitive' } },
                { notes: { contains: word, mode: 'insensitive' } },
                { scene: { contains: word, mode: 'insensitive' } },
                { folder: { contains: word } },
                { tags: { has: slug(word) } },
              ],
            })),
          }
        : {}),
    };

    const rows = await this.prisma.libraryAsset.findMany({
      where,
      select: SUMMARY,
      // Proven assets first: what has been used before is what worked.
      orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
    // A post's copy (headline | offers | footer) travels with it, trimmed, so a
    // reused image's wording is known without opening the file.
    const items = rows.slice(0, limit).map(({ prompt, ...row }: any) =>
      row.kind === 'post' && prompt ? { ...row, copy: String(prompt).slice(0, 400) } : row,
    );
    return { items, nextCursor: rows.length > limit ? items[items.length - 1].id : null };
  }

  /** The folder tree with how many assets each holds. */
  async folders(userId: string) {
    const groups = await this.prisma.libraryAsset.groupBy({
      by: ['folder'],
      where: { userId },
      _count: { _all: true },
      orderBy: { folder: 'asc' },
    });
    return groups.map((g) => ({ folder: g.folder, count: g._count._all }));
  }

  async get(userId: string, id: string) {
    const asset = await this.prisma.libraryAsset.findFirst({ where: { id, userId } });
    if (!asset) throw new NotFoundException('No library asset with that id');
    return asset;
  }

  async update(userId: string, id: string, changes: { folder?: string; title?: string; tags?: string[]; notes?: string }) {
    const asset = await this.get(userId, id);
    return this.prisma.libraryAsset.update({
      where: { id: asset.id },
      data: {
        ...(changes.folder !== undefined ? { folder: normaliseFolder(changes.folder, asset.folder) } : {}),
        ...(changes.title !== undefined ? { title: changes.title.slice(0, 200) } : {}),
        ...(changes.tags !== undefined ? { tags: normaliseTags(changes.tags) } : {}),
        ...(changes.notes !== undefined ? { notes: changes.notes.slice(0, 2000) } : {}),
      },
      select: SUMMARY,
    });
  }

  /** Counts a use when an asset goes into a post, so proven assets rank first. */
  async markUsed(userId: string, urls: string[]) {
    if (!urls?.length) return;
    await this.prisma.libraryAsset.updateMany({
      where: { userId, url: { in: urls } },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
    });
  }
}
