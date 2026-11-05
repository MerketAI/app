import { Injectable } from '@nestjs/common';

export type WaveStyle = 'calm' | 'layered' | 'steep';
export type BlobSeedable = { seed?: number };

/**
 * Generates the decorative SVG that gives a layout its "designed" feel: wave
 * dividers, organic blobs, dot grids, soft gradient washes.
 *
 * These are produced in code rather than fetched, which matters for three
 * reasons: no third-party dependency at render time, no licence question at
 * all, and a seed makes them deterministic - the same design regenerates
 * identically instead of shifting under the customer every time.
 */
@Injectable()
export class DecorativeService {
  /**
   * A wave divider, as a full SVG sized to `width` x `height`.
   * `flip` points the crest downward, for a top-of-section divider.
   */
  wave(
    width: number,
    height: number,
    color: string,
    options: { style?: WaveStyle; flip?: boolean; seed?: number; opacity?: number } = {},
  ): string {
    const style = options.style || 'calm';
    const rng = this.rng(options.seed ?? 1);
    const opacity = options.opacity ?? 1;

    const amp = { calm: 0.28, layered: 0.34, steep: 0.5 }[style];
    const a = height * amp;

    // Two control points jittered by the seed, so waves vary but stay smooth.
    const c1x = width * (0.22 + rng() * 0.12);
    const c2x = width * (0.62 + rng() * 0.14);
    const baseline = height * 0.55;

    const path = [
      `M0,${baseline.toFixed(1)}`,
      `C${c1x.toFixed(1)},${(baseline - a).toFixed(1)}`,
      `${c2x.toFixed(1)},${(baseline + a).toFixed(1)}`,
      `${width},${(baseline - a * 0.35).toFixed(1)}`,
      `L${width},${height}`,
      `L0,${height}`,
      'Z',
    ].join(' ');

    const transform = options.flip
      ? ` transform="scale(1,-1) translate(0,-${height})"`
      : '';

    const layers =
      style === 'layered'
        ? `<path d="${path}" fill="${color}" opacity="${(opacity * 0.35).toFixed(2)}" transform="translate(0,${(-height * 0.12).toFixed(1)})"/>`
        : '';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><g${transform}>${layers}<path d="${path}" fill="${color}" opacity="${opacity}"/></g></svg>`;
  }

  /**
   * An organic blob path, the rounded shape used behind headlines and icons.
   * Returns a standalone SVG of the given size.
   */
  blob(
    size: number,
    color: string,
    options: { seed?: number; opacity?: number; points?: number } = {},
  ): string {
    const rng = this.rng(options.seed ?? 7);
    const points = options.points ?? 6;
    const r = size / 2;
    const cx = r;
    const cy = r;

    // Sample radii around the circle, then join them with a closed cardinal
    // spline so the outline stays smooth rather than polygonal.
    const nodes: { x: number; y: number }[] = [];
    for (let i = 0; i < points; i++) {
      const angle = (Math.PI * 2 * i) / points;
      const radius = r * (0.74 + rng() * 0.24);
      nodes.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    }

    const path = this.closedSpline(nodes);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><path d="${path}" fill="${color}" opacity="${options.opacity ?? 1}"/></svg>`;
  }

  /** A dot grid, for subtle texture behind a section. */
  dotGrid(
    width: number,
    height: number,
    color: string,
    options: { spacing?: number; radius?: number; opacity?: number } = {},
  ): string {
    const spacing = options.spacing ?? Math.round(width / 26);
    const radius = options.radius ?? Math.max(1, Math.round(spacing / 9));
    const opacity = options.opacity ?? 0.25;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><pattern id="dg" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="${color}" opacity="${opacity}"/></pattern></defs><rect width="100%" height="100%" fill="url(#dg)"/></svg>`;
  }

  /** A soft two-stop radial wash, for depth behind a hero area. */
  gradientWash(
    width: number,
    height: number,
    from: string,
    to: string,
    options: { opacity?: number } = {},
  ): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><radialGradient id="gw" cx="72%" cy="18%" r="85%"><stop offset="0%" stop-color="${from}" stop-opacity="${options.opacity ?? 0.55}"/><stop offset="100%" stop-color="${to}" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#gw)"/></svg>`;
  }

  /** Encodes SVG for a CSS `url(...)`, avoiding base64's size penalty. */
  toDataUri(svg: string): string {
    const encoded = encodeURIComponent(svg)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');
    return `data:image/svg+xml,${encoded}`;
  }

  // ---------------------------------------------------------------

  /** Deterministic PRNG (mulberry32), so a seed always yields one shape. */
  private rng(seed: number): () => number {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Closed Catmull-Rom spline, emitted as cubic beziers. */
  private closedSpline(nodes: { x: number; y: number }[]): string {
    const n = nodes.length;
    const at = (i: number) => nodes[((i % n) + n) % n];
    let d = `M${at(0).x.toFixed(1)},${at(0).y.toFixed(1)}`;

    for (let i = 0; i < n; i++) {
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
}
