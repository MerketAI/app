import { Injectable, Logger } from '@nestjs/common';
import {
  ALLOWED_ICON_SETS,
  CONCEPT_ICONS,
  conceptsForIndustry,
  isAllowedIconId,
  resolveIconId,
} from './icon-catalogue';

export interface ResolvedIcon {
  /** The concept or text the caller asked for. */
  requested: string;
  /** The Iconify id actually used, or null when nothing matched. */
  iconId: string | null;
  /** Inline SVG markup, already recoloured and sized. */
  svg: string;
  /** False when the fallback mark was substituted. */
  resolved: boolean;
  license?: string;
}

const ICONIFY_BASE = 'https://api.iconify.design';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 2000;

/**
 * Fetches vector icons from Iconify for use in generated designs.
 *
 * Icons are inlined into the design HTML rather than referenced by URL, for
 * three reasons: the stored HTML stays self-contained and reproducible, the
 * headless browser does not need network access at render time, and a slow or
 * unreachable Iconify cannot stall a print render.
 *
 * Only the permissively-licensed sets in ALLOWED_ICON_SETS are ever requested.
 */
@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);
  private readonly cache = new Map<string, { svg: string; expiresAt: number }>();

  /**
   * Returns inline SVG for one icon. Never throws and never returns empty
   * markup - a design must still render if Iconify is unreachable.
   */
  async getIcon(
    request: string,
    options: { color?: string; size?: number } = {},
  ): Promise<ResolvedIcon> {
    const color = options.color || '#111827';
    const size = options.size || 64;
    const iconId = resolveIconId(request);

    if (!iconId) {
      return {
        requested: request,
        iconId: null,
        svg: this.fallbackMark(color, size),
        resolved: false,
      };
    }

    const cacheKey = `${iconId}|${color}|${size}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        requested: request,
        iconId,
        svg: cached.svg,
        resolved: true,
        license: ALLOWED_ICON_SETS[iconId.split(':')[0]]?.license,
      };
    }

    const [prefix, name] = iconId.split(':');
    const url = `${ICONIFY_BASE}/${prefix}/${name}.svg?color=${encodeURIComponent(color)}&height=${size}`;

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'jasper-marketing/1.0' },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        this.logger.warn(`Iconify returned ${response.status} for ${iconId}`);
        return {
          requested: request,
          iconId,
          svg: this.fallbackMark(color, size),
          resolved: false,
        };
      }

      const svg = (await response.text()).trim();

      // Iconify answers a miss with a 200 and an empty-ish body, so check the
      // payload rather than trusting the status code.
      if (!svg.startsWith('<svg')) {
        this.logger.warn(`Iconify returned a non-SVG body for ${iconId}`);
        return {
          requested: request,
          iconId,
          svg: this.fallbackMark(color, size),
          resolved: false,
        };
      }

      this.remember(cacheKey, svg);
      return {
        requested: request,
        iconId,
        svg,
        resolved: true,
        license: ALLOWED_ICON_SETS[prefix]?.license,
      };
    } catch (error) {
      this.logger.warn(
        `Iconify request failed for ${iconId}: ${(error as Error).message}`,
      );
      return {
        requested: request,
        iconId,
        svg: this.fallbackMark(color, size),
        resolved: false,
      };
    }
  }

  /** Resolves several icons concurrently. Order is preserved. */
  async getIcons(
    requests: string[],
    options: { color?: string; size?: number } = {},
  ): Promise<ResolvedIcon[]> {
    return Promise.all(requests.map((r) => this.getIcon(r, options)));
  }

  /**
   * Searches Iconify, restricted to the allowed sets. Powers an icon picker in
   * the dashboard and gives the design model a real vocabulary to choose from.
   */
  async searchIcons(query: string, limit = 24) {
    const prefixes = Object.keys(ALLOWED_ICON_SETS).join(',');
    const url = `${ICONIFY_BASE}/search?query=${encodeURIComponent(query)}&prefixes=${prefixes}&limit=${Math.min(limit, 96)}`;

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'jasper-marketing/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return { query, icons: [], error: `Iconify returned ${response.status}` };

      const data = (await response.json()) as { icons?: string[] };
      const icons = (data.icons || [])
        .filter(isAllowedIconId)
        // Outline variants duplicate the solid ones in most pickers.
        .filter((id) => !id.endsWith('-outline') && !id.endsWith('-24px'));

      return {
        query,
        icons: icons.map((id) => ({
          iconId: id,
          set: ALLOWED_ICON_SETS[id.split(':')[0]]?.title,
          license: ALLOWED_ICON_SETS[id.split(':')[0]]?.license,
        })),
      };
    } catch (error) {
      return { query, icons: [], error: (error as Error).message };
    }
  }

  /** The concept vocabulary, optionally narrowed to an industry. */
  listConcepts(industry?: string) {
    const concepts = industry
      ? conceptsForIndustry(industry)
      : Object.keys(CONCEPT_ICONS);

    return {
      industry: industry || null,
      concepts: concepts.map((c) => ({ concept: c, iconId: CONCEPT_ICONS[c] })),
      allowedSets: ALLOWED_ICON_SETS,
    };
  }

  /**
   * Picks icons for a list of free-text feature lines, e.g. a flyer's service
   * bullets. Falls back to the industry's default concepts for lines that do
   * not match anything, so every bullet still gets a distinct mark.
   */
  async iconsForFeatures(
    features: string[],
    options: { industry?: string; color?: string; size?: number } = {},
  ): Promise<ResolvedIcon[]> {
    const defaults = conceptsForIndustry(options.industry);
    const used = new Set<string>();

    const requests = features.map((feature, index) => {
      const direct = resolveIconId(feature);
      if (direct && !used.has(direct)) {
        used.add(direct);
        return feature;
      }
      // Walk the industry defaults for an unused mark.
      const spare = defaults.find((c) => !used.has(CONCEPT_ICONS[c]));
      if (spare) {
        used.add(CONCEPT_ICONS[spare]);
        return spare;
      }
      return defaults[index % defaults.length];
    });

    return this.getIcons(requests, {
      color: options.color,
      size: options.size,
    });
  }

  private remember(key: string, svg: string) {
    // Simple bound: drop the oldest entry once the cache is full.
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { svg, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  /** A neutral dot, so a missing icon degrades to a bullet rather than a gap. */
  private fallbackMark(color: string, size: number): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="${color}"/></svg>`;
  }
}
