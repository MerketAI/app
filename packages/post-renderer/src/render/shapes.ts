/**
 * Shape language: the organic masks, badges and dividers that separate a
 * designed asset from a styled web page.
 *
 * Everything is generated SVG. No licence question, no fetch at render time,
 * and a seed makes each brand's shapes stable across regenerations.
 */

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable seed from a string, so a brand's shapes never shift. */
export function seedFrom(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash % 100000;
}

/** Encodes SVG for a CSS `url(...)` without base64's size penalty. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')}`;
}

// ---------------------------------------------------------------
// Clip paths - masks for photos and panels
// ---------------------------------------------------------------

/**
 * A cloud-bottomed rectangle, as a `clip-path: path(...)` value in a viewport
 * of `width` x `height`. This is the mask used across childcare and paediatric
 * creative: photo on top, scalloped underside.
 */
export function cloudBottomPath(
  width: number,
  height: number,
  options: { bumps?: number; depth?: number } = {},
): string {
  const bumps = options.bumps ?? 4;
  const depth = (options.depth ?? 0.16) * height;
  const base = height - depth;
  const step = width / bumps;

  let d = `M0,0 L${width},0 L${width},${base.toFixed(1)}`;
  for (let i = bumps - 1; i >= 0; i--) {
    const x1 = step * (i + 1);
    const x0 = step * i;
    const mid = (x0 + x1) / 2;
    // Alternate deeper and shallower scallops so it reads as cloud, not scallop.
    const lift = i % 2 === 0 ? depth * 1.15 : depth * 0.78;
    d += ` C${(x1 - step * 0.12).toFixed(1)},${(base + lift).toFixed(1)} ${(mid + step * 0.18).toFixed(1)},${(base + lift).toFixed(1)} ${mid.toFixed(1)},${(base + lift * 0.62).toFixed(1)}`;
    d += ` C${(mid - step * 0.18).toFixed(1)},${(base + lift * 0.1).toFixed(1)} ${(x0 + step * 0.12).toFixed(1)},${(base - lift * 0.18).toFixed(1)} ${x0.toFixed(1)},${base.toFixed(1)}`;
  }
  return `${d} Z`;
}

/** A rectangle whose bottom edge sweeps up as a single arc. */
export function arcBottomPath(
  width: number,
  height: number,
  curve = 0.14,
): string {
  const dip = height * curve;
  return `M0,0 L${width},0 L${width},${(height - dip).toFixed(1)} Q${(width / 2).toFixed(1)},${(height + dip).toFixed(1)} 0,${(height - dip).toFixed(1)} Z`;
}

/** A rectangle with a diagonal sweep, for split-photo hero blocks. */
export function diagonalPath(
  width: number,
  height: number,
  skew = 0.18,
): string {
  const offset = width * skew;
  return `M0,0 L${width},0 L${(width - offset).toFixed(1)},${height} L0,${height} Z`;
}

/** Organic blob, closed cardinal spline through jittered radii. */
export function blobPath(
  size: number,
  options: { seed?: number; points?: number; variance?: number } = {},
): string {
  const random = rng(options.seed ?? 7);
  const points = options.points ?? 6;
  const variance = options.variance ?? 0.24;
  const r = size / 2;

  const nodes: { x: number; y: number }[] = [];
  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2 * i) / points;
    const radius = r * (1 - variance + random() * variance * 2);
    nodes.push({
      x: r + Math.cos(angle) * radius,
      y: r + Math.sin(angle) * radius,
    });
  }

  const at = (i: number) => nodes[((i % points) + points) % points];
  let d = `M${at(0).x.toFixed(1)},${at(0).y.toFixed(1)}`;
  for (let i = 0; i < points; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return `${d} Z`;
}

// ---------------------------------------------------------------
// Standalone SVG decorations
// ---------------------------------------------------------------

/** Cloud badge - a rounded lozenge with bumps, used to hold a title. */
export function cloudBadgeSvg(
  width: number,
  height: number,
  fill: string,
  options: { stroke?: string; strokeWidth?: number } = {},
): string {
  const r = height / 2;
  const stroke = options.stroke
    ? ` stroke="${options.stroke}" stroke-width="${options.strokeWidth ?? height * 0.08}"`
    : '';
  // The bumps and the body are unioned into one filled shape. Drawing them as
  // separate circles over a narrow rect left the outlines crossing the label,
  // so text sat on top of visible seams.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
  <defs>
    <mask id="cloud">
      <rect width="100%" height="100%" fill="black"/>
      <g fill="white">
        <rect x="0" y="${height * 0.2}" width="${width}" height="${height * 0.72}" rx="${height * 0.36}"/>
        <ellipse cx="${width * 0.26}" cy="${height * 0.34}" rx="${width * 0.17}" ry="${height * 0.3}"/>
        <ellipse cx="${width * 0.5}" cy="${height * 0.26}" rx="${width * 0.2}" ry="${height * 0.34}"/>
        <ellipse cx="${width * 0.74}" cy="${height * 0.34}" rx="${width * 0.17}" ry="${height * 0.3}"/>
      </g>
    </mask>
  </defs>
  <rect width="100%" height="100%" fill="${fill}" mask="url(#cloud)"${stroke ? '' : ''}/>
</svg>`;
}

/** A soft dot grid, for texture behind a panel. */
export function dotGridSvg(
  width: number,
  height: number,
  color: string,
  options: { spacing?: number; opacity?: number } = {},
): string {
  const spacing = options.spacing ?? Math.round(width / 24);
  const r = Math.max(1, Math.round(spacing / 10));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><pattern id="dg" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"><circle cx="${r}" cy="${r}" r="${r}" fill="${color}" opacity="${options.opacity ?? 0.2}"/></pattern></defs><rect width="100%" height="100%" fill="url(#dg)"/></svg>`;
}

/** Scattered hearts / sparkles, the incidental motifs on family-facing creative. */
export function confettiSvg(
  width: number,
  height: number,
  colors: string[],
  options: { seed?: number; count?: number; motif?: 'heart' | 'dot' | 'plus' } = {},
): string {
  const random = rng(options.seed ?? 11);
  const count = options.count ?? 14;
  const motif = options.motif ?? 'heart';
  const marks: string[] = [];

  for (let i = 0; i < count; i++) {
    const x = random() * width;
    const y = random() * height;
    const s = (0.5 + random() * 0.9) * (width / 44);
    const color = colors[i % colors.length];
    const opacity = (0.18 + random() * 0.3).toFixed(2);
    const rotate = (random() * 60 - 30).toFixed(1);

    if (motif === 'heart') {
      marks.push(
        `<path transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rotate}) scale(${(s / 24).toFixed(3)})" opacity="${opacity}" fill="${color}" d="M12 21s-7.5-4.7-9.6-9.2C.7 8.4 2.6 5 6 5c2 0 3.3 1.1 4 2.1C10.7 6.1 12 5 14 5c3.4 0 5.3 3.4 3.6 6.8C19.5 16.3 12 21 12 21z"/>`,
      );
    } else if (motif === 'plus') {
      marks.push(
        `<path transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rotate})" opacity="${opacity}" stroke="${color}" stroke-width="${(s / 5).toFixed(2)}" stroke-linecap="round" d="M${-s / 2},0 H${s / 2} M0,${-s / 2} V${s / 2}"/>`,
      );
    } else {
      marks.push(
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(s / 3).toFixed(1)}" fill="${color}" opacity="${opacity}"/>`,
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${marks.join('')}</svg>`;
}

/** A ribbon / pill banner for an offer or a date strip. */
export function ribbonSvg(
  width: number,
  height: number,
  fill: string,
  options: { notch?: boolean } = {},
): string {
  const notch = options.notch ? height * 0.34 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path fill="${fill}" d="M0,0 L${width},0 L${(width - notch).toFixed(1)},${height / 2} L${width},${height} L0,${height} Z"/></svg>`;
}

/** A soft radial wash for depth behind a hero. */
export function washSvg(
  width: number,
  height: number,
  color: string,
  options: { cx?: string; cy?: string; opacity?: number } = {},
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><radialGradient id="w" cx="${options.cx ?? '72%'}" cy="${options.cy ?? '20%'}" r="80%"><stop offset="0%" stop-color="${color}" stop-opacity="${options.opacity ?? 0.5}"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#w)"/></svg>`;
}
