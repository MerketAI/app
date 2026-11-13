import * as React from 'react';
import { Palette, TypePair } from '../render/theme';
import { ColorToken, LayoutNode, StyleMap } from '../schema/types';

/**
 * Implementations of the allow-listed components.
 *
 * Every component receives already-resolved content: no fetching, no async, no
 * side effects. That is what lets the same tree render in a browser for the
 * live preview and through `renderToStaticMarkup` for export, and produce
 * identical output.
 */

export interface RenderContext {
  palette: Palette;
  type: TypePair;
  /** Canvas width, so templates can size relative to the format. */
  canvasWidth: number;
  canvasHeight: number;
  /** Inline SVG by icon key. */
  icons: Record<string, string>;
}

const COLOR_TOKENS: ReadonlySet<string> = new Set<ColorToken>([
  'accent',
  'accentAlt',
  'highlight',
  'onAccentEmphasis',
  'ink',
  'surface',
  'surfaceAlt',
  'onSurface',
  'onSurfaceMuted',
  'onInk',
  'onAccent',
  'transparent',
]);

/** Resolves a colour token to a literal. Unknown values pass through as-is. */
export function resolveColor(value: unknown, palette: Palette): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (value === 'transparent') return 'transparent';
  if (COLOR_TOKENS.has(value)) {
    return (palette as unknown as Record<string, string>)[value];
  }
  // Literal hex is permitted for one-off accents inside a template.
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  return undefined;
}

/**
 * Translates the template style map into React inline styles.
 *
 * Only allow-listed properties reach here - `validateTemplate` has already
 * rejected anything else - so this is a translation, not a second gate.
 */
export function toCss(
  style: StyleMap | undefined,
  ctx: RenderContext,
): React.CSSProperties {
  if (!style) return {};
  const css: React.CSSProperties = {};
  const { palette, type } = ctx;

  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);
  const px = (v: unknown) =>
    typeof v === 'number' ? `${v}px` : typeof v === 'string' ? v : undefined;

  if (style.padding !== undefined) css.padding = px(style.padding);
  if (style.paddingTop !== undefined) css.paddingTop = px(style.paddingTop);
  if (style.paddingRight !== undefined) css.paddingRight = px(style.paddingRight);
  if (style.paddingBottom !== undefined) css.paddingBottom = px(style.paddingBottom);
  if (style.paddingLeft !== undefined) css.paddingLeft = px(style.paddingLeft);
  if (style.gap !== undefined) css.gap = px(style.gap);
  if (style.rowGap !== undefined) css.rowGap = px(style.rowGap);
  if (style.columnGap !== undefined) css.columnGap = px(style.columnGap);
  if (style.borderRadius !== undefined) css.borderRadius = px(style.borderRadius);

  if (style.borderWidth !== undefined) {
    css.borderWidth = px(style.borderWidth);
    css.borderStyle = (style.borderStyle as string) || 'solid';
    css.borderColor = resolveColor(style.borderColor, palette) || 'currentColor';
  }

  if (style.direction) css.flexDirection = style.direction === 'row' ? 'row' : 'column';
  if (style.align) css.alignItems = style.align as React.CSSProperties['alignItems'];
  if (style.alignSelf) {
    css.alignSelf = style.alignSelf as React.CSSProperties['alignSelf'];
  }
  if (style.justify) {
    css.justifyContent = style.justify as React.CSSProperties['justifyContent'];
  }
  if (style.wrap) css.flexWrap = style.wrap as React.CSSProperties['flexWrap'];

  if (style.fontFamily) {
    css.fontFamily = style.fontFamily === 'display' ? type.display : type.body;
  }
  if (style.fontSize !== undefined) css.fontSize = px(style.fontSize);
  if (style.fontWeight !== undefined) css.fontWeight = num(style.fontWeight) ?? 400;
  if (style.lineHeight !== undefined) css.lineHeight = num(style.lineHeight) ?? 1.2;
  if (style.letterSpacing !== undefined) css.letterSpacing = px(style.letterSpacing);
  if (style.textAlign) css.textAlign = style.textAlign as React.CSSProperties['textAlign'];
  if (style.textTransform) {
    css.textTransform = style.textTransform as React.CSSProperties['textTransform'];
  }
  if (style.fontStyle) css.fontStyle = style.fontStyle as React.CSSProperties['fontStyle'];

  const color = resolveColor(style.color, palette);
  if (color) css.color = color;
  const background = resolveColor(style.background, palette);
  if (background) css.background = background;
  if (style.opacity !== undefined) css.opacity = num(style.opacity);

  if (style.objectFit) css.objectFit = style.objectFit as React.CSSProperties['objectFit'];
  if (style.objectPosition) css.objectPosition = String(style.objectPosition);
  if (style.aspectRatio !== undefined) css.aspectRatio = String(style.aspectRatio);

  if (style.shadow) css.filter = `drop-shadow(0 8px 24px rgba(0,0,0,0.22))`;

  return css;
}

// ---------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------

export const Stack: React.FC<{
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ style, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
    {children}
  </div>
);

export const Row: React.FC<{
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ style, children }) => (
  <div style={{ display: 'flex', flexDirection: 'row', minWidth: 0, ...style }}>
    {children}
  </div>
);

export const Grid: React.FC<{
  columns?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ columns = 2, style, children }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      minWidth: 0,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Spacer: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div style={{ flex: '1 1 auto', ...style }} />
);

export const Divider: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div style={{ height: 2, width: '100%', background: 'currentColor', opacity: 0.2, ...style }} />
);

// ---------------------------------------------------------------
// Text
// ---------------------------------------------------------------

/**
 * `data-fit` marks an element the auto-fit pass may shrink, and carries the
 * bounds it must stay within. The pass runs after webfonts settle, because text
 * metrics are not final until then.
 */
export interface FitAttrs {
  'data-fit'?: string;
  'data-fit-min'?: number;
  'data-fit-max'?: number;
  'data-fit-lines'?: number;
}

export const Text: React.FC<{
  value: string;
  style?: React.CSSProperties;
  fit?: FitAttrs;
}> = ({ value, style, fit }) => (
  <span style={{ display: 'block', minWidth: 0, ...style }} {...fit}>
    {value}
  </span>
);

export const Heading: React.FC<{
  value: string;
  style?: React.CSSProperties;
  fit?: FitAttrs;
}> = ({ value, style, fit }) => (
  <h1 style={{ margin: 0, minWidth: 0, ...style }} {...fit}>
    {value}
  </h1>
);

/** Multi-run headline: the emphasis colouring the reference designs all use. */
export const RichText: React.FC<{
  runs: { text: string; emphasis?: boolean }[];
  emphasisColor: string;
  style?: React.CSSProperties;
  fit?: FitAttrs;
}> = ({ runs, emphasisColor, style, fit }) => (
  <h1 style={{ margin: 0, minWidth: 0, ...style }} {...fit}>
    {runs.map((run, i) => (
      <span key={i} style={run.emphasis ? { color: emphasisColor } : undefined}>
        {run.text}
        {i < runs.length - 1 ? ' ' : ''}
      </span>
    ))}
  </h1>
);

// ---------------------------------------------------------------
// Media
// ---------------------------------------------------------------

/**
 * Inline SVG from a trusted source.
 *
 * `dangerouslySetInnerHTML` is confined to this one component. The markup comes
 * only from the icon resolver, which fetches from an allow-listed set of
 * permissively-licensed icon packs - never from a template definition or a
 * model. Template-supplied markup would be an injection vector.
 */
export const Icon: React.FC<{ svg: string; size: number; style?: React.CSSProperties }> = ({
  svg,
  size,
  style,
}) => (
  // `data-icon` is the hook for the stylesheet rule that scales the inline SVG
  // to this box. Iconify returns markup carrying its own width and height, so
  // without that rule a 64px glyph sits inside a 26px slot and spills over the
  // line beneath it.
  <span
    data-icon=""
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      flexShrink: 0,
      overflow: 'hidden',
      ...style,
    }}
    dangerouslySetInnerHTML={{ __html: svg }}
  />
);

export const Image: React.FC<{
  url: string;
  style?: React.CSSProperties;
  maskPath?: string;
  alt?: string;
}> = ({ url, style, maskPath, alt = '' }) => (
  <img
    src={url}
    alt={alt}
    style={{
      display: 'block',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      ...(maskPath ? { clipPath: `path('${maskPath}')` } : {}),
      ...style,
    }}
  />
);

/** A practitioner cutout: transparent PNG, bleeding to the zone edge. */
export const DoctorCutout: React.FC<{
  url: string;
  style?: React.CSSProperties;
}> = ({ url, style }) => (
  <img
    src={url}
    alt=""
    style={{
      display: 'block',
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      objectPosition: 'bottom center',
      filter: 'drop-shadow(0 10px 28px rgba(0,0,0,0.25))',
      ...style,
    }}
  />
);

export const Logo: React.FC<{ url: string; style?: React.CSSProperties }> = ({ url, style }) => (
  <img src={url} alt="" style={{ display: 'block', height: '100%', objectFit: 'contain', ...style }} />
);

/** A generated decorative shape, supplied as a data URI by the composer. */
export const Shape: React.FC<{ dataUri: string; style?: React.CSSProperties }> = ({
  dataUri,
  style,
}) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      backgroundImage: `url("${dataUri}")`,
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      ...style,
    }}
  />
);

// ---------------------------------------------------------------
// Composite content
// ---------------------------------------------------------------

export const Badge: React.FC<{
  value: string;
  style?: React.CSSProperties;
  fit?: FitAttrs;
}> = ({ value, style, fit }) => (
  <span
    {...fit}
    style={{
      display: 'inline-block',
      alignSelf: 'flex-start',
      borderRadius: 999,
      padding: '8px 22px',
      fontWeight: 800,
      ...style,
    }}
  >
    {value}
  </span>
);

export const CTAButton: React.FC<{
  value: string;
  style?: React.CSSProperties;
  fit?: FitAttrs;
}> = ({ value, style, fit }) => (
  <span
    {...fit}
    style={{
      display: 'inline-block',
      alignSelf: 'flex-start',
      borderRadius: 12,
      padding: '18px 40px',
      fontWeight: 800,
      textAlign: 'center',
      ...style,
    }}
  >
    {value}
  </span>
);

/**
 * A service or feature list.
 *
 * Two arrangements, because the reference designs use both: `rows` is the
 * icon-then-label line, `cards` is the centred trust-badge tile. A single slot
 * can also span columns - a dense clinic layout lists eight services in two
 * columns, and splitting that across two slots would make the template lie
 * about how much content it holds.
 */
export const List: React.FC<{
  items: { label: string; icon?: string }[];
  icons: Record<string, string>;
  iconSize: number;
  columns?: number;
  variant?: 'rows' | 'cards';
  style?: React.CSSProperties;
  itemStyle?: React.CSSProperties;
  fit?: FitAttrs;
}> = ({ items, icons, iconSize, columns = 1, variant = 'rows', style, itemStyle, fit }) => {
  const cards = variant === 'cards';
  const gap = Math.round(iconSize * (cards ? 0.5 : 0.45));

  const container: React.CSSProperties =
    columns > 1 || cards
      ? {
          display: 'grid',
          gridTemplateColumns: `repeat(${cards ? items.length || 1 : columns}, minmax(0, 1fr))`,
          gap,
          alignItems: cards ? 'stretch' : 'start',
        }
      : { display: 'flex', flexDirection: 'column', gap };

  return (
    <ul
      style={{ listStyle: 'none', margin: 0, padding: 0, minWidth: 0, ...container, ...style }}
      {...fit}
    >
      {items.map((item, i) => (
        <li
          key={i}
          style={
            cards
              ? {
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: Math.round(iconSize * 0.3),
                  minWidth: 0,
                  ...itemStyle,
                }
              : {
                  display: 'flex',
                  alignItems: 'center',
                  gap,
                  minWidth: 0,
                  ...itemStyle,
                }
          }
        >
          {item.icon && icons[item.icon] ? (
            <Icon svg={icons[item.icon]} size={iconSize} />
          ) : null}
          <span style={{ minWidth: 0 }}>{item.label}</span>
        </li>
      ))}
    </ul>
  );
};

export const KeyValue: React.FC<{
  items: { label: string; value: string }[];
  style?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
  valueStyle?: React.CSSProperties;
  fit?: FitAttrs;
}> = ({ items, style, labelStyle, valueStyle, fit }) => (
  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...style }} {...fit}>
    {items.map((item, i) => (
      <div
        key={i}
        style={{ display: 'flex', justifyContent: 'space-between', gap: 24, minWidth: 0 }}
      >
        <span style={{ fontWeight: 700, ...labelStyle }}>{item.label}</span>
        <span style={valueStyle}>{item.value}</span>
      </div>
    ))}
  </div>
);

/** Contact details: always profile-sourced, so values are verified. */
export const ContactBar: React.FC<{
  entries: { label: string; icon?: string }[];
  icons: Record<string, string>;
  iconSize: number;
  style?: React.CSSProperties;
  direction?: 'row' | 'column';
  fit?: FitAttrs;
}> = ({ entries, icons, iconSize, style, direction = 'column', fit }) => (
  <div
    {...fit}
    style={{
      display: 'flex',
      flexDirection: direction,
      flexWrap: direction === 'row' ? 'wrap' : 'nowrap',
      gap: Math.round(iconSize * 0.5),
      minWidth: 0,
      ...style,
    }}
  >
    {entries.map((entry, i) => (
      <div
        key={i}
        style={{ display: 'flex', alignItems: 'center', gap: Math.round(iconSize * 0.4), minWidth: 0 }}
      >
        {entry.icon && icons[entry.icon] ? (
          <Icon svg={icons[entry.icon]} size={iconSize} />
        ) : null}
        <span style={{ minWidth: 0 }}>{entry.label}</span>
      </div>
    ))}
  </div>
);
