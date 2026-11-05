import { renderPostToHtml } from '../render/render-to-html';
import { validateAndInjectFacts } from '../validation/validate-facts';
import { validateTemplate } from '../schema/validate-template';
import { buildPalette, TYPE_PAIRS } from '../render/theme';
import {
  CampaignContent,
  SCHEMA_VERSION,
  TemplateDefinition,
} from '../schema/types';
import { VerifiedProfile } from '../schema/protected-fields';

function template(): TemplateDefinition {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'render-fixture-01',
    templateVersion: '1.0.0',
    title: 'Render fixture',
    family: 'medical-editorial',
    status: 'active',
    formats: ['instagram_portrait'],
    referenceFormat: 'instagram_portrait',
    theme: { mood: 'clinical', background: 'surface' },
    capabilities: {
      maxServices: 4,
      supportsCutout: true,
      supportsPhoto: false,
      supportsTimings: false,
      supportsBadges: false,
    },
    slots: {
      headline: {
        kind: 'richtext',
        source: 'campaign',
        required: true,
        maxLines: 3,
        minFontSize: 40,
        maxFontSize: 96,
        overflow: 'shrink',
      },
      services: {
        kind: 'list',
        source: 'campaign',
        required: false,
        maxItems: 4,
        overflow: 'truncate',
      },
      phone: {
        kind: 'text',
        source: 'profile',
        profileField: 'phone',
        required: false,
        overflow: 'truncate',
        fallback: 'hide',
      },
      clinicName: {
        kind: 'text',
        source: 'profile',
        profileField: 'clinicName',
        required: false,
        overflow: 'truncate',
        fallback: 'hide',
      },
    },
    zones: [
      {
        id: 'backdrop',
        layer: 0,
        frame: { x: 0, y: 0, width: 1080, height: 620 },
        children: [
          { component: 'Shape', shape: 'diagonal', style: { color: 'accent' } },
        ],
      },
      {
        id: 'copy',
        layer: 2,
        frame: { x: 70, y: 150, width: 560, height: 420 },
        children: [
          { component: 'Text', slot: 'clinicName', style: { fontSize: 32, color: 'ink' } },
          {
            component: 'RichText',
            slot: 'headline',
            style: { fontFamily: 'display', fontSize: 88, fontWeight: 800, color: 'ink' },
          },
        ],
      },
      {
        id: 'services',
        layer: 2,
        frame: { x: 70, y: 620, width: 560, height: 360 },
        children: [{ component: 'List', slot: 'services', style: { fontSize: 34 } }],
      },
      {
        id: 'contact',
        layer: 3,
        frame: { x: 0, y: 1190, width: 1080, height: 160 },
        style: { background: 'ink', padding: 32 },
        children: [
          { component: 'ContactBar', style: { fontSize: 30, color: 'onInk' } },
        ],
      },
    ],
  };
}

const profile: VerifiedProfile = {
  profileVersion: 'v1',
  phone: '+91 85868 98752',
  clinicName: 'Gupta Diagnostic Centre',
};

const content: CampaignContent = {
  values: {
    headline: {
      kind: 'richtext',
      runs: [
        { text: 'Protect your child' },
        { text: 'this monsoon', emphasis: true },
      ],
    },
    services: {
      kind: 'list',
      items: [
        { label: 'Vaccination', icon: 'vaccination' },
        { label: 'Newborn care', icon: 'newborn' },
      ],
    },
  },
};

function render(t = template(), c = content, p = profile) {
  const facts = validateAndInjectFacts(t, p, c);
  return {
    facts,
    html: renderPostToHtml({
      template: t,
      format: 'instagram_portrait',
      content: facts.resolved,
      palette: buildPalette('#0ea5e9'),
      type: TYPE_PAIRS.clinical,
      icons: {
        vaccination: '<svg id="ic-vax"></svg>',
        newborn: '<svg id="ic-baby"></svg>',
        phone: '<svg id="ic-phone"></svg>',
        clinicName: '<svg id="ic-clinic"></svg>',
      },
      seed: 42,
    }),
  };
}

describe('renderPostToHtml', () => {
  it('produces a template that passes validation', () => {
    expect(validateTemplate(template()).valid).toBe(true);
  });

  it('positions top-level zones absolutely at their declared frames', () => {
    const { html } = render();
    expect(html).toContain('data-zone="contact"');
    // The contact panel is pinned; its contents flow inside it.
    expect(html).toMatch(/position:absolute[^"]*top:1190px/);
    // React serialises a zero-valued length without a unit.
    expect(html).toMatch(/left:0[;"]/);
  });

  it('renders verified facts verbatim', () => {
    const { html } = render();
    expect(html).toContain('+91 85868 98752');
    expect(html).toContain('Gupta Diagnostic Centre');
  });

  it('marks shrinkable text for the auto-fit pass with its bounds', () => {
    const { html } = render();
    expect(html).toContain('data-fit="headline"');
    expect(html).toContain('data-fit-min="40"');
    expect(html).toContain('data-fit-max="96"');
    expect(html).toContain('data-fit-lines="3"');
  });

  it('includes the auto-fit hook for export', () => {
    const { html } = render();
    expect(html).toContain('window.__fitDesign');
  });

  it('renders emphasis runs in the headline', () => {
    const { html } = render();
    expect(html).toContain('Protect your child');
    expect(html).toContain('this monsoon');
  });

  it('omits a zone whose slots all resolved to nothing', () => {
    const t = template();
    const { html } = render(t, { values: { headline: content.values.headline } });
    // No services supplied, so the list renders nothing and the zone drops out.
    expect(html).not.toContain('data-zone="services"');
  });

  it('drops contact entries the profile lacks', () => {
    const { html } = render(template(), content, {
      profileVersion: 'v1',
      phone: '+91 85868 98752',
    });
    expect(html).toContain('+91 85868 98752');
    expect(html).not.toContain('Gupta Diagnostic Centre');
  });

  it('is deterministic for identical inputs', () => {
    expect(render().html).toBe(render().html);
  });

  it('renders a model-supplied phone as the verified value', () => {
    const tampered: CampaignContent = {
      values: {
        ...content.values,
        phone: { kind: 'text', value: '+91 00000 00000' },
      },
    };
    const { html, facts } = render(template(), tampered);
    expect(facts.valid).toBe(false);
    expect(html).toContain('+91 85868 98752');
    expect(html).not.toContain('+91 00000 00000');
  });
});
