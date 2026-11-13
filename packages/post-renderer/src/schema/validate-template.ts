import {
  isAllowedComponent,
  isAllowedMask,
  isAllowedShape,
  isAllowedStyleProp,
} from './components';
import { isProtectedField } from './protected-fields';
import {
  CANVAS_FORMATS,
  LayoutNode,
  SCHEMA_VERSION,
  SlotSpec,
  TemplateDefinition,
  Zone,
} from './types';

export interface ValidationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const OVERFLOW_MODES = new Set([
  'shrink',
  'wrap',
  'truncate',
  'hide',
  'reject',
  'alternate-layout',
]);

const SLOT_KINDS = new Set([
  'text',
  'richtext',
  'list',
  'keyvalue',
  'image',
  'icon',
]);

const SLOT_SOURCES = new Set(['profile', 'campaign', 'asset', 'static']);

const MAX_ZONES = 40;
const MAX_NODES_PER_ZONE = 120;
const MAX_DEPTH = 8;

/**
 * Validates a template definition before it may be activated.
 *
 * Template definitions are authored by contractors and stored in a database, so
 * they are untrusted input to the renderer. This is the gate: unknown
 * components, style properties outside the allow-list, protected facts wired to
 * model-authored sources, and frames that fall outside the canvas are all
 * rejected here rather than discovered when a customer's post renders wrong.
 */
export function validateTemplate(
  template: unknown,
  options: { strict?: boolean } = {},
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string) =>
    issues.push({ path, message, severity: 'error' });
  const warn = (path: string, message: string) =>
    issues.push({ path, message, severity: 'warning' });

  if (!template || typeof template !== 'object') {
    return {
      valid: false,
      issues: [
        { path: '', message: 'Template must be an object.', severity: 'error' },
      ],
    };
  }

  const t = template as Partial<TemplateDefinition>;

  // ---- identity and versioning ----
  if (!t.id || typeof t.id !== 'string' || !/^[a-z0-9][a-z0-9-]{2,63}$/.test(t.id)) {
    error('id', 'id must be lower-case alphanumeric with hyphens, 3-64 chars.');
  }
  if (!isSemver(t.templateVersion)) {
    error('templateVersion', 'templateVersion must be semver, e.g. "1.0.0".');
  }
  if (!isSemver(t.schemaVersion)) {
    error('schemaVersion', 'schemaVersion must be semver.');
  } else if (majorOf(t.schemaVersion!) !== majorOf(SCHEMA_VERSION)) {
    error(
      'schemaVersion',
      `Incompatible schema major version: template is ${t.schemaVersion}, engine is ${SCHEMA_VERSION}. Migrate the template.`,
    );
  } else if (t.schemaVersion !== SCHEMA_VERSION) {
    warn(
      'schemaVersion',
      `Template targets ${t.schemaVersion}; engine is ${SCHEMA_VERSION}. Compatible, but consider migrating.`,
    );
  }

  if (!t.title) error('title', 'title is required.');
  if (!t.family) error('family', 'family is required.');
  if (t.status && !['draft', 'active', 'deprecated'].includes(t.status)) {
    error('status', 'status must be draft, active or deprecated.');
  }

  // ---- formats ----
  const formats = Array.isArray(t.formats) ? t.formats : [];
  if (formats.length === 0) {
    error('formats', 'At least one supported format is required.');
  }
  for (const [i, f] of formats.entries()) {
    if (!CANVAS_FORMATS[f]) error(`formats[${i}]`, `Unknown format "${f}".`);
  }
  if (!t.referenceFormat || !CANVAS_FORMATS[t.referenceFormat]) {
    error('referenceFormat', 'referenceFormat must be a known format.');
  } else if (!formats.includes(t.referenceFormat)) {
    error('referenceFormat', 'referenceFormat must also appear in formats.');
  }

  // ---- slots ----
  const slots = (t.slots || {}) as Record<string, SlotSpec>;
  if (Object.keys(slots).length === 0) {
    warn('slots', 'Template declares no content slots.');
  }
  for (const [name, spec] of Object.entries(slots)) {
    const path = `slots.${name}`;
    if (!spec || typeof spec !== 'object') {
      error(path, 'Slot spec must be an object.');
      continue;
    }
    if (!SLOT_KINDS.has(spec.kind)) error(`${path}.kind`, `Unknown kind "${spec.kind}".`);
    if (!SLOT_SOURCES.has(spec.source)) {
      error(`${path}.source`, `Unknown source "${spec.source}".`);
    }
    if (!OVERFLOW_MODES.has(spec.overflow)) {
      error(`${path}.overflow`, `Unknown overflow mode "${spec.overflow}".`);
    }

    // The security rule: a protected fact may only come from the profile.
    if (spec.profileField) {
      if (!isProtectedField(spec.profileField)) {
        error(`${path}.profileField`, `"${spec.profileField}" is not a protected field.`);
      }
      if (spec.source !== 'profile') {
        error(
          `${path}.source`,
          `Slot binds profileField "${spec.profileField}" but source is "${spec.source}". Protected facts must have source "profile".`,
        );
      }
    }
    if (spec.source === 'profile' && !spec.profileField) {
      error(
        `${path}.profileField`,
        'A profile-sourced slot must name which protected field it renders.',
      );
    }

    if (spec.overflow === 'shrink') {
      if (spec.minFontSize == null || spec.maxFontSize == null) {
        error(
          `${path}`,
          'overflow "shrink" requires both minFontSize and maxFontSize.',
        );
      } else if (spec.minFontSize > spec.maxFontSize) {
        error(`${path}`, 'minFontSize must not exceed maxFontSize.');
      }
    }
    if (spec.fallback === 'placeholder' && !spec.placeholder) {
      error(`${path}.placeholder`, 'fallback "placeholder" requires placeholder text.');
    }
    if (spec.required && spec.fallback === 'hide') {
      warn(`${path}`, 'A required slot with fallback "hide" is contradictory.');
    }
  }

  // ---- zones ----
  const zones = Array.isArray(t.zones) ? t.zones : [];
  if (zones.length === 0) error('zones', 'At least one zone is required.');
  if (zones.length > MAX_ZONES) {
    error('zones', `Too many zones (${zones.length} > ${MAX_ZONES}).`);
  }

  const canvas = t.referenceFormat ? CANVAS_FORMATS[t.referenceFormat] : undefined;
  const zoneIds = new Set<string>();
  const referencedSlots = new Set<string>();

  zones.forEach((zone, index) => {
    const path = `zones[${index}]`;
    validateZone(zone, path, canvas, {
      error,
      warn,
      slots,
      referencedSlots,
      zoneIds,
    });
  });

  // ---- cross-checks ----
  for (const [name, spec] of Object.entries(slots)) {
    if (spec.required && !referencedSlots.has(name)) {
      error(
        `slots.${name}`,
        'Slot is required but no zone renders it. It would silently never appear.',
      );
    }
  }
  for (const name of referencedSlots) {
    if (!slots[name]) {
      error(`zones`, `A node binds to undeclared slot "${name}".`);
    }
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const failsOnWarnings = options.strict && issues.length > errors.length;

  return { valid: errors.length === 0 && !failsOnWarnings, issues };
}

function validateZone(
  zone: Zone,
  path: string,
  canvas: { width: number; height: number } | undefined,
  ctx: {
    error: (p: string, m: string) => void;
    warn: (p: string, m: string) => void;
    slots: Record<string, SlotSpec>;
    referencedSlots: Set<string>;
    zoneIds: Set<string>;
  },
): void {
  const { error, warn } = ctx;

  if (!zone || typeof zone !== 'object') {
    error(path, 'Zone must be an object.');
    return;
  }
  if (!zone.id) {
    error(`${path}.id`, 'Zone id is required.');
  } else if (ctx.zoneIds.has(zone.id)) {
    error(`${path}.id`, `Duplicate zone id "${zone.id}".`);
  } else {
    ctx.zoneIds.add(zone.id);
  }

  if (typeof zone.layer !== 'number') {
    error(`${path}.layer`, 'layer must be a number; it determines paint order.');
  }

  const frame = zone.frame;
  if (!frame || typeof frame !== 'object') {
    error(`${path}.frame`, 'frame is required.');
  } else {
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      if (typeof frame[key] !== 'number' || !Number.isFinite(frame[key])) {
        error(`${path}.frame.${key}`, `${key} must be a finite number.`);
      }
    }
    if (frame.width <= 0 || frame.height <= 0) {
      error(`${path}.frame`, 'Zone must have positive width and height.');
    }
    // A zone may deliberately bleed off-canvas, but not sit wholly outside it.
    if (canvas) {
      const outside =
        frame.x >= canvas.width ||
        frame.y >= canvas.height ||
        frame.x + frame.width <= 0 ||
        frame.y + frame.height <= 0;
      if (outside) {
        error(
          `${path}.frame`,
          'Zone lies entirely outside the canvas and would never be visible.',
        );
      }
    }
  }

  if (zone.stack !== undefined && typeof zone.stack !== 'string') {
    error(`${path}.stack`, 'stack must be a string naming the stack to repack with.');
  }
  if (
    zone.stackGap !== undefined &&
    (typeof zone.stackGap !== 'number' || !Number.isFinite(zone.stackGap) || zone.stackGap < 0)
  ) {
    error(`${path}.stackGap`, 'stackGap must be a non-negative number.');
  }

  if (
    zone.stackAlign !== undefined &&
    zone.stackAlign !== 'start' &&
    zone.stackAlign !== 'center'
  ) {
    error(`${path}.stackAlign`, 'stackAlign must be "start" or "center".');
  }

  if (zone.style) validateStyle(zone.style, `${path}.style`, ctx);

  const children = Array.isArray(zone.children) ? zone.children : [];
  if (children.length > MAX_NODES_PER_ZONE) {
    error(`${path}.children`, `Too many nodes (${children.length}).`);
  }
  children.forEach((child, i) =>
    validateNode(child, `${path}.children[${i}]`, 1, ctx),
  );

  if (zone.alternate) {
    const alt = Array.isArray(zone.alternate.children)
      ? zone.alternate.children
      : [];
    if (alt.length === 0) {
      error(`${path}.alternate`, 'alternate must declare children.');
    }
    alt.forEach((child, i) =>
      validateNode(child, `${path}.alternate.children[${i}]`, 1, ctx),
    );
  }

  const usesAlternateLayout = children.some((c) =>
    c.slot ? ctx.slots[c.slot]?.overflow === 'alternate-layout' : false,
  );
  if (usesAlternateLayout && !zone.alternate) {
    warn(
      `${path}.alternate`,
      'A slot in this zone uses overflow "alternate-layout" but the zone declares no alternate.',
    );
  }
}

function validateNode(
  node: LayoutNode,
  path: string,
  depth: number,
  ctx: {
    error: (p: string, m: string) => void;
    warn: (p: string, m: string) => void;
    slots: Record<string, SlotSpec>;
    referencedSlots: Set<string>;
  },
): void {
  const { error } = ctx;

  if (!node || typeof node !== 'object') {
    error(path, 'Node must be an object.');
    return;
  }
  if (depth > MAX_DEPTH) {
    error(path, `Nesting deeper than ${MAX_DEPTH} levels.`);
    return;
  }
  if (!isAllowedComponent(node.component)) {
    error(
      `${path}.component`,
      `"${node.component}" is not an allow-listed component.`,
    );
  }
  if (node.slot) ctx.referencedSlots.add(node.slot);

  if (node.shape && !isAllowedShape(node.shape)) {
    error(`${path}.shape`, `"${node.shape}" is not an allow-listed shape.`);
  }
  if (node.mask && !isAllowedMask(node.mask)) {
    error(`${path}.mask`, `"${node.mask}" is not an allow-listed mask.`);
  }

  // Literal text must never carry a protected fact: those are injected from the
  // verified profile, and a hardcoded phone number would bypass that entirely.
  if (typeof node.text === 'string') {
    if (node.text.length > 120) {
      error(`${path}.text`, 'Literal text is limited to 120 characters.');
    }
    if (looksLikeContactDetail(node.text)) {
      error(
        `${path}.text`,
        'Literal text looks like a phone number, email or URL. Contact details must come from the verified profile via a slot.',
      );
    }
  }

  if (node.style) validateStyle(node.style, `${path}.style`, ctx);

  const children = Array.isArray(node.children) ? node.children : [];
  children.forEach((child, i) =>
    validateNode(child, `${path}.children[${i}]`, depth + 1, ctx),
  );
}

function validateStyle(
  style: Record<string, unknown>,
  path: string,
  ctx: { error: (p: string, m: string) => void },
): void {
  for (const [prop, value] of Object.entries(style)) {
    if (!isAllowedStyleProp(prop)) {
      ctx.error(`${path}.${prop}`, `"${prop}" is not an allow-listed style property.`);
      continue;
    }
    if (typeof value !== 'string' && typeof value !== 'number') {
      ctx.error(`${path}.${prop}`, 'Style values must be a string or number.');
      continue;
    }
    if (typeof value === 'string' && containsUnsafeCss(value)) {
      ctx.error(
        `${path}.${prop}`,
        'Style value contains a disallowed construct (url(), expression, script or import).',
      );
    }
  }
}

/** Blocks the CSS constructs that can load or execute something. */
function containsUnsafeCss(value: string): boolean {
  return /url\s*\(|expression\s*\(|javascript:|@import|<\/?script|behavior\s*:/i.test(
    value,
  );
}

function looksLikeContactDetail(text: string): boolean {
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
  const hasUrl = /https?:\/\/|www\./i.test(text);
  // Seven or more digits, allowing spaces, dashes and a country code.
  const digits = text.replace(/[^\d]/g, '');
  const hasPhone = digits.length >= 7 && /[\d][\d\s()+-]{6,}/.test(text);
  return hasEmail || hasUrl || hasPhone;
}

function isSemver(value: unknown): value is string {
  return typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value);
}

function majorOf(version: string): string {
  return version.split('.')[0];
}
