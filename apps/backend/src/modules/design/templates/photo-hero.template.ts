import { TemplateContext, TemplateDefinition } from './types';
import { fontImport, withAlpha } from './tokens';
import { parseHeadline, renderHeadline, headlineScale } from './typography';
import {
  cloudBottomPath,
  cloudBadgeSvg,
  confettiSvg,
  svgToDataUri,
} from './shapes';

/**
 * Photo-led layout.
 *
 * A photograph fills the upper third, masked with a scalloped underside so it
 * reads as a designed panel rather than a cropped rectangle. The title sits in a
 * cloud badge straddling the seam, and an optional cutout figure stands over
 * the join.
 *
 * This is the pattern family-facing practices actually use - the photo carries
 * the emotion and the copy stays crisp because it is DOM, not pixels.
 */
function render(ctx: TemplateContext): string {
  const {
    width,
    height,
    palette: p,
    type,
    seed,
    escape,
    features,
    contact,
  } = ctx;

  const u = (n: number) => Math.round(width * n);
  const headline = parseHeadline(ctx.headline, { uppercase: true });
  const hScale = headlineScale(ctx.headline, 0.086) * type.displayScale;

  const photoHeight = Math.round(height * 0.42);
  const photoMask = cloudBottomPath(width, photoHeight, {
    bumps: 5,
    depth: 0.17,
  });

  // Size the badge and its label to the brand name: "Dr. Mohit Gupta -
  // Pediatrician" is three times the width of "Sparsh Clinic", and a fixed
  // badge either clips the long one or dwarfs the short one.
  const brandLength = ctx.brandName.length;
  const badgeWidth = u(brandLength > 26 ? 0.74 : brandLength > 16 ? 0.62 : 0.5);
  const badgeHeight = u(brandLength > 26 ? 0.2 : 0.17);
  const badgeFont = brandLength > 26 ? 0.038 : brandLength > 16 ? 0.044 : 0.052;
  const badge = svgToDataUri(cloudBadgeSvg(badgeWidth, badgeHeight, p.surface));

  const sparkles = svgToDataUri(
    confettiSvg(width, height - photoHeight, [p.accentAlt, p.highlight], {
      seed: seed + 5,
      count: 16,
      motif: 'dot',
    }),
  );

  const featuresMarkup = features.length
    ? `<ul class="features">${features
        .map(
          (f) =>
            `<li><span class="tick">${f.iconSvg}</span><span>${escape(f.text)}</span></li>`,
        )
        .join('')}</ul>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  ${fontImport(type)}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { margin: 0; padding: 0; overflow: hidden; }

  .page {
    width: ${width}px;
    height: ${height}px;
    background: ${p.accent};
    font-family: ${type.body};
    color: ${p.onAccent};
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .page::after {
    content: '';
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: ${height - photoHeight}px;
    background-image: url("${sparkles}");
    background-size: cover;
    z-index: 0;
    pointer-events: none;
  }

  .photo {
    position: relative;
    height: ${photoHeight}px;
    flex-shrink: 0;
    background-image: url('${ctx.heroImageUrl || ''}');
    background-size: cover;
    background-position: center 28%;
    background-color: ${p.surfaceAlt};
    clip-path: path('${photoMask}');
    z-index: 1;
  }

  .badge-wrap {
    position: absolute;
    top: ${photoHeight - Math.round(badgeHeight * 0.58)}px;
    left: 50%;
    transform: translateX(-50%);
    width: ${badgeWidth}px;
    height: ${badgeHeight}px;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: center;
    background-image: url("${badge}");
    background-size: 100% 100%;
    background-repeat: no-repeat;
  }
  .badge-text {
    font-family: ${type.display};
    font-size: ${u(badgeFont)}px;
    font-weight: 800;
    color: ${p.accent};
    text-transform: uppercase;
    letter-spacing: ${u(0.001)}px;
    text-align: center;
    line-height: 1.05;
    padding: 0 ${u(0.05)}px;
    margin-top: ${u(0.012)}px;
  }

  /* A transparent cutout stands over the seam between photo and body. */
  .cutout {
    position: absolute;
    right: ${u(0.02)}px;
    top: ${Math.round(photoHeight * 0.18)}px;
    height: ${Math.round(height * 0.5)}px;
    z-index: 4;
    filter: drop-shadow(0 ${u(0.008)}px ${u(0.02)}px rgba(0,0,0,0.28));
  }

  .body {
    position: relative;
    z-index: 2;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    padding: ${u(0.11)}px ${u(0.07)}px ${u(0.03)}px;
    display: flex;
    flex-direction: column;
  }
  .headline {
    font-family: ${type.display};
    font-size: ${u(hScale)}px;
    font-weight: 800;
    line-height: 1.06;
    text-transform: uppercase;
    max-width: ${ctx.cutoutUrl ? '62%' : '100%'};
  }
  .sub {
    font-size: ${u(0.028)}px;
    line-height: 1.45;
    margin-top: ${u(0.018)}px;
    opacity: 0.92;
    max-width: ${ctx.cutoutUrl ? '58%' : '88%'};
  }

  ul.features { list-style: none; margin-top: ${u(0.028)}px; max-width: ${ctx.cutoutUrl ? '60%' : '100%'}; }
  ul.features li {
    display: flex;
    align-items: center;
    gap: ${u(0.018)}px;
    font-size: ${u(0.027)}px;
    font-weight: 700;
    line-height: 1.3;
    margin-bottom: ${u(0.014)}px;
  }
  .tick {
    flex-shrink: 0;
    width: ${u(0.044)}px;
    height: ${u(0.044)}px;
    border-radius: 50%;
    background: ${withAlpha(p.surface, 0.3)};
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tick svg { width: ${u(0.026)}px; height: ${u(0.026)}px; display: block; }

  .footer {
    position: relative;
    z-index: 3;
    margin-top: auto;
    background: ${p.surface};
    border-radius: ${u(0.03)}px;
    padding: ${u(0.028)}px ${u(0.034)}px;
    display: flex;
    flex-direction: column;
    gap: ${u(0.012)}px;
    flex-shrink: 0;
  }
  .cta {
    font-family: ${type.display};
    font-size: ${u(0.036)}px;
    font-weight: 800;
    color: ${p.accent};
    text-transform: uppercase;
  }
  .contact-row {
    display: flex;
    align-items: center;
    gap: ${u(0.014)}px;
    font-size: ${u(0.025)}px;
    line-height: 1.4;
    color: ${p.onSurface};
  }
  .contact-row svg { width: ${u(0.026)}px; height: ${u(0.026)}px; display: block; }
  .contact-icon { flex-shrink: 0; display: flex; }

  /* Inside the footer card: an absolutely-positioned credit was sliding under
     it, and a stock licence that requires attribution is not satisfied by text
     nobody can read. */
  .credit {
    margin-top: ${u(0.008)}px;
    font-size: ${u(0.0145)}px;
    line-height: 1.3;
    color: ${p.onSurfaceMuted};
  }
</style>
</head>
<body>
<div class="page">
  <div class="photo"></div>
  <div class="badge-wrap"><div class="badge-text">${escape(ctx.brandName)}</div></div>
  ${ctx.cutoutUrl ? `<img class="cutout" src="${ctx.cutoutUrl}" alt=""/>` : ''}

  <div class="body">
    <h1 class="headline">${renderHeadline(headline, p, { escape, surface: 'accent' })}</h1>
    ${ctx.subheadline ? `<p class="sub">${escape(ctx.subheadline)}</p>` : ''}
    ${featuresMarkup}

    <div class="footer">
      ${ctx.ctaText ? `<div class="cta">${escape(ctx.ctaText)}</div>` : ''}
      ${contact
        .map(
          (c) =>
            `<div class="contact-row"><span class="contact-icon">${c.iconSvg}</span><span>${escape(c.text)}</span></div>`,
        )
        .join('')}
      ${ctx.photoCredit ? `<div class="credit">${escape(ctx.photoCredit)}</div>` : ''}
    </div>
  </div>
</div>
<script>
  window.__fitDesign = function () {
    var body = document.querySelector('.body');
    if (!body) return { fitted: true, zoom: 1 };
    var zoom = 1;
    for (var i = 0; i < 30 && body.scrollHeight > body.clientHeight + 1 && zoom > 0.55; i++) {
      zoom -= 0.025;
      body.style.zoom = zoom;
    }
    return { fitted: body.scrollHeight <= body.clientHeight + 1, zoom: zoom };
  };
</script>
</body>
</html>`;
}

export const photoHeroTemplate: TemplateDefinition = {
  id: 'photo-hero',
  title: 'Photo hero',
  surface: 'accent',
  postTypes: ['SOCIAL_POST', 'FLYER', 'POSTER', 'ANNOUNCEMENT'],
  orientation: 'any',
  featureCapacity: 6,
  render,
};
