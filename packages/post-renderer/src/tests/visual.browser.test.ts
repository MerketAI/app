/**
 * Visual regression, overflow and parity tests.
 *
 * These need a real browser, so they are not part of `npm test`; run them with
 * `npm run test:browser`. They are the tests that actually hold the renderer to
 * its promises, because every promise it makes is about layout:
 *
 *   1. Nothing clips, across the stress matrix.
 *   2. The overflow report has teeth - a case built to overflow is reported.
 *   3. Identical inputs render identically, byte for byte.
 *   4. The preview and the export agree pixel for pixel.
 *   5. Committed baselines catch unintended visual change.
 *
 * Run with JASPER_UPDATE_BASELINES=1 to re-record the baselines after an
 * intended design change. Baselines are tied to the webfonts actually loading;
 * the suite refuses to record or compare them when they have not.
 */
import { writeFileSync } from 'fs';
import { join } from 'path';

import { STRESS_CASES } from './support/fixtures';
import {
  ARTEFACT_DIR,
  FONTS_OFFLINE,
  PreparedCase,
  UPDATE_BASELINES,
  describeReport,
  diffPng,
  launchBrowser,
  prepareCase,
  readBaseline,
  renderExport,
  renderPreview,
  resolveChrome,
  writeArtefact,
  writeBaseline,
} from './support/browser';
import { buildBrowserBundle, reactSources } from './support/browser-bundle';
import { AutofitReport } from '../autofit/autofit-script';

jest.setTimeout(240_000);

const FITTING_CASES = STRESS_CASES.filter((c) => !c.expectOverflow);
const OVERFLOW_CASES = STRESS_CASES.filter((c) => c.expectOverflow);

/** Parity is proven on a representative subset: it is the slowest check here. */
const PARITY_CASES = ['square-typical', 'square-hindi', 'a4-long-address', 'square-sparse'];

let browser: any;
let prepared: Record<string, PreparedCase> = {};
const exports_: Record<string, { png: Buffer; report: AutofitReport; fontsLoaded: boolean }> = {};

beforeAll(async () => {
  if (!resolveChrome() && !process.env.PUPPETEER_EXECUTABLE_PATH) {
    // Puppeteer may still resolve its own download; only warn.
    console.warn(
      'No cached Chrome found. Puppeteer will try its pinned download; run "npx puppeteer browsers install chrome" if this fails.',
    );
  }
  browser = await launchBrowser();
  for (const testCase of STRESS_CASES) {
    prepared[testCase.name] = prepareCase(testCase);
  }
});

afterAll(async () => {
  if (browser) await browser.close();
});

// ---------------------------------------------------------------------------
// 1 + 5. Nothing clips, and the result matches the committed baseline.
// ---------------------------------------------------------------------------

describe('the stress matrix renders without clipping', () => {
  it.each(FITTING_CASES.map((c) => [c.name, c] as const))(
    '%s',
    async (name, testCase) => {
      const prep = prepared[name];
      const observed = await renderExport(browser, prep);
      exports_[name] = {
        png: observed.png,
        report: observed.report,
        fontsLoaded: observed.fontsLoaded,
      };
      writeArtefact(name, observed.png);

      if (!FONTS_OFFLINE) {
        expect(observed.fontsLoaded).toBe(true);
      }

      if (!observed.report.ok || observed.overflowingZones.length > 0) {
        console.error(`\n${name}: layout did not fit\n${describeReport(observed.report)}`);
      }

      expect(observed.report.clippedZones).toEqual([]);
      expect(observed.report.ok).toBe(true);
      // Measured independently of the fit hook, so a bug in the hook's own
      // overflow test cannot make this pass.
      expect(observed.overflowingZones).toEqual([]);
      // And nothing escaped the page: shrinking inside a zone cannot fix a
      // zone positioned off the canvas.
      expect(observed.outOfBounds).toEqual([]);

      // A zone sitting at its minimum fits only because it ran out of room to
      // shrink. That is a design problem, not a pass, so surface it.
      const atMinimum = observed.report.zones
        .filter((z) => z.scale === 0 && z.elements.length > 0)
        .map((z) => z.zone);
      if (atMinimum.length > 0) {
        console.warn(
          `${name}: these zones only fit at their minimum font size: ${atMinimum.join(', ')}`,
        );
      }

      const baseline = readBaseline(name);
      if (UPDATE_BASELINES) {
        if (!FONTS_OFFLINE || observed.fontsLoaded) {
          writeBaseline(name, observed.png);
        }
        return;
      }
      if (!baseline) {
        console.warn(
          `${name}: no baseline recorded. Run with JASPER_UPDATE_BASELINES=1 to record one.`,
        );
        return;
      }

      const diff = diffPng(baseline, observed.png, 2);
      if (diff.differingPixels > 0) {
        writeFileSync(join(ARTEFACT_DIR, `${name}.baseline.png`), baseline);
      }
      expect(diff.dimensionsMatch).toBe(true);
      // Anti-aliasing of identical text on the same machine is stable, so a
      // real change shows up as thousands of pixels, not a handful. The
      // threshold is a tiny fraction of the canvas rather than zero because
      // GPU-less rasterisation is not bit-exact across Chrome patch releases.
      const budget = Math.round(diff.width * diff.height * 0.0005);
      expect(diff.differingPixels).toBeLessThanOrEqual(budget);
    },
  );
});

// ---------------------------------------------------------------------------
// 2. The control: content built to overflow must be reported.
// ---------------------------------------------------------------------------

describe('the overflow report is not vacuously passing', () => {
  it.each(OVERFLOW_CASES.map((c) => [c.name, c] as const))(
    '%s is reported as not fitting',
    async (name) => {
      const prep = prepared[name];
      const observed = await renderExport(browser, prep);
      writeArtefact(name, observed.png);

      // Either the fit pass could not resolve it, or it only resolved it by
      // driving a zone to its minimum. Both are reportable; silently shipping
      // clipped text is not.
      const clipped = observed.report.clippedZones.length > 0;
      const atMinimum = observed.report.zones.some(
        (z) => z.scale === 0 && z.elements.length > 0,
      );

      if (!clipped && !atMinimum) {
        console.error(
          `\n${name}: expected this to be unfittable, but it reported clean\n${describeReport(observed.report)}`,
        );
      }
      expect(clipped || atMinimum).toBe(true);
    },
  );
});

// ---------------------------------------------------------------------------
// 3. Determinism.
// ---------------------------------------------------------------------------

describe('identical inputs render identically', () => {
  it.each(['square-typical', 'a4-typical'])('%s is byte-identical across runs', async (name) => {
    const prep = prepared[name];
    const first = await renderExport(browser, prep);
    const second = await renderExport(browser, prep);

    const diff = diffPng(first.png, second.png, 0);
    expect(diff.dimensionsMatch).toBe(true);
    expect(diff.differingPixels).toBe(0);
    expect(diff.maxChannelDelta).toBe(0);

    // The fit result must be identical too, not merely visually close: the
    // binary search exists so the outcome does not depend on step size.
    expect(JSON.stringify(second.report)).toEqual(JSON.stringify(first.report));
  });
});

// ---------------------------------------------------------------------------
// 4. Preview/export parity.
// ---------------------------------------------------------------------------

describe('the live preview matches the export', () => {
  let bundle: string;
  let react: { react: string; reactDom: string };

  beforeAll(() => {
    bundle = buildBrowserBundle();
    react = reactSources();
  });

  it.each(PARITY_CASES)('%s is pixel-identical in both paths', async (name) => {
    const prep = prepared[name];
    const exported = exports_[name] ?? (await renderExport(browser, prep));
    const preview = await renderPreview(browser, prep, bundle, react);

    writeArtefact(`${name}.preview`, preview.png);

    // The fit pass must reach the same answer in both environments: if it does
    // not, the preview is showing the user type sizes the export will not use.
    expect(preview.report.clippedZones).toEqual(exported.report.clippedZones);
    const fontSizes = (report: AutofitReport) =>
      report.zones.map((z) => [z.zone, z.elements.map((e) => Math.round(e.fontSize))]);
    expect(fontSizes(preview.report)).toEqual(fontSizes(exported.report));

    const diff = diffPng(exported.png, preview.png, 2);
    if (diff.differingPixels > 0) {
      writeFileSync(join(ARTEFACT_DIR, `${name}.export.png`), exported.png);
    }
    expect(diff.dimensionsMatch).toBe(true);
    expect(diff.differingPixels).toBe(0);
  });
});
