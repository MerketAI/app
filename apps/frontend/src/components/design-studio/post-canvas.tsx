'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  CANVAS_FORMATS,
  composePost,
  postDocumentStyles,
  runAutofit,
  type AutofitReport,
  type ComposeInput,
} from '@jasper/post-renderer';

/**
 * The live preview surface.
 *
 * It renders inside an iframe, for two reasons that both matter.
 *
 * The shared stylesheet is document-scoped - it zeroes every margin and sizes
 * `body` to the canvas - so inlining it into the dashboard would wreck the page
 * around it. More importantly, the auto-fit pass measures a *document*: it asks
 * whether content overflows its zone given the fonts that actually loaded. Run
 * it inside the dashboard and it measures the dashboard's cascade, not the
 * export's, and the preview quietly stops predicting the PNG.
 *
 * So the iframe is given the same shell the export produces, a React root is
 * mounted into it, and `runAutofit` evaluates the very same script the export
 * inlines. The package's parity test asserts this arrangement is pixel-
 * identical to the exported file.
 */
export function PostCanvas({
  input,
  onReport,
  className,
}: {
  input: ComposeInput;
  onReport?: (report: AutofitReport | null) => void;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const rootRef = useRef<{ container: Element; root: Root } | null>(null);
  const shellRef = useRef<string>('');
  const [scale, setScale] = useState(1);
  const [fontsReady, setFontsReady] = useState(false);

  const canvas = CANVAS_FORMATS[input.format];
  const styles = postDocumentStyles({ format: input.format, type: input.type });

  // Scale the canvas down to the space available. The document inside is
  // always rendered at full size - anything else would change text metrics and
  // make the preview lie about line breaks.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const fit = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      setScale(Math.min(width / canvas.width, height / canvas.height, 1));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    return () => observer.disconnect();
  }, [canvas.width, canvas.height]);

  const mount = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc) return;

    // The shell is rewritten only when the stylesheet changes - a new format or
    // a different type pair. Rewriting it on every keystroke would refetch the
    // webfonts and flash the canvas.
    if (shellRef.current !== styles) {
      discard(rootRef.current);
      rootRef.current = null;
      doc.open();
      doc.write(
        `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>${styles}</style></head><body><div id="root"></div></body></html>`,
      );
      doc.close();
      shellRef.current = styles;
      setFontsReady(false);

      const settle = () => setFontsReady(true);
      const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts;
      if (fonts) fonts.ready.then(settle, settle);
      else settle();
    }

    const container = doc.getElementById('root');
    if (!container) return;

    // The root is tracked on the container itself, not only in a ref.
    //
    // React warns - loudly and correctly - if `createRoot` runs twice on the
    // same element, and StrictMode's mount/unmount/mount made that happen:
    // the unmount is deferred, so the element outlived the ref that pointed at
    // it. A marker on the node is the one record that cannot get out of step
    // with the node's actual state.
    if (rootRef.current?.container !== container) {
      discard(rootRef.current);
      const existing = (container as RootedElement)[ROOT_KEY];
      const root = existing ?? createRoot(container);
      (container as RootedElement)[ROOT_KEY] = root;
      rootRef.current = { container, root };
    }

    rootRef.current.root.render(
      <AfterCommit
        onCommit={() => {
          const win = frame.contentWindow;
          if (!win) return;
          // Text metrics are not final until the real faces have loaded, so a
          // fit run before that measures the fallback.
          if (!fontsReady) return;
          onReport?.(runAutofit(win as unknown as Window));
        }}
      >
        {composePost(input)}
      </AfterCommit>,
    );
  }, [input, styles, fontsReady, onReport]);

  useEffect(() => {
    mount();
  }, [mount]);

  useEffect(
    () => () => {
      discard(rootRef.current);
      rootRef.current = null;
      // Force a fresh document on remount. Without this, StrictMode's second
      // mount reuses a container whose root is already queued for unmount.
      shellRef.current = '';
    },
    [],
  );

  return (
    <div ref={hostRef} className={className}>
      <div
        style={{
          width: canvas.width * scale,
          height: canvas.height * scale,
          margin: '0 auto',
        }}
      >
        <iframe
          ref={frameRef}
          title="Post preview"
          onLoad={mount}
          // A same-origin iframe, so the React root and the fit pass can reach
          // into it. The content is our own composition, never tenant HTML.
          style={{
            width: canvas.width,
            height: canvas.height,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            display: 'block',
            borderRadius: 4,
            boxShadow: '0 10px 40px rgba(15, 23, 42, 0.18)',
          }}
        />
      </div>
    </div>
  );
}

/**
 * Unmounts a root outside the current render.
 *
 * React warns when one root is unmounted while another is mid-render, and an
 * effect body runs inside the parent root's commit - so this is deferred by a
 * microtask rather than called inline.
 */
function discard(mounted: { container: Element; root: Root } | null) {
  if (!mounted) return;
  delete (mounted.container as RootedElement)[ROOT_KEY];
  // A task, not a microtask: a microtask queued during the commit can still
  // run inside React's synchronous work loop, which is what the warning is
  // about.
  setTimeout(() => mounted.root.unmount(), 0);
}

const ROOT_KEY = '__jasperPreviewRoot';
type RootedElement = Element & { [ROOT_KEY]?: Root };

/** Calls back once React has committed, which is when the DOM is measurable. */
function AfterCommit({
  children,
  onCommit,
}: {
  children: React.ReactNode;
  onCommit: () => void;
}) {
  useEffect(() => {
    // One frame later: the commit has happened, but layout has not necessarily
    // been flushed, and the fit pass reads geometry.
    const handle = requestAnimationFrame(onCommit);
    return () => cancelAnimationFrame(handle);
  });
  return <>{children}</>;
}
