import { loadTemplates, builtInTemplates, findTemplate } from '../templates';
import { validateTemplate } from '../schema/validate-template';
import { validateAndInjectFacts } from '../validation/validate-facts';
import { renderPostToHtml } from '../render/render-to-html';
import { buildPalette, TYPE_PAIRS } from '../render/theme';
import { createRenderSnapshot } from '../schema/snapshot';
import { CampaignContent, FormatId, TemplateDefinition } from '../schema/types';
import { VerifiedProfile } from '../schema/protected-fields';

const PROFILE: VerifiedProfile = {
  profileVersion: 'v1',
  clinicName: 'Dr. Mohit Gupta - Pediatrician',
  phone: '+91 85868 98752',
  email: 'contact@mohitguptapedia.com',
  website: 'https://www.mohitguptapedia.com',
  address:
    'Shop No. 1, Gupta Diagnostic Centre, opposite Babu Jagjivan Ram Hospital, Block E 4, Jahangirpuri, Delhi, 110033',
};

const ICONS: Record<string, string> = {
  vaccination: '<svg data-icon="vax"></svg>',
  newborn: '<svg data-icon="baby"></svg>',
  growth: '<svg data-icon="growth"></svg>',
  checkup: '<svg data-icon="checkup"></svg>',
  address: '<svg data-icon="pin"></svg>',
  phone: '<svg data-icon="phone"></svg>',
  email: '<svg data-icon="mail"></svg>',
  website: '<svg data-icon="globe"></svg>',
  clinicName: '<svg data-icon="clinic"></svg>',
};

function serviceList(n: number) {
  const names = [
    'Newborn care',
    'Vaccination',
    'Growth monitoring',
    'Nutrition advice',
    'Allergy care',
    'Diagnostics',
    'Fever management',
    'Development checks',
  ];
  return {
    kind: 'list' as const,
    items: names.slice(0, n).map((label, i) => ({
      label,
      icon: ['vaccination', 'newborn', 'growth', 'checkup'][i % 4],
    })),
  };
}

function clinicContent(): CampaignContent {
  return {
    values: {
      headline: {
        kind: 'richtext',
        runs: [
          { text: 'Compassionate care for' },
          { text: 'every stage of childhood', emphasis: true },
        ],
      },
      subheadline: {
        kind: 'text',
        value: 'Trusted, accessible pediatric care for families across Delhi NCR',
      },
      servicesTitle: { kind: 'text', value: 'Our pediatric services' },
      services: serviceList(8),
      timings: {
        kind: 'keyvalue',
        items: [
          { label: 'Monday to Saturday', value: '9:30 AM - 11:00 AM' },
          { label: 'Sunday', value: '11:00 AM - 12:00 PM' },
        ],
      },
      badges: {
        kind: 'list',
        items: [
          { label: 'Child friendly', icon: 'newborn' },
          { label: 'Compassionate care', icon: 'checkup' },
          { label: 'Safe and hygienic', icon: 'growth' },
          { label: 'Experienced doctor', icon: 'vaccination' },
        ],
      },
      cta: { kind: 'text', value: 'Book your appointment today' },
      heroImage: {
        kind: 'image',
        assetId: 'asset-hero-1',
        url: 'https://cdn.example.test/hero.jpg',
      },
    },
  };
}

function photoContent(): CampaignContent {
  return {
    values: {
      heroImage: {
        kind: 'image',
        assetId: 'asset-photo-1',
        url: 'https://cdn.example.test/photo.jpg',
      },
      headline: {
        kind: 'richtext',
        runs: [
          { text: 'Protect your child' },
          { text: 'this monsoon', emphasis: true },
        ],
      },
      subheadline: {
        kind: 'text',
        value: 'Simple precautions prevent the most common infections.',
      },
      services: serviceList(5),
      cta: { kind: 'text', value: 'Book an appointment' },
      photoCredit: { kind: 'text', value: 'Photo by A. Photographer on Pexels' },
    },
  };
}

function render(
  template: TemplateDefinition,
  content: CampaignContent,
  profile: VerifiedProfile = PROFILE,
  format: FormatId = template.referenceFormat,
) {
  const facts = validateAndInjectFacts(template, profile, content);
  const html = renderPostToHtml({
    template,
    format,
    content: facts.resolved,
    palette: buildPalette('#0ea5e9'),
    type: TYPE_PAIRS[template.theme.mood ?? 'clinical'],
    icons: ICONS,
    seed: 4242,
  });
  return { facts, html };
}

describe('ported JSON templates', () => {
  it('loads both built-ins with no rejections', () => {
    const { templates, rejected } = loadTemplates();
    expect(rejected).toEqual([]);
    expect(templates.map((t) => t.id).sort()).toEqual([
      'clinic-profile-01',
      'photo-hero-01',
    ]);
  });

  it('each built-in passes validation with no warnings either', () => {
    for (const t of builtInTemplates()) {
      const result = validateTemplate(t, { strict: true });
      expect({ id: t.id, issues: result.issues }).toEqual({ id: t.id, issues: [] });
    }
  });

  it('templates are plain JSON - no behaviour smuggled in as code', () => {
    for (const t of builtInTemplates()) {
      expect(JSON.parse(JSON.stringify(t))).toEqual(t);
    }
  });
});

describe('clinic-profile-01', () => {
  const template = () => findTemplate('clinic-profile-01')!;

  it('renders every zone with content', () => {
    const { html, facts } = render(template(), clinicContent());
    expect(facts.valid).toBe(true);
    for (const zone of ['brand', 'headline', 'services', 'timings', 'badges', 'cta', 'contact']) {
      expect(html).toContain(`data-zone="${zone}"`);
    }
  });

  it('renders all eight services in two columns', () => {
    const { html } = render(template(), clinicContent());
    expect(html).toContain('Development checks');
    expect(html).toMatch(/grid-template-columns:repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  });

  it('renders trust badges as cards, not rows', () => {
    const { html } = render(template(), clinicContent());
    expect(html).toContain('Experienced doctor');
    expect(html).toMatch(/grid-template-columns:repeat\(4,/);
  });

  it('renders the verified address, phone, email and website', () => {
    const { html } = render(template(), clinicContent());
    expect(html).toContain('+91 85868 98752');
    expect(html).toContain('contact@mohitguptapedia.com');
    expect(html).toContain('Jahangirpuri');
  });

  it('drops optional zones when their content is absent', () => {
    const sparse: CampaignContent = {
      values: {
        headline: clinicContent().values.headline,
        services: serviceList(4),
      },
    };
    const { html, facts } = render(template(), sparse);
    expect(facts.valid).toBe(true);
    expect(html).not.toContain('data-zone="timings"');
    expect(html).not.toContain('data-zone="badges"');
    expect(html).not.toContain('data-zone="heroArt"');
    // The essentials still render.
    expect(html).toContain('data-zone="headline"');
    expect(html).toContain('data-zone="contact"');
  });
});

describe('photo-hero-01', () => {
  const template = () => findTemplate('photo-hero-01')!;

  it('renders the photo with the cloud mask authored at the zone size', () => {
    const { html } = render(template(), photoContent());
    expect(html).toContain('data-zone="photo"');
    // The zone is 1080x454, so the mask path must be generated at that size.
    // React HTML-escapes the quote inside the style attribute; the browser
    // decodes it back to path('...') when parsing.
    expect(html).toMatch(/clip-path:path\(&#x27;M0,0 L1080,0/);
  });

  it('rejects a render with no photograph, because the layout depends on it', () => {
    const noPhoto = photoContent();
    delete noPhoto.values.heroImage;
    const facts = validateAndInjectFacts(template(), PROFILE, noPhoto);
    expect(facts.valid).toBe(false);
    expect(facts.issues.some((i) => /Required slot has no value/.test(i.message))).toBe(true);
  });

  it('hides the cutout zone when no cutout is supplied', () => {
    const { html } = render(template(), photoContent());
    expect(html).not.toContain('data-zone="cutout"');
  });

  it('shows the cutout when one is supplied', () => {
    const content = photoContent();
    content.values.cutout = {
      kind: 'image',
      assetId: 'asset-cutout-1',
      url: 'https://cdn.example.test/doctor.png',
    };
    const { html } = render(template(), content);
    expect(html).toContain('data-zone="cutout"');
    expect(html).toContain('doctor.png');
  });

  it('keeps the photo credit, which a licence may require', () => {
    const { html } = render(template(), photoContent());
    expect(html).toContain('Photo by A. Photographer on Pexels');
  });
});

describe('robustness', () => {
  it('handles a very long address without losing other contact lines', () => {
    const longAddress: VerifiedProfile = {
      ...PROFILE,
      address:
        'Shop No. 1, Ground Floor, Gupta Diagnostic Centre Building, directly opposite the main gate of Babu Jagjivan Ram Memorial Hospital, Block E-4, Sector 2, Jahangirpuri, North West Delhi, Delhi, 110033, India',
    };
    const { html, facts } = render(findTemplate('clinic-profile-01')!, clinicContent(), longAddress);
    expect(facts.valid).toBe(true);
    expect(html).toContain('+91 85868 98752');
    expect(html).toContain('contact@mohitguptapedia.com');
  });

  it('handles a long practice name', () => {
    const longName: VerifiedProfile = {
      ...PROFILE,
      clinicName:
        'Dr. Mohit Gupta - Senior Consultant Paediatrician and Adolescent Health Specialist',
    };
    const { html } = render(findTemplate('photo-hero-01')!, photoContent(), longName);
    expect(html).toContain('Senior Consultant Paediatrician');
  });

  it('renders Hindi copy', () => {
    const hindi = photoContent();
    hindi.values.headline = {
      kind: 'richtext',
      runs: [{ text: 'अपने बच्चे को' }, { text: 'सुरक्षित रखें', emphasis: true }],
    };
    hindi.values.subheadline = {
      kind: 'text',
      value: 'मानसून में आम संक्रमण से बचाव के आसान उपाय।',
    };
    const { html, facts } = render(findTemplate('photo-hero-01')!, hindi);
    expect(facts.valid).toBe(true);
    expect(html).toContain('अपने बच्चे को');
    expect(html).toContain('सुरक्षित रखें');
  });

  it('renders with no optional profile fields at all', () => {
    const bare: VerifiedProfile = {
      profileVersion: 'v1',
      clinicName: 'Sparsh Clinic',
    };
    const { html, facts } = render(findTemplate('clinic-profile-01')!, clinicContent(), bare);
    expect(facts.valid).toBe(true);
    expect(html).toContain('Sparsh Clinic');
    // No contact details rendered. Checked specifically: the document always
    // contains an '@' from the webfont @import rule.
    expect(html).not.toContain('contact@mohitguptapedia.com');
    expect(html).not.toContain('+91 85868 98752');
    expect(html).not.toContain('data-zone="contact"');
  });

  it('is deterministic across repeated renders', () => {
    const t = findTemplate('clinic-profile-01')!;
    expect(render(t, clinicContent()).html).toBe(render(t, clinicContent()).html);
  });

  it('produces a stable snapshot id for identical inputs', () => {
    const t = findTemplate('photo-hero-01')!;
    const make = () => {
      const facts = validateAndInjectFacts(t, PROFILE, photoContent());
      return createRenderSnapshot({
        template: t,
        format: t.referenceFormat,
        profile: PROFILE,
        resolvedContent: facts.resolved,
        theme: { accent: '#0ea5e9' },
        createdAt: new Date('2026-01-01'),
      }).snapshotId;
    };
    expect(make()).toBe(make());
  });
});
