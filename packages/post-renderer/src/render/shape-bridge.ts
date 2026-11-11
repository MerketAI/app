import {
  arcBottomPath,
  blobPath,
  cloudBadgeSvg,
  cloudBottomPath,
  confettiSvg,
  diagonalPath,
  dotGridSvg,
  ribbonSvg,
  svgToDataUri,
  washSvg,
} from './shapes';
import { MaskName, ShapeName } from '../schema/components';

/**
 * Maps the template vocabulary onto the shape generators.
 *
 * Templates name a shape ("wave", "diagonal"); they never supply SVG. That keeps
 * the allow-list meaningful - a template that could hand over markup would be
 * able to inject anything into the page.
 */
export function shapeDataUri(
  shape: ShapeName,
  width: number,
  height: number,
  color: string,
  seed: number,
): string {
  switch (shape) {
    case 'blob':
      return svgToDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${width}"><path d="${blobPath(width, { seed })}" fill="${color}"/></svg>`,
      );
    case 'wave':
      return svgToDataUri(waveSvg(width, height, color, seed));
    case 'arc':
      return svgToDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${arcBottomPath(width, height)}" fill="${color}"/></svg>`,
      );
    case 'diagonal':
      return svgToDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="${diagonalPath(width, height)}" fill="${color}"/></svg>`,
      );
    case 'cloud':
      return svgToDataUri(cloudBadgeSvg(width, height, color));
    case 'ribbon':
      return svgToDataUri(ribbonSvg(width, height, color, { notch: true }));
    case 'dots':
      return svgToDataUri(dotGridSvg(width, height, color, { opacity: 0.2 }));
    case 'wash':
      return svgToDataUri(washSvg(width, height, color, { opacity: 0.45 }));
    case 'confetti':
      return svgToDataUri(
        confettiSvg(width, height, [color], { seed, count: 14, motif: 'dot' }),
      );
    case 'circle':
      return svgToDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 2}" fill="${color}"/></svg>`,
      );
    default:
      return svgToDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`,
      );
  }
}

/**
 * A `clip-path: path()` value for a media element.
 *
 * The path must be authored at the element's own pixel size: `clip-path`
 * resolves in the element's box, so scaling it with a transform moves the
 * element and leaves the mask behind.
 */
export function maskPathFor(
  mask: MaskName,
  size: { width: number; height: number },
): string | undefined {
  const { width: w, height: h } = size;
  switch (mask) {
    case 'cloudBottom':
      return cloudBottomPath(w, h, { bumps: 5, depth: 0.17 });
    case 'arcBottom':
      return arcBottomPath(w, h, 0.16);
    case 'diagonal':
      return diagonalPath(w, h, 0.18);
    case 'circle':
      return `M${w / 2},0 A${w / 2},${h / 2} 0 1,1 ${w / 2 - 0.01},0 Z`;
    case 'arch':
      // Rounded top, square bottom - the nurse-photo treatment.
      return `M0,${h} L0,${w / 2} A${w / 2},${w / 2} 0 0,1 ${w},${w / 2} L${w},${h} Z`;
    case 'roundedRect': {
      const r = Math.min(w, h) * 0.08;
      return `M${r},0 L${w - r},0 Q${w},0 ${w},${r} L${w},${h - r} Q${w},${h} ${w - r},${h} L${r},${h} Q0,${h} 0,${h - r} L0,${r} Q0,0 ${r},0 Z`;
    }
    case 'none':
    default:
      return undefined;
  }
}

/** A wave band, filled on top so it reads as the panel above bleeding down. */
function waveSvg(width: number, height: number, color: string, seed: number): string {
  const amp = height * 0.45;
  const baseline = height * 0.55;
  const jitter = ((seed % 100) / 100) * 0.12;
  const c1x = width * (0.24 + jitter);
  const c2x = width * (0.66 - jitter);

  const path = [
    `M0,${baseline.toFixed(1)}`,
    `C${c1x.toFixed(1)},${(baseline - amp).toFixed(1)}`,
    `${c2x.toFixed(1)},${(baseline + amp).toFixed(1)}`,
    `${width},${(baseline - amp * 0.35).toFixed(1)}`,
    `L${width},0 L0,0 Z`,
  ].join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="${path}" fill="${color}"/></svg>`;
}
