import { TypePair, fontImport } from './theme';
import { CANVAS_FORMATS, FormatId } from '../schema/types';

/**
 * The stylesheet a composition needs around it.
 *
 * Lives apart from `render-to-html` so the live preview can take it without
 * pulling `react-dom/server` into a browser bundle, and exported because this
 * is the one place the preview and the export could silently diverge: the
 * composition itself is shared React, but a reset or font rule present in only
 * one of them changes text metrics and therefore the auto-fit result. The
 * parity test asserts the two paths render identically, which only holds while
 * both take their styles from here.
 *
 * Note that these rules are document-scoped - they size `body` to the canvas.
 * The preview therefore renders inside an iframe rather than inlining them
 * into the dashboard, which also makes the preview a real document rather than
 * an approximation of one.
 */
export function postDocumentStyles(options: {
  format: FormatId;
  type: TypePair;
}): string {
  const canvas = CANVAS_FORMATS[options.format];
  return `${fontImport(options.type)}
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { width: ${canvas.width}px; height: ${canvas.height}px; overflow: hidden; }
  img { display: block; }
  ul, ol { list-style: none; }
  /* Inline icons carry their own intrinsic width and height; scale them to the
     box the layout gave them. */
  [data-icon] > svg { width: 100%; height: 100%; display: block; }`;
}
