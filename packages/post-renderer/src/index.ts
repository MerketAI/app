/**
 * @jasper/post-renderer
 *
 * One rendering engine, two environments:
 *   - Next.js, for the live editable preview
 *   - Node + Puppeteer, for PNG/PDF export
 *
 * Contract:
 *   template definition + verified profile + campaign content + assets + theme
 *     -> React composition -> HTML -> export
 */

// Schema
export * from './schema/types';
export * from './schema/components';
export * from './schema/protected-fields';
export * from './schema/snapshot';
export { validateTemplate } from './schema/validate-template';
export type {
  ValidationIssue,
  ValidationResult,
} from './schema/validate-template';

// Validation
export {
  validateAndInjectFacts,
  protectedFieldsUsed,
} from './validation/validate-facts';
export type { FactIssue, FactValidationResult } from './validation/validate-facts';

// Theme
export {
  buildPalette,
  moodForIndustry,
  fontImport,
  withAlpha,
  readableOn,
  TYPE_PAIRS,
} from './render/theme';
export type { Palette, TypePair, TypeMood } from './render/theme';

// Render
export { composePost } from './render/compose';
export type { ComposeInput } from './render/compose';
export { renderPostToHtml, renderPostToMarkup } from './render/render-to-html';
export type { RenderHtmlOptions } from './render/render-to-html';
export { shapeDataUri, maskPathFor } from './render/shape-bridge';

// Autofit
export { AUTOFIT_SCRIPT } from './autofit/autofit-script';
export type { AutofitReport } from './autofit/autofit-script';

// Templates
export { loadTemplates, builtInTemplates, findTemplate } from './templates';
export type { TemplateLoadResult } from './templates';

// Components, for the preview app to reuse
export * from './components/primitives';
