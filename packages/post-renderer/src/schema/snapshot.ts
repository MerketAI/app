import { createHash } from 'crypto';
import {
  CampaignContent,
  FormatId,
  SCHEMA_VERSION,
  SlotValue,
  TemplateDefinition,
} from './types';
import { VerifiedProfile } from './protected-fields';

/**
 * An immutable record of exactly what produced a published post.
 *
 * Without this, editing a template or correcting a phone number silently
 * changes every post already published against it - a doctor's live campaign
 * would shift under them, and an asset they approved would no longer match what
 * is on the page. A snapshot pins every input so any past render can be
 * reproduced byte-for-byte.
 */
export interface RenderSnapshot {
  /** Content hash of the snapshot; stable for identical inputs. */
  snapshotId: string;

  schemaVersion: string;
  templateId: string;
  templateVersion: string;
  format: FormatId;

  /** Which revision of the profile supplied the verified facts. */
  profileVersion: string;
  /** The verified facts as rendered, so the post can be re-created exactly. */
  facts: Record<string, string>;

  /** Copy as rendered, after fact injection. */
  content: Record<string, SlotValue>;

  /** Asset ids referenced, so storage can retain them. */
  assetIds: string[];

  /** Resolved theme values, since a tenant may later change brand colour. */
  theme: Record<string, string>;

  createdAt: string;
}

export interface SnapshotInput {
  template: Pick<TemplateDefinition, 'id' | 'templateVersion'>;
  format: FormatId;
  profile: VerifiedProfile;
  resolvedContent: Record<string, SlotValue>;
  theme: Record<string, string>;
  createdAt?: Date;
}

export function createRenderSnapshot(input: SnapshotInput): RenderSnapshot {
  const facts: Record<string, string> = {};
  const assetIds: string[] = [];

  for (const [slot, value] of Object.entries(input.resolvedContent)) {
    if (value.kind === 'image') assetIds.push(value.assetId);
  }

  // Record only the profile fields that were actually rendered.
  for (const [key, value] of Object.entries(input.profile)) {
    if (key === 'profileVersion') continue;
    if (typeof value === 'string' && value.trim()) facts[key] = value.trim();
  }

  const body = {
    schemaVersion: SCHEMA_VERSION,
    templateId: input.template.id,
    templateVersion: input.template.templateVersion,
    format: input.format,
    profileVersion: input.profile.profileVersion,
    facts,
    content: input.resolvedContent,
    assetIds: assetIds.sort(),
    theme: input.theme,
  };

  return {
    ...body,
    // Excludes createdAt: identical inputs must yield an identical id, which is
    // what makes render output verifiably deterministic.
    snapshotId: hashStable(body),
    createdAt: (input.createdAt ?? new Date()).toISOString(),
  };
}

/** True when two snapshots would produce the same pixels. */
export function snapshotsMatch(a: RenderSnapshot, b: RenderSnapshot): boolean {
  return a.snapshotId === b.snapshotId;
}

/**
 * Stable hash: object keys are sorted recursively, so two structurally equal
 * payloads hash identically regardless of key insertion order.
 */
function hashStable(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex').slice(0, 32);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(',')}}`;
}
