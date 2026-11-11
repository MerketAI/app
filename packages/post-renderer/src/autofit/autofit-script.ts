/**
 * The auto-fit pass, injected into the exported document.
 *
 * Authored here rather than per template so every template behaves the same,
 * and so the preview and the export run identical code.
 *
 * Three things matter about how it works:
 *
 *  - **It runs after webfonts settle.** Text metrics are not final until the
 *    real face has loaded; fitting against a fallback ships a layout measured
 *    for the wrong font.
 *  - **It fits per ZONE, not per element.** Overflow is a property of the
 *    containing box: when a zone holds a headline and a standfirst, shrinking
 *    the headline alone cannot resolve a zone whose overflow comes from the
 *    standfirst. Every shrinkable element in a zone moves together along one
 *    scale factor, each within its own declared bounds.
 *  - **It binary-searches.** Stepping makes the result depend on the step size,
 *    which would break the guarantee that identical inputs render identically.
 */
export const AUTOFIT_SCRIPT = String.raw`
(function () {
  function overflows(el) {
    return el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
  }

  function lineCount(el) {
    var cs = window.getComputedStyle(el);
    var lh = parseFloat(cs.lineHeight);
    if (!isFinite(lh) || lh <= 0) lh = parseFloat(cs.fontSize) * 1.2;
    return Math.round(el.scrollHeight / lh);
  }

  function readBounds(el) {
    var current = parseFloat(window.getComputedStyle(el).fontSize) || 16;
    var max = parseFloat(el.getAttribute('data-fit-max') || '0');
    var min = parseFloat(el.getAttribute('data-fit-min') || '0');
    if (!isFinite(max) || max <= 0) max = current;
    if (!isFinite(min) || min <= 0) min = Math.max(8, max * 0.55);
    if (min > max) min = max;
    var lines = parseInt(el.getAttribute('data-fit-lines') || '0', 10);
    return { el: el, min: min, max: max, lines: isFinite(lines) ? lines : 0 };
  }

  // t = 1 puts every element at its maximum, t = 0 at its minimum.
  function applyScale(bounds, t) {
    for (var i = 0; i < bounds.length; i++) {
      var b = bounds[i];
      b.el.style.fontSize = (b.min + (b.max - b.min) * t) + 'px';
    }
  }

  function linesOk(bounds) {
    for (var i = 0; i < bounds.length; i++) {
      if (bounds[i].lines > 0 && lineCount(bounds[i].el) > bounds[i].lines) return false;
    }
    return true;
  }

  function fitZone(zone) {
    var nodes = zone.querySelectorAll('[data-fit]');
    var bounds = [];
    for (var i = 0; i < nodes.length; i++) bounds.push(readBounds(nodes[i]));

    if (bounds.length === 0) {
      return { zone: zone.getAttribute('data-zone'), fitted: !overflows(zone), scale: 1, elements: [] };
    }

    applyScale(bounds, 1);
    var ok = !overflows(zone) && linesOk(bounds);
    var best = ok ? 1 : null;

    if (!ok) {
      var lo = 0, hi = 1;
      for (var n = 0; n < 24 && hi - lo > 0.01; n++) {
        var mid = (lo + hi) / 2;
        applyScale(bounds, mid);
        if (!overflows(zone) && linesOk(bounds)) { best = mid; lo = mid; }
        else { hi = mid; }
      }
    }

    if (best === null) {
      // Nothing in the declared range fits. Settle at the minimum and report
      // it - the caller decides whether to reject rather than ship clipped text.
      applyScale(bounds, 0);
      best = 0;
    } else {
      applyScale(bounds, best);
    }

    var elements = [];
    for (var j = 0; j < bounds.length; j++) {
      elements.push({
        slot: bounds[j].el.getAttribute('data-fit'),
        fontSize: parseFloat(window.getComputedStyle(bounds[j].el).fontSize),
        atMinimum: best === 0
      });
    }

    return {
      zone: zone.getAttribute('data-zone'),
      fitted: !overflows(zone) && linesOk(bounds),
      scale: best,
      elements: elements
    };
  }

  window.__fitDesign = function () {
    var zones = document.querySelectorAll('[data-zone]');
    var results = [];
    var clipped = [];

    for (var i = 0; i < zones.length; i++) {
      var r;
      try {
        r = fitZone(zones[i]);
      } catch (e) {
        r = { zone: zones[i].getAttribute('data-zone'), fitted: false, error: String(e), elements: [] };
      }
      results.push(r);
      if (!r.fitted) clipped.push(r.zone);
    }

    return {
      zones: results,
      clippedZones: clipped,
      ok: clipped.length === 0
    };
  };
})();
`;

/** Shape returned by `window.__fitDesign()`. */
export interface AutofitReport {
  zones: {
    zone: string | null;
    fitted: boolean;
    /** 1 = every element at its maximum size, 0 = every element at minimum. */
    scale?: number;
    error?: string;
    elements: { slot: string | null; fontSize: number; atMinimum?: boolean }[];
  }[];
  clippedZones: string[];
  ok: boolean;
}
