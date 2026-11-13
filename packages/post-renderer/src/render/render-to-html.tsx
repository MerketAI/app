import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ComposeInput, composePost } from './compose';
import { postDocumentStyles } from './document-styles';
import { AUTOFIT_SCRIPT } from '../autofit/autofit-script';

export interface RenderHtmlOptions extends ComposeInput {
  /**
   * Inline the auto-fit pass. On for export; the live preview runs the same
   * code from the shared module instead of a script tag.
   */
  includeAutofit?: boolean;
}

/**
 * Renders the composition to a complete HTML document for Puppeteer.
 *
 * The preview and the export share `composePost` and `postDocumentStyles`, so
 * there is exactly one implementation of the layout and one stylesheet. This
 * function only adds what a standalone document needs that a React app already
 * has: the document shell and the auto-fit hook.
 */
export function renderPostToHtml(options: RenderHtmlOptions): string {
  const markup = renderToStaticMarkup(composePost(options));
  const autofit =
    options.includeAutofit === false ? '' : `<script>${AUTOFIT_SCRIPT}</script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  ${postDocumentStyles(options)}
</style>
</head>
<body>
${markup}
${autofit}
</body>
</html>`;
}

/**
 * Renders just the composition markup, for embedding in the Next.js preview.
 * No document shell and no script: the preview mounts this inside the styles
 * from `postDocumentStyles` and runs the auto-fit pass itself.
 */
export function renderPostToMarkup(options: ComposeInput): string {
  return renderToStaticMarkup(composePost(options));
}

export { postDocumentStyles };
