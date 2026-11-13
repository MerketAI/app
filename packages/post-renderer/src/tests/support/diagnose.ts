/**
 * One-case diagnostic, for when a stress case fails and you need to know why.
 *
 *   CASE=a4-long-name npx ts-node  *     --compiler-options '{"module":"commonjs","jsx":"react"}'  *     src/tests/support/diagnose.ts
 *
 * Prints which webfont faces loaded, the per-zone fit report, and - for any
 * zone still overflowing - every child's box, padding and font size. The
 * padding column is what revealed that the fit pass was counting a button's
 * padding as a line of text.
 */
import {
  describeReport,
  launchBrowser,
  prepareCase,
  serveFontsFromCache,
} from './browser';
import { renderPostToHtml } from '../../render/render-to-html';
import { STRESS_CASES } from './fixtures';

(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  // Same cached fonts the suite uses, so a diagnosis matches a test run.
  await serveFontsFromCache(page);
  const c = STRESS_CASES.find((x) => x.name === (process.env.CASE || 'a4-typical'))!;
  const prep = prepareCase(c);
  await page.setViewport({ ...prep.canvas, deviceScaleFactor: 1 });
  await page.setContent(renderPostToHtml(prep.input), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate('document.fonts.ready');
  const fonts = await page.evaluate(`(function(){
    var out = []; document.fonts.forEach(function(f){ out.push(f.family + ' ' + f.weight + ' ' + f.status); });
    return { size: document.fonts.size, status: document.fonts.status, faces: out,
             poppins: document.fonts.check('32px "Poppins"'), inter: document.fonts.check('20px "Inter"') };
  })()`);
  console.log(JSON.stringify(fonts, null, 2));
  const rep: any = await page.evaluate('window.__fitDesign()');
  console.log(describeReport(rep));
  console.log('clipped:', rep.clippedZones);
  const zoneBoxes = await page.evaluate(`(function(){
    var out = {};
    document.querySelectorAll('[data-zone]').forEach(function(z){
      out[z.getAttribute('data-zone')] = { ch: z.clientHeight, sh: z.scrollHeight, cw: z.clientWidth, sw: z.scrollWidth };
    });
    return out;
  })()`);
  const detail = await page.evaluate(`(function(){
    var out = {};
    document.querySelectorAll('[data-zone]').forEach(function(z){
      if (z.scrollHeight <= z.clientHeight + 1 && z.scrollWidth <= z.clientWidth + 1) return;
      var kids = [];
      z.querySelectorAll('*').forEach(function(k){
        var r = k.getBoundingClientRect();
        if (r.height === 0) return;
        kids.push(k.tagName + (k.getAttribute('data-fit') ? '[' + k.getAttribute('data-fit') + ']' : '') +
          ' ' + Math.round(r.width) + 'x' + Math.round(r.height) +
          ' pad=' + window.getComputedStyle(k).padding + ' fs=' + window.getComputedStyle(k).fontSize);
      });
      out[z.getAttribute('data-zone')] = { client: z.clientWidth + 'x' + z.clientHeight,
        scroll: z.scrollWidth + 'x' + z.scrollHeight, kids: kids };
    });
    return out;
  })()`);
  console.log('--- overflowing zone detail ---');
  console.log(JSON.stringify(detail, null, 2));
  await browser.close();
})();
