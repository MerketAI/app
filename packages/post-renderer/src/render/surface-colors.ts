import { Palette, readableOn } from './theme';
import { LayoutNode, TemplateDefinition } from '../schema/types';

/**
 * Which colour to paint icons, per the surface they land on.
 *
 * Icons arrive as SVG strings with the colour already baked in, so the caller
 * must decide before fetching them. Two surfaces matter in practice: the page
 * itself, and the panel holding the contact details, which templates routinely
 * invert - a white card on an accent page, or an ink footer on a white one.
 * Painting both from one colour is how accent marks end up invisible on an
 * accent background.
 *
 * The rule is deliberately plain: on a dark surface use white, on a light one
 * use the accent. Black icons on white read as clip-art.
 */
export interface IconPaintPlan {
  /** Icons sitting on the page background - service lists, badges, headers. */
  body: string;
  /** Icons inside the zone that holds the ContactBar. */
  contact: string;
}

function hasContactBar(nodes: LayoutNode[] | undefined): boolean {
  if (!nodes) return false;
  return nodes.some(
    (node) => node.component === 'ContactBar' || hasContactBar(node.children),
  );
}

function resolveBackground(value: unknown, palette: Palette): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  const hex = (palette as unknown as Record<string, string>)[value];
  return typeof hex === 'string' ? hex : undefined;
}

export function iconPaintPlan(
  template: TemplateDefinition,
  palette: Palette,
): IconPaintPlan {
  const paint = (background: string) =>
    readableOn(background) === '#ffffff' ? '#ffffff' : palette.accent;

  const pageBackground =
    resolveBackground(template.theme.background, palette) ?? palette.surface;

  const contactZone = template.zones.find((zone) => hasContactBar(zone.children));
  const contactBackground =
    resolveBackground(contactZone?.style?.background, palette) ?? pageBackground;

  return {
    body: paint(pageBackground),
    contact: paint(contactBackground),
  };
}

/**
 * The colour an emphasised headline run should take on a given background.
 *
 * `onAccentEmphasis` is warm contrast *for the accent background* - the
 * yellow-on-purple move. Using it everywhere puts that same yellow on a white
 * page, where it is close to unreadable. On a light surface the accent itself
 * is the emphasis; on a dark or accent one, the warm token is.
 *
 * This is the mirror of a mistake already made in the other direction, where an
 * accent-analogous highlight was painted on the accent field and vanished. The
 * rule in both cases is the same: pick the colour from the surface the mark
 * actually lands on, never from the template's general mood.
 */
export function emphasisOn(background: string, palette: Palette): string {
  return readableOn(background) === '#ffffff'
    ? palette.onAccentEmphasis
    : palette.accent;
}
