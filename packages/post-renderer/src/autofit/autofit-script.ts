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

  // Counts the line boxes the text actually occupies.
  //
  // The obvious implementation - scrollHeight divided by line height - is
  // wrong for anything with padding: a call-to-action button's own padding
  // reads as a second line, so a one-line constraint can never be satisfied
  // however far the type shrinks, and the zone reports as clipped at minimum
  // size forever. Measuring the text's own client rects avoids that; rects
  // sharing a top edge are one line, and nested blocks each contribute their
  // own.
  function lineCount(el) {
    try {
      var range = document.createRange();
      range.selectNodeContents(el);
      var rects = range.getClientRects();
      var tops = [];
      for (var i = 0; i < rects.length; i++) {
        var r = rects[i];
        if (r.height === 0 || r.width === 0) continue;
        var seen = false;
        for (var j = 0; j < tops.length; j++) {
          if (Math.abs(tops[j] - r.top) < 2) { seen = true; break; }
        }
        if (!seen) tops.push(r.top);
      }
      if (tops.length > 0) return tops.length;
    } catch (e) {
      // Fall through to the measured estimate below.
    }

    var cs = window.getComputedStyle(el);
    var lh = parseFloat(cs.lineHeight);
    if (!isFinite(lh) || lh <= 0) lh = parseFloat(cs.fontSize) * 1.2;
    var inner =
      el.scrollHeight -
      (parseFloat(cs.paddingTop) || 0) -
      (parseFloat(cs.paddingBottom) || 0);
    return Math.max(1, Math.round(inner / lh));
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

  // How much vertical space a zone's content actually occupies.
  //
  // Not scrollHeight: that never reports less than the box, so a zone authored
  // at 300px holding 90px of text measures 300 and a repack has nothing to
  // reclaim. The real extent is the bottom edge of the lowest child.
  function contentHeight(el) {
    var box = el.getBoundingClientRect();
    var cs = window.getComputedStyle(el);
    var bottom = box.top + (parseFloat(cs.paddingTop) || 0);
    for (var i = 0; i < el.children.length; i++) {
      var r = el.children[i].getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.bottom > bottom) bottom = r.bottom;
    }
    return Math.ceil(bottom - box.top + (parseFloat(cs.paddingBottom) || 0));
  }

  // Closes the holes an omitted section leaves behind.
  //
  // Zones are absolutely positioned - that is what produces the composition -
  // so a layout with no consulting hours does not reflow, it renders a void
  // where they would have been. Members of a named stack are repacked against
  // their measured content once the fit pass has settled, which also reclaims
  // the slack inside a zone authored taller than the content it received.
  //
  // It only ever moves a zone up. Content that could not be shrunk enough must
  // never push the next zone down into a pinned footer, so a computed position
  // below the authored one is ignored.
  function repackStacks() {
    var stacks = {};
    var zones = document.querySelectorAll('[data-zone][data-stack]');
    for (var i = 0; i < zones.length; i++) {
      var name = zones[i].getAttribute('data-stack');
      (stacks[name] = stacks[name] || []).push(zones[i]);
    }

    var moved = [];
    for (var name in stacks) {
      if (!Object.prototype.hasOwnProperty.call(stacks, name)) continue;

      var members = stacks[name].slice().sort(function (a, b) {
        return (parseFloat(a.style.top) || 0) - (parseFloat(b.style.top) || 0);
      });
      if (members.length === 0) continue;

      // Authored geometry is read before anything is written, because the
      // placement below overwrites the values it would otherwise be read from.
      var authored = [];
      for (var a = 0; a < members.length; a++) {
        authored.push({
          top: parseFloat(members[a].style.top) || 0,
          height:
            parseFloat(members[a].style.height) ||
            members[a].getBoundingClientRect().height,
          gap: (function (el) {
            var g = parseFloat(el.getAttribute('data-stack-gap') || '24');
            return isFinite(g) && g >= 0 ? g : 24;
          })(members[a])
        });
      }

      // The envelope the template set aside for this stack, which is not the
      // same as the space its surviving members happen to occupy: zones with
      // no content are never rendered at all.
      var envelopeTop = parseFloat(members[0].getAttribute('data-stack-top'));
      var envelopeBottom = parseFloat(members[0].getAttribute('data-stack-bottom'));
      if (!isFinite(envelopeTop)) envelopeTop = authored[0].top;
      if (!isFinite(envelopeBottom)) {
        envelopeBottom =
          authored[authored.length - 1].top + authored[authored.length - 1].height;
      }
      var span = envelopeBottom - envelopeTop;

      var placed = [];
      var cursor = envelopeTop;
      for (var m = 0; m < members.length; m++) {
        var el = members[m];
        var top = Math.min(cursor, authored[m].top);
        var height = Math.min(contentHeight(el), authored[m].height);

        el.style.top = top + 'px';
        el.style.height = height + 'px';
        // Settle the box, then check it against itself: measuring children
        // bottom-up can read slightly short of what the box needs, and a zone
        // shrunk below its own content is a worse outcome than a small gap.
        if (el.scrollHeight > height) {
          height = Math.min(el.scrollHeight, authored[m].height);
          el.style.height = height + 'px';
        }

        placed.push({ el: el, top: top, height: height });
        cursor = top + height + authored[m].gap;
      }

      // A stack that ends well short of the space it was given can sit in the
      // middle of it rather than clinging to the top. Packing upward alone
      // turns a one-line post into a sheet of white with a sentence on it.
      var align = members[0].getAttribute('data-stack-align');
      if (align === 'center') {
        var used =
          placed[placed.length - 1].top +
          placed[placed.length - 1].height -
          envelopeTop;
        var slack = Math.max(0, span - used);
        if (slack > 1) {
          for (var s = 0; s < placed.length; s++) {
            placed[s].top = placed[s].top + slack / 2;
            placed[s].el.style.top = placed[s].top + 'px';
          }
        }
      }

      for (var r = 0; r < placed.length; r++) {
        if (placed[r].top !== authored[r].top) {
          moved.push({
            zone: placed[r].el.getAttribute('data-zone'),
            from: authored[r].top,
            to: placed[r].top
          });
        }
      }
    }
    return moved;
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

    // After fitting, not before: repacking reads the content height each zone
    // settled at, and shrinking a box before the fit would change what fits.
    var moved = repackStacks();

    // Then re-check what it touched. A report describing the geometry from
    // before the last change to that geometry is a report of a page nobody
    // rendered.
    if (moved.length > 0) {
      clipped = [];
      for (var z = 0; z < zones.length; z++) {
        var result = results[z];
        if (result.error) { clipped.push(result.zone); continue; }
        result.fitted = result.fitted && !overflows(zones[z]);
        if (!result.fitted) clipped.push(result.zone);
      }
    }

    return {
      zones: results,
      clippedZones: clipped,
      movedZones: moved,
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
  /** Zones a stack repack lifted, and by how much. Empty when nothing moved. */
  movedZones?: { zone: string | null; from: number; to: number }[];
  ok: boolean;
}

/**
 * Installs the auto-fit pass into a document and runs it.
 *
 * The export inlines `AUTOFIT_SCRIPT` in a script tag; the preview calls this.
 * Both evaluate the identical source in the document being measured, which is
 * the point - a preview that reimplemented the fit would show the user type
 * sizes the export does not use, and the discrepancy would be invisible until
 * someone compared a finished PNG with what they had approved on screen.
 *
 * Call it only once fonts have settled: text metrics are not final before
 * then, and fitting against a fallback face produces a layout measured for the
 * wrong font.
 */
export function runAutofit(target: Window): AutofitReport | null {
  const scope = target as unknown as {
    __fitDesign?: () => AutofitReport;
    document: Document;
  };

  if (typeof scope.__fitDesign !== 'function') {
    const doc = scope.document;
    const script = doc.createElement('script');
    script.textContent = AUTOFIT_SCRIPT;
    doc.body.appendChild(script);
  }

  return typeof scope.__fitDesign === 'function' ? scope.__fitDesign() : null;
}
