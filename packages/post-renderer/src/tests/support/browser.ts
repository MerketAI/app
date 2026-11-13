/**
 * The Puppeteer harness behind the visual-regression and overflow tests.
 *
 * It exists because the guarantees this renderer makes are only observable in a
 * real browser. Whether content overflows depends on font metrics and line
 * breaking; whether the preview and the export agree depends on React and CSS
 * behaving the same in both. Neither can be asserted from a markup string.
 *
 * Two code paths are driven here, deliberately:
 *
 *   export  - `renderPostToHtml` serialised server-side, loaded as a document.
 *   preview - the same `composePost` tree mounted client-side by React DOM,
 *             inside `postDocumentStyles`, exactly as the Next.js preview will.
 *
 * If those two diverge by a single pixel, the preview is lying to the user
 * about what they will get, so the parity test treats any difference as a
 * failure rather than a tolerance to tune.
 */
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';
import { PNG } from 'pngjs';

import { CANVAS_FORMATS, FormatId, SlotValue } from '../../schema/types';
import { buildPalette, TYPE_PAIRS, Palette, TypePair } from '../../render/theme';
import { postDocumentStyles, renderPostToHtml } from '../../render/render-to-html';
import { AUTOFIT_SCRIPT, AutofitReport } from '../../autofit/autofit-script';
import { validateAndInjectFacts } from '../../validation/validate-facts';
import { findTemplate } from '../../templates';
import { ComposeInput } from '../../render/compose';
import { CONTENT, ICONS, PROFILES, StressCase } from './fixtures';

const PKG_ROOT = resolve(__dirname, '..', '..', '..');
export const BASELINE_DIR = join(PKG_ROOT, 'src', 'tests', 'baselines');
export const ARTEFACT_DIR = join(PKG_ROOT, 'test-output');
const FONT_CACHE_DIR = join(PKG_ROOT, 'test-cache', 'fonts');

/** Brand colour for every fixture, so palettes are comparable across cases. */
const BRAND_COLOR = '#0d9488';

export const UPDATE_BASELINES = process.env.JASPER_UPDATE_BASELINES === '1';
/** Set when running without network: webfonts cannot load, so skip font gates. */
export const FONTS_OFFLINE = process.env.JASPER_RENDER_TESTS_FONTS === 'off';

// ---------------------------------------------------------------------------
// Chrome resolution
// ---------------------------------------------------------------------------

/**
 * Finds a Chrome to drive, preferring an explicit path and otherwise the newest
 * build already in Puppeteer's cache.
 *
 * Puppeteer pins one exact revision and refuses to launch without it, which
 * turns a failed download into a failed test suite. Any recent Chrome renders
 * these layouts identically, so a near-miss version should not be fatal. This
 * mirrors `RendererService.executablePath()` in the backend on purpose: the
 * tests should launch the same browser production does.
 */
export function resolveChrome(): string | undefined {
  const configured = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (configured && existsSync(configured)) return configured;

  const cacheRoot =
    process.env.PUPPETEER_CACHE_DIR || join(homedir(), '.cache', 'puppeteer');
  const chromeRoot = join(cacheRoot, 'chrome');
  if (!existsSync(chromeRoot)) return undefined;

  const found: { path: string; version: number[] }[] = [];
  for (const entry of readdirSync(chromeRoot)) {
    for (const rel of [
      ['chrome-win64', 'chrome.exe'],
      ['chrome-linux64', 'chrome'],
      ['chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'],
      ['chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'],
    ]) {
      const candidate = join(chromeRoot, entry, ...rel);
      if (existsSync(candidate)) {
        const version = (entry.split('-')[1] || '')
          .split('.')
          .map((n) => Number(n) || 0);
        found.push({ path: candidate, version });
        break;
      }
    }
  }

  found.sort((a, b) => {
    for (let i = 0; i < 4; i++) {
      const diff = (b.version[i] ?? 0) - (a.version[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  return found[0]?.path;
}

export async function launchBrowser(): Promise<any> {
  // Required lazily: puppeteer is a test-time dependency, and the package must
  // stay importable in environments that do not have it.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const puppeteer = require('puppeteer');
  const executablePath = resolveChrome();
  return puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars'],
    ...(executablePath ? { executablePath } : {}),
  });
}

// ---------------------------------------------------------------------------
// Webfont caching
// ---------------------------------------------------------------------------

/**
 * Serves Google Fonts from a local cache, downloading each file once.
 *
 * The suite renders dozens of pages, each importing the same families, and
 * Google starts throttling partway through a run. A throttled import does not
 * fail loudly - the page simply renders in a fallback face, with different
 * metrics, so the auto-fit pass settles on different type sizes and the
 * screenshots stop matching the baseline. Several "failures" in this suite were
 * that and nothing else.
 *
 * Caching the bytes makes the run deterministic and, after the first time,
 * offline. A fixed user agent is part of that: Google Fonts serves different
 * CSS - and different formats - depending on what asks.
 */
const FONT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

const inMemoryFonts = new Map<string, { contentType: string; body: Buffer }>();

function fontCachePaths(url: string) {
  const key = createHash('sha1').update(url).digest('hex');
  return {
    body: join(FONT_CACHE_DIR, `${key}.bin`),
    meta: join(FONT_CACHE_DIR, `${key}.json`),
  };
}

async function cachedFont(
  url: string,
): Promise<{ contentType: string; body: Buffer } | null> {
  const hit = inMemoryFonts.get(url);
  if (hit) return hit;

  const paths = fontCachePaths(url);
  if (existsSync(paths.body) && existsSync(paths.meta)) {
    const entry = {
      contentType: JSON.parse(readFileSync(paths.meta, 'utf-8')).contentType,
      body: readFileSync(paths.body),
    };
    inMemoryFonts.set(url, entry);
    return entry;
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': FONT_UA },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return null;
    const entry = {
      contentType: response.headers.get('content-type') || 'application/octet-stream',
      body: Buffer.from(await response.arrayBuffer()),
    };
    mkdirSync(FONT_CACHE_DIR, { recursive: true });
    writeFileSync(paths.body, entry.body);
    writeFileSync(paths.meta, JSON.stringify({ url, contentType: entry.contentType }));
    inMemoryFonts.set(url, entry);
    return entry;
  } catch {
    return null;
  }
}

export async function serveFontsFromCache(page: any): Promise<void> {
  await page.setRequestInterception(true);
  page.on('request', (request: any) => {
    const url = request.url();
    if (!/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url)) {
      request.continue().catch(() => undefined);
      return;
    }
    void cachedFont(url).then((entry) => {
      if (entry) {
        request
          .respond({
            status: 200,
            contentType: entry.contentType,
            // Webfonts are fetched under CORS even from a null origin, and a
            // replayed response without this header is rejected: every face
            // ends up status 'error' and the page silently renders fallback.
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: entry.body,
          })
          .catch(() => undefined);
      } else {
        // No cache and no network: let it fail, so the font probe reports a
        // fallback render rather than the suite silently baselining one.
        request.abort().catch(() => undefined);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Case -> render input
// ---------------------------------------------------------------------------

export interface PreparedCase {
  input: ComposeInput;
  palette: Palette;
  type: TypePair;
  canvas: { width: number; height: number };
  omitted: string[];
  factIssues: string[];
}

/**
 * Turns a stress case into a render input through the real pipeline, fact
 * injection included. Skipping that step would test the renderer against
 * content no caller can actually produce.
 */
export function prepareCase(testCase: StressCase): PreparedCase {
  const template = findTemplate(testCase.templateId);
  if (!template) throw new Error(`No such template: ${testCase.templateId}`);

  const palette = buildPalette(BRAND_COLOR);
  const type = TYPE_PAIRS[template.theme.mood ?? 'clinical'];
  const profile = PROFILES[testCase.profile];
  const content: { values: Record<string, SlotValue> } = {
    values: CONTENT[testCase.content],
  };

  const facts = validateAndInjectFacts(template, profile, content);

  return {
    input: {
      template,
      format: testCase.format,
      content: facts.resolved,
      palette,
      type,
      icons: ICONS,
      // Fixed, so decorative shapes are identical between runs: the
      // determinism test depends on this being seeded rather than random.
      seed: 7,
    },
    palette,
    type,
    canvas: CANVAS_FORMATS[testCase.format],
    omitted: facts.omitted,
    factIssues: facts.issues.map((i) => `${i.severity}: ${i.message}`),
  };
}

// ---------------------------------------------------------------------------
// Rendering in the browser
// ---------------------------------------------------------------------------

export interface RenderObservation {
  report: AutofitReport;
  png: Buffer;
  /** Whether the display and body webfonts actually loaded. */
  fontsLoaded: boolean;
  /**
   * Text and icon elements whose box escaped the canvas. The fit report covers
   * zone overflow; this catches an absolutely positioned zone placed so that
   * its content leaves the page, which no amount of shrinking inside the zone
   * would reveal.
   */
  outOfBounds: { slot: string; rect: [number, number, number, number] }[];
  /** Zones still scroll-overflowing after the fit pass, measured independently. */
  overflowingZones: string[];
}

const measureScript = String.raw`
(function () {
  var canvas = document.getElementById('post-canvas');
  var box = canvas.getBoundingClientRect();
  var tolerance = 1;

  var outOfBounds = [];
  var marks = canvas.querySelectorAll('[data-fit], [data-icon]');
  for (var i = 0; i < marks.length; i++) {
    var el = marks[i];
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (
      r.left < box.left - tolerance ||
      r.top < box.top - tolerance ||
      r.right > box.right + tolerance ||
      r.bottom > box.bottom + tolerance
    ) {
      outOfBounds.push({
        slot: el.getAttribute('data-fit') || el.getAttribute('data-icon') || el.tagName,
        rect: [Math.round(r.left - box.left), Math.round(r.top - box.top), Math.round(r.width), Math.round(r.height)]
      });
    }
  }

  var overflowingZones = [];
  var zones = canvas.querySelectorAll('[data-zone]');
  for (var j = 0; j < zones.length; j++) {
    var z = zones[j];
    if (z.scrollHeight > z.clientHeight + 1 || z.scrollWidth > z.clientWidth + 1) {
      overflowingZones.push(z.getAttribute('data-zone'));
    }
  }

  return { outOfBounds: outOfBounds, overflowingZones: overflowingZones };
})()
`;

/**
 * Reports whether the document's webfonts actually loaded.
 *
 * Two earlier attempts at this were wrong in instructive ways.
 *
 * `document.fonts.check('32px "Poppins"')` is wrong twice: the font shorthand
 * implies weight 400, so for a family declared at 500-900 it matches a face
 * that was never fetched and answers false; and for a family with no
 * `@font-face` rule at all it answers *true*, because the fallback is
 * trivially available. Checking the A4 pair while rendering the square
 * template therefore passed against a document that never contained it.
 *
 * Measuring a sample string's width against monospace is wrong for the same
 * weight reason - probing at 700 when only the 800 face is loaded measures the
 * fallback - and because a family installed on the machine shadows the webfont
 * entirely. Poppins is installed on this development machine, so a width probe
 * cannot distinguish "the webfont arrived" from "Windows has it anyway".
 *
 * What is actually being asked is: did the faces this page needed arrive? A
 * face reaches status 'loaded' only once rendered text required it and the
 * bytes came back, so one loaded face per family answers it exactly, and a
 * failed fetch answers false.
 */
const fontStatusScript = (type: TypePair) => {
  const family = (face: string) => {
    const match = /'([^']+)'/.exec(face);
    return match ? match[1] : face.split(',')[0].trim();
  };
  const families = [family(type.display), family(type.body)];
  return `(function () {
    var want = ${JSON.stringify(families)};
    var loaded = {}, pending = 0;
    document.fonts.forEach(function (f) {
      if (f.status === 'loaded') loaded[f.family] = true;
      if (f.status === 'loading') pending++;
    });
    for (var i = 0; i < want.length; i++) {
      if (!loaded[want[i]]) return false;
    }
    return pending === 0;
  })()`;
};

async function settle(page: any, type: TypePair) {
  // Text metrics are not final until the real faces have loaded, so the fit
  // pass must not run before this resolves.
  await page.evaluate('document.fonts ? document.fonts.ready : null').catch(() => undefined);
  await page.evaluate(`(function () {
    var imgs = Array.prototype.slice.call(document.images);
    return Promise.all(imgs.map(function (img) {
      return img.complete ? null : new Promise(function (done) {
        img.addEventListener('load', done); img.addEventListener('error', done);
      });
    }));
  })()`);
  return page.evaluate(fontStatusScript(type));
}

async function observe(
  page: any,
  prepared: PreparedCase,
): Promise<RenderObservation> {
  const fontsLoaded: boolean = await settle(page, prepared.type);

  const report: AutofitReport = await page.evaluate(
    'window.__fitDesign ? window.__fitDesign() : null',
  );
  if (!report) throw new Error('The document exposed no __fitDesign hook.');

  const measured = await page.evaluate(measureScript);

  const png: Buffer = Buffer.from(
    await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: prepared.canvas.width, height: prepared.canvas.height },
    }),
  );

  return { report, png, fontsLoaded, ...measured };
}

/** The export path: a serialised document, as Puppeteer receives it in production. */
export async function renderExport(
  browser: any,
  prepared: PreparedCase,
): Promise<RenderObservation> {
  const html = renderPostToHtml(prepared.input);
  const page = await browser.newPage();
  try {
    await serveFontsFromCache(page);
    await page.setViewport({ ...prepared.canvas, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
    return await observe(page, prepared);
  } finally {
    await page.close();
  }
}

/**
 * The preview path: the identical React tree mounted client-side.
 *
 * `browserBundle` is the package compiled for the browser; see
 * `browser-bundle.ts` for why that is built rather than imported.
 */
export async function renderPreview(
  browser: any,
  prepared: PreparedCase,
  browserBundle: string,
  reactSources: { react: string; reactDom: string },
): Promise<RenderObservation> {
  const shell = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  ${postDocumentStyles(prepared.input)}
</style>
</head>
<body><div id="root"></div></body>
</html>`;

  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e: Error) => errors.push(e.message));
  page.on('console', (m: any) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  try {
    await serveFontsFromCache(page);
    await page.setViewport({ ...prepared.canvas, deviceScaleFactor: 1 });
    await page.setContent(shell, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Scripts are attached as elements rather than written into the markup.
    // `render-to-html.js` contains the literal string "</script>", which ends
    // an inline script early and spills the rest of the bundle into the
    // document as HTML - which is exactly how this was first discovered.
    for (const content of [
      reactSources.react,
      reactSources.reactDom,
      browserBundle,
      `window.__previewInput = ${JSON.stringify(prepared.input)};
       var composePost = window.__jasperRequire('render/compose').composePost;
       window.__previewRoot = ReactDOM.createRoot(document.getElementById('root'));
       window.__previewRoot.render(composePost(window.__previewInput));`,
      AUTOFIT_SCRIPT,
    ]) {
      await page.addScriptTag({ content });
    }

    await page.waitForSelector('#post-canvas', { timeout: 20000 }).catch(() => {
      throw new Error(
        `The preview never mounted. Page errors: ${errors.join(' | ') || 'none'}`,
      );
    });

    const observation = await observe(page, prepared);
    if (errors.length > 0) {
      throw new Error(`The preview logged errors: ${errors.join(' | ')}`);
    }
    return observation;
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------------
// Image comparison
// ---------------------------------------------------------------------------

export interface PixelDiff {
  width: number;
  height: number;
  /** Pixels differing by more than `channelTolerance` on any channel. */
  differingPixels: number;
  /** Largest single-channel difference seen anywhere. */
  maxChannelDelta: number;
  dimensionsMatch: boolean;
}

export function diffPng(
  a: Buffer,
  b: Buffer,
  channelTolerance = 0,
): PixelDiff {
  const left = PNG.sync.read(a);
  const right = PNG.sync.read(b);

  if (left.width !== right.width || left.height !== right.height) {
    return {
      width: left.width,
      height: left.height,
      differingPixels: left.width * left.height,
      maxChannelDelta: 255,
      dimensionsMatch: false,
    };
  }

  let differing = 0;
  let maxDelta = 0;
  for (let i = 0; i < left.data.length; i += 4) {
    let worst = 0;
    for (let c = 0; c < 4; c++) {
      const delta = Math.abs(left.data[i + c] - right.data[i + c]);
      if (delta > worst) worst = delta;
    }
    if (worst > maxDelta) maxDelta = worst;
    if (worst > channelTolerance) differing++;
  }

  return {
    width: left.width,
    height: left.height,
    differingPixels: differing,
    maxChannelDelta: maxDelta,
    dimensionsMatch: true,
  };
}

// ---------------------------------------------------------------------------
// Baselines and artefacts
// ---------------------------------------------------------------------------

export function baselinePath(name: string): string {
  return join(BASELINE_DIR, `${name}.png`);
}

export function writeArtefact(name: string, png: Buffer): string {
  mkdirSync(ARTEFACT_DIR, { recursive: true });
  const path = join(ARTEFACT_DIR, `${name}.png`);
  writeFileSync(path, png);
  return path;
}

export function readBaseline(name: string): Buffer | null {
  const path = baselinePath(name);
  return existsSync(path) ? readFileSync(path) : null;
}

export function writeBaseline(name: string, png: Buffer): void {
  mkdirSync(BASELINE_DIR, { recursive: true });
  writeFileSync(baselinePath(name), png);
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/** One-line-per-zone summary, printed when a case fails so the cause is visible. */
export function describeReport(report: AutofitReport): string {
  return report.zones
    .map((z) => {
      const sizes = z.elements
        .map((e) => `${e.slot}@${Math.round(e.fontSize)}px`)
        .join(' ');
      const scale = z.scale !== undefined ? ` scale=${z.scale.toFixed(2)}` : '';
      return `    ${z.zone}: ${z.fitted ? 'fits' : 'CLIPPED'}${scale}${sizes ? `  [${sizes}]` : ''}`;
    })
    .join('\n');
}

export { execFileSync };
