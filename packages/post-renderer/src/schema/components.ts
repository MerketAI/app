/**
 * The allow-listed component and style vocabulary.
 *
 * Template definitions come from a database and may be authored by contractors
 * through an admin panel. They therefore have to be treated as untrusted input:
 * no raw HTML, no JavaScript, no arbitrary CSS. A template may only name a
 * component from this list and set properties from the style allow-list below,
 * and `validateTemplate` rejects anything else before a template can be
 * activated.
 */

/** Components a template may place inside a zone. */
export const ALLOWED_COMPONENTS = [
  // Structure
  'Stack', // vertical flow
  'Row', // horizontal flow
  'Grid', // simple n-column grid
  'Spacer',

  // Content
  'Heading',
  'Text',
  'RichText', // multi-run headline: emphasis spans, still plain text
  'List', // icon + label rows
  'KeyValue', // label/value pairs, e.g. consulting hours

  // Media
  'Image',
  'DoctorCutout',
  'Logo',
  'Icon',

  // Decoration
  'Shape', // generated SVG: blob, wave, arc, diagonal, ribbon
  'Divider',
  'Badge',

  // Calls to action and contact
  'CTAButton',
  'ContactBar',
] as const;

export type ComponentName = (typeof ALLOWED_COMPONENTS)[number];

const COMPONENT_SET: ReadonlySet<string> = new Set(ALLOWED_COMPONENTS);

export function isAllowedComponent(name: string): name is ComponentName {
  return COMPONENT_SET.has(name);
}

/**
 * Style properties a template may set.
 *
 * Deliberately narrow. Anything capable of loading a resource
 * (`background-image`, `@import`, `url()`), running script (`behavior`,
 * `expression`) or escaping the canvas (`position: fixed`) is absent by design.
 * Images arrive through the `Image` component with a resolved asset id, never
 * through CSS.
 */
export const ALLOWED_STYLE_PROPS = [
  // Box
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'gap',
  'rowGap',
  'columnGap',
  'borderRadius',
  'borderWidth',
  'borderStyle',
  'borderColor',

  // Flow
  'direction',
  'align',
  'justify',
  'wrap',
  // Lets a template override a component's own alignment - CTAButton pins
  // itself to the start of its zone, which is right in a left-aligned panel
  // and wrong in a centred card.
  'alignSelf',
  'columns',
  'variant',

  // Type
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textTransform',
  'fontStyle',

  // Colour - values must resolve to theme tokens, see style.ts
  'color',
  'background',
  'opacity',

  // Media fit
  'objectFit',
  'objectPosition',
  'aspectRatio',

  // Decoration
  'shape',
  'shadow',
  'maskShape',
] as const;

export type StyleProp = (typeof ALLOWED_STYLE_PROPS)[number];

const STYLE_SET: ReadonlySet<string> = new Set(ALLOWED_STYLE_PROPS);

export function isAllowedStyleProp(name: string): name is StyleProp {
  return STYLE_SET.has(name);
}

/** Generated shapes a template may reference by name. */
export const ALLOWED_SHAPES = [
  'blob',
  'wave',
  'arc',
  'diagonal',
  'cloud',
  'ribbon',
  'dots',
  'wash',
  'confetti',
  'circle',
] as const;

export type ShapeName = (typeof ALLOWED_SHAPES)[number];

const SHAPE_SET: ReadonlySet<string> = new Set(ALLOWED_SHAPES);

export function isAllowedShape(name: string): name is ShapeName {
  return SHAPE_SET.has(name);
}

/** Masks that may be applied to a media element. */
export const ALLOWED_MASKS = [
  'none',
  'cloudBottom',
  'arcBottom',
  'diagonal',
  'circle',
  'arch',
  'roundedRect',
] as const;

export type MaskName = (typeof ALLOWED_MASKS)[number];

const MASK_SET: ReadonlySet<string> = new Set(ALLOWED_MASKS);

export function isAllowedMask(name: string): name is MaskName {
  return MASK_SET.has(name);
}
