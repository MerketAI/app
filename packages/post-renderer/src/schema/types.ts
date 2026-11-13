import { ComponentName, MaskName, ShapeName, StyleProp } from './components';
import { ProtectedField } from './protected-fields';

/**
 * The schema contract version.
 *
 * Bumped when the *shape* of a template definition changes. Stored on every
 * template and every render snapshot so an old published post can always be
 * re-rendered by the engine that understands it.
 */
export const SCHEMA_VERSION = '1.0.0';

// ---------------------------------------------------------------
// Canvas formats
// ---------------------------------------------------------------

export type FormatId =
  | 'instagram_square'
  | 'instagram_portrait'
  | 'instagram_story'
  | 'facebook_post'
  | 'linkedin_post'
  | 'a4_portrait'
  | 'a5_portrait';

export interface CanvasFormat {
  id: FormatId;
  width: number;
  height: number;
  /** Multiplier applied at export for print-grade output. */
  exportScale?: number;
}

export const CANVAS_FORMATS: Record<FormatId, CanvasFormat> = {
  instagram_square: { id: 'instagram_square', width: 1080, height: 1080 },
  instagram_portrait: { id: 'instagram_portrait', width: 1080, height: 1350 },
  instagram_story: { id: 'instagram_story', width: 1080, height: 1920 },
  facebook_post: { id: 'facebook_post', width: 1200, height: 630 },
  linkedin_post: { id: 'linkedin_post', width: 1200, height: 1200 },
  a4_portrait: { id: 'a4_portrait', width: 1240, height: 1754, exportScale: 2 },
  a5_portrait: { id: 'a5_portrait', width: 874, height: 1240, exportScale: 2 },
};

// ---------------------------------------------------------------
// Slots - the content contract
// ---------------------------------------------------------------

export type OverflowMode =
  /** Reduce font size within the slot's min/max until it fits. */
  | 'shrink'
  /** Allow additional lines, growing within the zone. */
  | 'wrap'
  /** Cut at the limit and append an ellipsis. */
  | 'truncate'
  /** Drop the element entirely; the layout must still read. */
  | 'hide'
  /** Fail the render. For content that must not be silently altered. */
  | 'reject'
  /** Switch the zone to its declared alternate arrangement. */
  | 'alternate-layout';

export type SlotKind = 'text' | 'richtext' | 'list' | 'keyvalue' | 'image' | 'icon';

/**
 * Where a slot's value is allowed to come from.
 *
 * `profile` is the security boundary: the Art Director may choose to show the
 * slot, but the value is injected from the verified profile afterwards.
 */
export type SlotSource = 'profile' | 'campaign' | 'asset' | 'static';

export interface SlotSpec {
  kind: SlotKind;
  source: SlotSource;
  required: boolean;

  /** Required when `source` is 'profile'. */
  profileField?: ProtectedField;

  maxChars?: number;
  maxLines?: number;
  /** Bounds for `shrink`, in canvas pixels. */
  minFontSize?: number;
  maxFontSize?: number;

  /** Maximum entries, for list and keyvalue slots. */
  maxItems?: number;
  /** Per-entry character budget, for list slots. */
  maxItemChars?: number;

  overflow: OverflowMode;

  /**
   * What to do when an optional slot has no value. Defaults to 'hide' so a
   * missing field never renders an empty label.
   */
  fallback?: 'hide' | 'placeholder';
  placeholder?: string;

  /** Human-readable guidance, surfaced to the Art Director and to editors. */
  description?: string;
}

// ---------------------------------------------------------------
// Layout
// ---------------------------------------------------------------

/**
 * A rectangle in canvas coordinates.
 *
 * Top-level zones are absolutely positioned - that is what produces poster
 * composition rather than a stacked web page. Flow inside a zone is ordinary
 * CSS, so a contact panel's name, qualification and phone stack naturally and
 * only the zone itself is pinned.
 */
export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Style values are tokens or literals; `validateTemplate` enforces which. */
export type StyleValue = string | number;
export type StyleMap = Partial<Record<StyleProp, StyleValue>>;

/** A node in the flow *inside* a zone. */
export interface LayoutNode {
  component: ComponentName;
  /** Binds this node to a content slot. */
  slot?: string;
  style?: StyleMap;
  /** Literal text for decorative labels only; never for protected facts. */
  text?: string;
  shape?: ShapeName;
  mask?: MaskName;
  children?: LayoutNode[];
}

/**
 * A top-level composition zone: pinned to the canvas, with normal flow inside.
 */
export interface Zone {
  id: string;
  /** Paint order. Higher sits above, which is how elements overlap. */
  layer: number;
  /** Base frame, in the template's reference format. */
  frame: Frame;
  /** Per-format overrides, for templates supporting several canvases. */
  frameByFormat?: Partial<Record<FormatId, Frame>>;
  style?: StyleMap;
  /** Clip children to the zone. Needed for masked media. */
  clip?: boolean;

  /**
   * Zones sharing a stack name are repacked vertically against their measured
   * content, after the fit pass.
   *
   * Absolute positioning is what gives these layouts their composition, and it
   * is also why an omitted section leaves a hole: nothing reflows into the gap.
   * An Art Director that correctly decides a post needs no consulting hours
   * would otherwise produce a flyer with a void in the middle of it. Members of
   * a stack close up instead.
   *
   * Repacking only ever moves a zone *up*. Content that could not be shrunk to
   * fit must not be allowed to push the next zone down into a pinned footer.
   */
  stack?: string;
  /** Space to leave below this zone when its stack is repacked. */
  stackGap?: number;
  /**
   * How the repacked stack sits in the space it was given. Read from the first
   * member. 'center' lets a short stack sit in the middle rather than clinging
   * to the top, which is the difference between a sparse post and a sheet of
   * white with a sentence on it.
   */
  stackAlign?: 'start' | 'center';

  children: LayoutNode[];
  /**
   * Arrangement used when a slot in this zone overflows with
   * `alternate-layout`. Same contract, looser composition.
   */
  alternate?: {
    frame?: Frame;
    children: LayoutNode[];
  };
}

// ---------------------------------------------------------------
// Theme
// ---------------------------------------------------------------

/**
 * Token names a template may reference. Concrete values are resolved per
 * tenant from the brand colour, so one template serves every brand.
 */
export type ColorToken =
  | 'accent'
  | 'accentAlt'
  | 'highlight'
  | 'onAccentEmphasis'
  | 'ink'
  | 'surface'
  | 'surfaceAlt'
  | 'onSurface'
  | 'onSurfaceMuted'
  | 'onInk'
  | 'onAccent'
  | 'transparent';

export type FontRole = 'display' | 'body';

export interface ThemeSpec {
  /** Suggested type mood; the tenant's industry may override. */
  mood?: 'playful' | 'clinical' | 'warm' | 'editorial' | 'bold';
  /** Canvas background token. */
  background?: ColorToken;
}

// ---------------------------------------------------------------
// Template definition
// ---------------------------------------------------------------

export type TemplateStatus = 'draft' | 'active' | 'deprecated';

export interface TemplateCapabilities {
  /** Longest service list the composition reads well with. */
  maxServices: number;
  supportsCutout: boolean;
  supportsPhoto: boolean;
  supportsTimings: boolean;
  supportsBadges: boolean;
}

export interface TemplateDefinition {
  /** Contract version this definition was authored against. */
  schemaVersion: string;
  /** Stable identity, e.g. 'doctor-branding-01'. */
  id: string;
  /** Bumped on every edit. A published post pins the version it used. */
  templateVersion: string;
  title: string;
  /** Grouping for selection, e.g. 'medical-editorial'. */
  family: string;
  status: TemplateStatus;

  /** Formats this template has been composed for. */
  formats: FormatId[];
  /** The format the base frames are authored in. */
  referenceFormat: FormatId;

  theme: ThemeSpec;
  capabilities: TemplateCapabilities;
  slots: Record<string, SlotSpec>;
  zones: Zone[];

  /** Free-text note for editors and for Art Director selection. */
  description?: string;
  /** Campaign types this layout suits, used for selection. */
  campaignTypes?: string[];
}

// ---------------------------------------------------------------
// Render inputs
// ---------------------------------------------------------------

export interface ListItemValue {
  label: string;
  /** Concept name or icon id; resolved to SVG before render. */
  icon?: string;
}

export interface KeyValueItem {
  label: string;
  value: string;
}

export type SlotValue =
  | { kind: 'text'; value: string }
  | { kind: 'richtext'; runs: { text: string; emphasis?: boolean }[] }
  | { kind: 'list'; items: ListItemValue[] }
  | { kind: 'keyvalue'; items: KeyValueItem[] }
  | { kind: 'image'; assetId: string; url: string }
  | { kind: 'icon'; svg: string };

/** Copy written by the Art Director. Never contains protected facts. */
export interface CampaignContent {
  /** Which slots the Art Director chose to display. */
  visibleSlots?: string[];
  values: Record<string, SlotValue>;
}

export interface ResolvedAssets {
  /** Inline SVG by icon key, pre-resolved so render performs no I/O. */
  icons: Record<string, string>;
  images: Record<string, { assetId: string; url: string }>;
}
