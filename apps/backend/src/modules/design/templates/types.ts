import { Palette, TypePair } from './tokens';

export interface FeatureItem {
  text: string;
  /** Inline SVG, already coloured and sized by AssetsService. */
  iconSvg: string;
}

export interface ContactLine {
  iconSvg: string;
  text: string;
}

export interface TimingRow {
  label: string;
  value: string;
}

/**
 * Everything a template needs, fully resolved.
 *
 * Templates are synchronous and pure: all I/O (icon fetches, artwork
 * generation, profile lookup) happens before one is invoked. That keeps them
 * cheap to unit test and impossible to stall a render.
 */
export interface TemplateContext {
  width: number;
  height: number;
  palette: Palette;
  type: TypePair;
  /** Stable per brand, so decorative shapes do not shift between renders. */
  seed: number;

  brandName: string;
  headline: string;
  subheadline?: string;
  /** Section heading above the feature list. */
  featuresTitle?: string;
  features: FeatureItem[];
  contact: ContactLine[];
  timings?: TimingRow[];
  badges?: FeatureItem[];
  ctaText?: string;

  heroImageUrl?: string;
  /** Transparent PNG of the practitioner, stood over the layout. */
  cutoutUrl?: string;
  /** Credit line a stock licence obliges us to display. */
  photoCredit?: string;
  logoUrl?: string;

  /** Marketing copy for offer/event posts. */
  eyebrow?: string;
  footnote?: string;

  escape(value: string): string;
}

export interface TemplateDefinition {
  id: string;
  title: string;
  /**
   * The background the body content sits on. Icon and text colours are chosen
   * from this - accent-coloured marks on an accent page are invisible.
   */
  surface: 'light' | 'dark' | 'accent';
  /** Post types this layout suits. */
  postTypes: string[];
  /** Best aspect: 'portrait' | 'square' | 'any'. */
  orientation: 'portrait' | 'square' | 'any';
  /** How many feature lines it shows well. */
  featureCapacity: number;
  render(ctx: TemplateContext): string;
}
