import * as React from 'react';
import {
  Badge,
  CTAButton,
  ContactBar,
  DoctorCutout,
  Divider,
  FitAttrs,
  Grid,
  Heading,
  Icon,
  Image,
  KeyValue,
  List,
  Logo,
  RenderContext,
  RichText,
  Row,
  Shape,
  Spacer,
  Stack,
  Text,
  resolveColor,
  toCss,
} from '../components/primitives';
import { Palette, TypePair } from './theme';
import {
  CANVAS_FORMATS,
  Frame,
  FormatId,
  LayoutNode,
  SlotSpec,
  SlotValue,
  TemplateDefinition,
  Zone,
} from '../schema/types';
import { shapeDataUri, maskPathFor } from './shape-bridge';
import { isContactField } from '../schema/protected-fields';

export interface ComposeInput {
  template: TemplateDefinition;
  format: FormatId;
  /** Slot values after fact injection. Never raw model output. */
  content: Record<string, SlotValue>;
  palette: Palette;
  type: TypePair;
  icons: Record<string, string>;
  /** Stable per brand, so decorative shapes do not shift between renders. */
  seed: number;
}

/**
 * Builds the React composition.
 *
 * Top-level zones are absolutely positioned - that is what produces poster
 * composition and lets elements overlap. Inside a zone, layout is ordinary CSS
 * flow, so a contact panel's lines stack naturally and only the panel itself is
 * pinned. Fixing every text line to a coordinate is what makes template systems
 * brittle; fixing only the zones does not.
 */
export function composePost(input: ComposeInput): React.ReactElement {
  const { template, format, palette, type, icons, seed } = input;
  const canvas = CANVAS_FORMATS[format];

  const ctx: RenderContext = {
    palette,
    type,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    icons,
  };

  const background =
    resolveColor(template.theme.background ?? 'surface', palette) ?? palette.surface;

  const zones = [...template.zones].sort((a, b) => a.layer - b.layer);

  return (
    <div
      id="post-canvas"
      data-canvas-width={canvas.width}
      data-canvas-height={canvas.height}
      style={{
        position: 'relative',
        width: canvas.width,
        height: canvas.height,
        background,
        overflow: 'hidden',
        fontFamily: type.body,
        color: palette.onSurface,
      }}
    >
      {zones.map((zone) => renderZone(zone, input, ctx))}
    </div>
  );
}

function frameFor(zone: Zone, format: FormatId, template: TemplateDefinition): Frame {
  const override = zone.frameByFormat?.[format];
  if (override) return override;
  if (format === template.referenceFormat) return zone.frame;

  // Scale proportionally when a format has no explicit frame. Better than
  // nothing, but a template should declare frames for every format it claims.
  const ref = CANVAS_FORMATS[template.referenceFormat];
  const target = CANVAS_FORMATS[format];
  const sx = target.width / ref.width;
  const sy = target.height / ref.height;
  return {
    x: Math.round(zone.frame.x * sx),
    y: Math.round(zone.frame.y * sy),
    width: Math.round(zone.frame.width * sx),
    height: Math.round(zone.frame.height * sy),
  };
}

function renderZone(
  zone: Zone,
  input: ComposeInput,
  ctx: RenderContext,
): React.ReactElement {
  const frame = frameFor(zone, input.format, input.template);

  const children = zone.children
    .map((node, i) => renderNode(node, input, ctx, `${zone.id}-${i}`, frame))
    .filter(Boolean) as React.ReactNode[];

  // A zone that rendered nothing is dropped entirely - including one with a
  // background. Keeping it painted an empty dark panel wherever an optional
  // section (consulting hours, trust badges) had no content, which is worse
  // than the gap it was trying to avoid. Purely decorative zones declare a
  // Shape child, which counts as rendered content.
  if (children.length === 0) return <React.Fragment key={zone.id} />;

  return (
    <div
      key={zone.id}
      data-zone={zone.id}
      style={{
        position: 'absolute',
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height,
        zIndex: zone.layer,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        ...(zone.clip ? { overflow: 'hidden' } : {}),
        ...toCss(zone.style, ctx),
      }}
    >
      {children}
    </div>
  );
}

function renderNode(
  node: LayoutNode,
  input: ComposeInput,
  ctx: RenderContext,
  key: string,
  frame?: Frame,
): React.ReactNode | null {
  const { template, content, palette, seed } = input;
  const spec: SlotSpec | undefined = node.slot ? template.slots[node.slot] : undefined;
  const value: SlotValue | undefined = node.slot ? content[node.slot] : undefined;

  // A bound slot with no resolved value renders nothing. Fact validation has
  // already decided whether that is acceptable.
  if (node.slot && !value) return null;

  const css = toCss(node.style, ctx);
  const fit = fitAttrsFor(node.slot, spec);
  const children = (node.children || [])
    .map((child, i) => renderNode(child, input, ctx, `${key}-${i}`, frame))
    .filter(Boolean) as React.ReactNode[];

  switch (node.component) {
    case 'Stack':
      return <Stack key={key} style={css}>{children}</Stack>;
    case 'Row':
      return <Row key={key} style={css}>{children}</Row>;
    case 'Grid':
      return (
        <Grid key={key} columns={Number(node.style?.columns) || 2} style={css}>
          {children}
        </Grid>
      );
    case 'Spacer':
      return <Spacer key={key} style={css} />;
    case 'Divider':
      return <Divider key={key} style={css} />;

    case 'Heading': {
      const text = plainText(value, node.text);
      if (!text) return null;
      return <Heading key={key} value={text} style={css} fit={fit} />;
    }
    case 'Text': {
      const text = plainText(value, node.text);
      if (!text) return null;
      return <Text key={key} value={text} style={css} fit={fit} />;
    }
    case 'RichText': {
      if (value?.kind === 'richtext') {
        return (
          <RichText
            key={key}
            runs={value.runs}
            emphasisColor={palette.onAccentEmphasis}
            style={css}
            fit={fit}
          />
        );
      }
      const text = plainText(value, node.text);
      if (!text) return null;
      return <Heading key={key} value={text} style={css} fit={fit} />;
    }

    case 'List': {
      if (value?.kind !== 'list' || value.items.length === 0) return null;
      const capped = spec?.maxItems ? value.items.slice(0, spec.maxItems) : value.items;
      return (
        <List
          key={key}
          items={capped}
          icons={ctx.icons}
          iconSize={Number(node.style?.fontSize) || 40}
          columns={Number(node.style?.columns) || 1}
          variant={node.style?.variant === 'cards' ? 'cards' : 'rows'}
          style={css}
          fit={fit}
        />
      );
    }
    case 'KeyValue': {
      if (value?.kind !== 'keyvalue' || value.items.length === 0) return null;
      return <KeyValue key={key} items={value.items} style={css} fit={fit} />;
    }
    case 'ContactBar': {
      const entries = contactEntries(node, input);
      if (entries.length === 0) return null;
      // A ContactBar gathers several slots, so it has no single spec to take
      // bounds from. Derive them from its own type size: without them a zone
      // whose overflow comes from the contact block cannot be resolved.
      const barSize = Number(node.style?.fontSize) || 34;
      const barFit: FitAttrs = fit ?? {
        'data-fit': 'contact',
        'data-fit-min': Math.round(barSize * 0.72),
        'data-fit-max': barSize,
      };
      return (
        <ContactBar
          key={key}
          entries={entries}
          icons={ctx.icons}
          iconSize={barSize}
          direction={node.style?.direction === 'row' ? 'row' : 'column'}
          style={css}
          fit={barFit}
        />
      );
    }

    case 'Image': {
      if (value?.kind !== 'image') return null;
      return (
        <Image
          key={key}
          url={value.url}
          style={css}
          maskPath={
            node.mask && node.mask !== 'none'
              ? maskPathFor(node.mask, sizeOf(frame, ctx))
              : undefined
          }
        />
      );
    }
    case 'DoctorCutout': {
      if (value?.kind !== 'image') return null;
      return <DoctorCutout key={key} url={value.url} style={css} />;
    }
    case 'Logo': {
      if (value?.kind !== 'image') return null;
      return <Logo key={key} url={value.url} style={css} />;
    }
    case 'Icon': {
      const svg = value?.kind === 'icon' ? value.svg : undefined;
      if (!svg) return null;
      return <Icon key={key} svg={svg} size={Number(node.style?.fontSize) || 40} style={css} />;
    }

    case 'Shape': {
      if (!node.shape) return null;
      const size = sizeOf(frame, ctx);
      const color = resolveColor(node.style?.color, palette) || palette.accent;
      return (
        <Shape
          key={key}
          dataUri={shapeDataUri(node.shape, size.width, size.height, color, seed)}
          style={css}
        />
      );
    }

    case 'Badge': {
      const text = plainText(value, node.text);
      if (!text) return null;
      return <Badge key={key} value={text} style={css} fit={fit} />;
    }
    case 'CTAButton': {
      const text = plainText(value, node.text);
      if (!text) return null;
      return <CTAButton key={key} value={text} style={css} fit={fit} />;
    }

    default:
      return null;
  }
}

/** Contact entries come only from profile-sourced slots. */
function contactEntries(
  node: LayoutNode,
  input: ComposeInput,
): { label: string; icon?: string }[] {
  const { template, content } = input;

  // Bound to one slot, or - unbound - the contact fields only. Gathering every
  // profile slot repeated identity fields that other zones already render.
  const slotNames = node.slot
    ? [node.slot]
    : Object.entries(template.slots)
        .filter(
          ([, spec]) =>
            spec.source === 'profile' &&
            spec.profileField != null &&
            isContactField(spec.profileField),
        )
        .map(([name]) => name);

  const entries: { label: string; icon?: string }[] = [];
  for (const name of slotNames) {
    const value = content[name];
    if (value?.kind === 'text' && value.value.trim()) {
      const field = template.slots[name]?.profileField;
      // Show a web address the way people write it. The verified value keeps
      // its scheme; only the rendering drops it.
      const label =
        field === 'website' || field === 'bookingUrl'
          ? value.value.replace(/^https?:\/\//i, '').replace(/\/$/, '')
          : value.value;
      entries.push({ label, icon: field });
    }
  }
  return entries;
}

/**
 * The box a shape or mask is authored against.
 *
 * `clip-path: path()` resolves in the element's own pixel box, so the path has
 * to be generated at exactly that size. Falling back to a fraction of the
 * canvas - as this did originally - produces a mask that silently misses.
 */
function sizeOf(
  frame: Frame | undefined,
  ctx: RenderContext,
): { width: number; height: number } {
  if (frame) return { width: frame.width, height: frame.height };
  return {
    width: Math.round(ctx.canvasWidth * 0.5),
    height: Math.round(ctx.canvasWidth * 0.5),
  };
}

function plainText(value: SlotValue | undefined, literal?: string): string | null {
  if (value?.kind === 'text') return value.value;
  if (value?.kind === 'richtext') return value.runs.map((r) => r.text).join(' ');
  return literal ?? null;
}

/**
 * Marks an element for the auto-fit pass and carries its bounds.
 *
 * Only `shrink` participates: the other modes are resolved before render, by
 * truncating, hiding, or switching the zone to its alternate arrangement.
 */
function fitAttrsFor(slot: string | undefined, spec: SlotSpec | undefined): FitAttrs | undefined {
  if (!slot || !spec || spec.overflow !== 'shrink') return undefined;
  return {
    'data-fit': slot,
    'data-fit-min': spec.minFontSize,
    'data-fit-max': spec.maxFontSize,
    'data-fit-lines': spec.maxLines,
  };
}
