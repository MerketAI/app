import { TemplateContext, TemplateDefinition } from './types';
import { fontImport, withAlpha } from './tokens';
import {
  parseHeadline,
  renderHeadline,
  headlineScale,
  intoColumns,
} from './typography';
import {
  arcBottomPath,
  confettiSvg,
  dotGridSvg,
  svgToDataUri,
  washSvg,
} from './shapes';

/**
 * Dense practice-profile layout.
 *
 * Modelled on how clinics and hospitals actually advertise: a strong headline,
 * a photograph of care being given, the full service list in two columns,
 * consulting hours, trust markers, and a contact bar. Information density is
 * the point - a practice wants one asset that answers "what do you do, when are
 * you open, how do I reach you".
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
    timings = [],
    badges = [],
  } = ctx;

  const u = (n: number) => Math.round(width * n);
  const headline = parseHeadline(ctx.headline, { uppercase: true });
  const hScale = headlineScale(ctx.headline, 0.066) * type.displayScale;

  // Two columns once there are enough services to justify it.
  const columns = features.length >= 5 ? 2 : 1;
  const featureColumns = intoColumns(features, columns);

  // Optional sections mean the page can arrive nearly empty. Without this the
  // layout keeps its dense proportions and leaves a void between the services
  // and the call to action.
  const sections =
    (timings.length ? 1 : 0) + (badges.length ? 1 : 0) + (ctx.heroImageUrl ? 1 : 0);
  const sparse = sections <= 1;
  const featureFont = sparse ? 0.03 : 0.024;
  const chipSize = sparse ? 0.062 : 0.048;
  const featureGap = sparse ? 0.03 : 0.013;

  const wash = svgToDataUri(washSvg(width, u(0.62), p.accent, { opacity: 0.22 }));
  const dots = svgToDataUri(dotGridSvg(width, u(0.4), p.accent, { opacity: 0.18 }));
  const hearts = svgToDataUri(
    confettiSvg(width, u(0.55), [p.accent, p.accentAlt, p.highlight], {
      seed,
      count: 12,
      motif: 'heart',
    }),
  );

  const heroSize = u(0.34);
  const heroMask = arcBottomPath(heroSize, heroSize, 0.16);

  const featureColumnsMarkup = featureColumns
    .map(
      (col) => `<ul class="features">${col
        .map(
          (f) =>
            `<li><span class="chip">${f.iconSvg}</span><span>${escape(f.text)}</span></li>`,
        )
        .join('')}</ul>`,
    )
    .join('');

  const timingsMarkup = timings.length
    ? `<div class="panel">
        <div class="panel-title">${escape(ctx.featuresTitle ? 'Consulting hours' : 'Consulting hours')}</div>
        ${timings
          .map(
            (t) =>
              `<div class="timing"><span class="timing-label">${escape(t.label)}</span><span class="timing-value">${escape(t.value)}</span></div>`,
          )
          .join('')}
      </div>`
    : '';

  const badgesMarkup = badges.length
    ? `<div class="badges">${badges
        .map(
          (b) =>
            `<div class="badge"><span class="badge-icon">${b.iconSvg}</span><span>${escape(b.text)}</span></div>`,
        )
        .join('')}</div>`
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
    background: ${p.surface};
    font-family: ${type.body};
    color: ${p.onSurface};
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  .page::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: ${u(0.62)}px;
    background-image: url("${wash}"), url("${hearts}");
    background-repeat: no-repeat;
    background-size: cover, cover;
    z-index: 0;
  }
  .page > * { position: relative; z-index: 1; }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${u(0.042)}px ${u(0.06)}px ${u(0.012)}px;
    flex-shrink: 0;
  }
  .brand {
    font-family: ${type.display};
    font-size: ${u(0.036)}px;
    font-weight: 800;
    letter-spacing: ${u(0.0015)}px;
    color: ${p.ink};
    text-transform: uppercase;
  }
  .brand-rule {
    height: ${u(0.006)}px;
    width: ${u(0.1)}px;
    background: ${p.accent};
    border-radius: ${u(0.003)}px;
    margin-top: ${u(0.008)}px;
  }
  .logo { height: ${u(0.07)}px; }

  .hero {
    display: flex;
    align-items: flex-start;
    gap: ${u(0.03)}px;
    padding: ${u(0.008)}px ${u(0.06)}px ${u(0.022)}px;
    flex-shrink: 0;
  }
  .hero-copy { flex: 1 1 auto; min-width: 0; }
  .headline {
    font-family: ${type.display};
    font-size: ${u(hScale)}px;
    font-weight: 800;
    line-height: 1.04;
    text-transform: uppercase;
    letter-spacing: ${u(-0.0008)}px;
  }
  .sub {
    font-size: ${u(0.026)}px;
    line-height: 1.45;
    color: ${p.onSurfaceMuted};
    margin-top: ${u(0.018)}px;
    max-width: 94%;
  }
  .hero-art {
    /* clip-path: path() resolves in the element's own pixel box, so the path
       must be authored at exactly this size - scaling it with a transform
       moves the element, not the mask. */
    flex: 0 0 ${heroSize}px;
    width: ${heroSize}px;
    height: ${heroSize}px;
    background-image: url('${ctx.heroImageUrl || ''}');
    background-size: cover;
    background-position: center;
    background-color: ${p.surfaceAlt};
    clip-path: path('${heroMask}');
  }

  .services {
    padding: ${u(0.01)}px ${u(0.06)}px 0;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    ${sparse ? 'justify-content: center;' : ''}
  }
  .section-title {
    /* .services is a flex column, so an inline-block child stretches to the
       full width unless it is told not to. */
    align-self: flex-start;
    display: inline-block;
    font-family: ${type.display};
    font-size: ${u(0.026)}px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: ${u(0.002)}px;
    color: ${p.onAccent};
    background: ${p.accent};
    padding: ${u(0.009)}px ${u(0.024)}px;
    border-radius: ${u(0.05)}px;
    margin-bottom: ${u(0.024)}px;
  }
  .service-grid {
    display: flex;
    gap: ${u(0.035)}px;
    align-items: flex-start;
  }
  ul.features { list-style: none; flex: 1 1 0; min-width: 0; }
  ul.features li {
    display: flex;
    align-items: center;
    gap: ${u(0.016)}px;
    margin-bottom: ${u(featureGap)}px;
  }
  .chip {
    flex-shrink: 0;
    width: ${u(chipSize)}px;
    height: ${u(chipSize)}px;
    border-radius: 50%;
    background: ${withAlpha(p.accent, 0.14)};
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .chip svg { width: ${u(chipSize * 0.58)}px; height: ${u(chipSize * 0.58)}px; display: block; }
  ul.features li > span:last-child {
    font-size: ${u(featureFont)}px;
    font-weight: 600;
    line-height: 1.3;
  }

  .panel {
    margin-top: ${u(0.014)}px;
    background: ${p.ink};
    color: ${p.onInk};
    border-radius: ${u(0.022)}px;
    padding: ${u(0.026)}px ${u(0.03)}px;
    background-image: url("${dots}");
    background-size: cover;
  }
  .panel-title {
    font-family: ${type.display};
    font-size: ${u(0.024)}px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: ${u(0.002)}px;
    color: ${p.highlight};
    margin-bottom: ${u(0.014)}px;
  }
  .timing {
    display: flex;
    justify-content: space-between;
    gap: ${u(0.02)}px;
    font-size: ${u(0.023)}px;
    line-height: 1.5;
  }
  .timing-label { font-weight: 700; }
  .timing-value { opacity: 0.92; }

  .badges {
    display: flex;
    gap: ${u(0.018)}px;
    padding: ${u(0.024)}px ${u(0.06)}px ${u(0.018)}px;
    flex-shrink: 0;
  }
  .badge {
    flex: 1 1 0;
    min-width: 0;
    background: ${p.surfaceAlt};
    border-radius: ${u(0.016)}px;
    padding: ${u(0.016)}px ${u(0.012)}px;
    text-align: center;
    font-size: ${u(0.0165)}px;
    font-weight: 700;
    line-height: 1.25;
    color: ${p.ink};
  }
  .badge-icon { display: block; margin: 0 auto ${u(0.008)}px; }
  .badge-icon svg { width: ${u(0.03)}px; height: ${u(0.03)}px; display: block; margin: 0 auto; }

  .cta {
    margin: 0 ${u(0.06)}px ${u(0.02)}px;
    background: ${p.accent};
    color: ${p.onAccent};
    border-radius: ${u(0.014)}px;
    text-align: center;
    font-family: ${type.display};
    font-weight: 800;
    font-size: ${u(0.032)}px;
    padding: ${u(0.022)}px;
    flex-shrink: 0;
  }

  .footer {
    background: ${p.ink};
    color: ${p.onInk};
    padding: ${u(0.028)}px ${u(0.06)}px;
    display: flex;
    flex-wrap: wrap;
    gap: ${u(0.012)}px ${u(0.032)}px;
    flex-shrink: 0;
  }
  .contact-row {
    display: flex;
    align-items: center;
    gap: ${u(0.014)}px;
    font-size: ${u(0.0205)}px;
    line-height: 1.4;
    min-width: 45%;
  }
  .contact-row svg { width: ${u(0.026)}px; height: ${u(0.026)}px; display: block; }
  .contact-icon { flex-shrink: 0; display: flex; }
</style>
</head>
<body>
<div class="page">
  <div class="topbar">
    <div>
      <div class="brand">${escape(ctx.brandName)}</div>
      <div class="brand-rule"></div>
    </div>
    ${ctx.logoUrl ? `<img class="logo" src="${ctx.logoUrl}" alt=""/>` : ''}
  </div>

  <div class="hero">
    <div class="hero-copy">
      <h1 class="headline">${renderHeadline(headline, p, { escape, surface: 'light' })}</h1>
      ${ctx.subheadline ? `<p class="sub">${escape(ctx.subheadline)}</p>` : ''}
    </div>
    ${ctx.heroImageUrl ? '<div class="hero-art"></div>' : ''}
  </div>

  <div class="services">
    <div class="section-title">${escape(ctx.featuresTitle || 'Our services')}</div>
    <div class="service-grid">${featureColumnsMarkup}</div>
    ${timingsMarkup}
  </div>

  ${badgesMarkup}
  ${ctx.ctaText ? `<div class="cta">${escape(ctx.ctaText)}</div>` : ''}

  <div class="footer">
    ${contact
      .map(
        (c) =>
          `<div class="contact-row"><span class="contact-icon">${c.iconSvg}</span><span>${escape(c.text)}</span></div>`,
      )
      .join('')}
  </div>
</div>
<script>
  window.__fitDesign = function () {
    var body = document.querySelector('.services');
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

export const clinicProfileTemplate: TemplateDefinition = {
  id: 'clinic-profile',
  title: 'Practice profile',
  surface: 'light',
  postTypes: ['PROFILE', 'SERVICES', 'FLYER', 'POSTER'],
  orientation: 'portrait',
  featureCapacity: 8,
  render,
};
