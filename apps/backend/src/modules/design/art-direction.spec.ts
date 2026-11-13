import { builtInTemplates, type TemplateDefinition } from '@jasper/post-renderer';
import { candidateTemplates, parseArtDirection } from './art-direction';

/**
 * Tests for the boundary between a language model and a document published
 * under a doctor's name.
 *
 * These run against the real templates rather than a fixture: the point is
 * that the guarantees hold for what actually ships, and a template edit that
 * weakened one should fail here.
 */

const TEMPLATES: TemplateDefinition[] = builtInTemplates();
const CLINIC = TEMPLATES.find((t) => t.id === 'clinic-profile-01')!;
const PHOTO = TEMPLATES.find((t) => t.id === 'photo-hero-01')!;

/** A minimally valid reply for the A4 layout. */
function reply(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    templateId: 'clinic-profile-01',
    format: 'a4_portrait',
    rationale: 'A profile layout suits a general introduction.',
    visibleSlots: [],
    values: {
      headline: {
        kind: 'richtext',
        runs: [{ text: 'Care for' }, { text: 'every child', emphasis: true }],
      },
      services: {
        kind: 'list',
        items: [{ label: 'Vaccination', icon: 'vaccination' }],
      },
    },
    ...overrides,
  });
}

describe('parseArtDirection', () => {
  it('accepts a well-formed plan', () => {
    const result = parseArtDirection(reply(), TEMPLATES);
    expect(result.fatal).toEqual([]);
    expect(result.direction?.templateId).toBe('clinic-profile-01');
    expect(result.direction?.values.headline).toEqual({
      kind: 'richtext',
      runs: [
        { text: 'Care for', emphasis: false },
        { text: 'every child', emphasis: true },
      ],
    });
  });

  // The rule the whole design exists for.
  it('discards a verified fact the model tried to write, and says so', () => {
    const result = parseArtDirection(
      reply({
        values: {
          headline: { kind: 'richtext', runs: [{ text: 'Open today' }] },
          services: { kind: 'list', items: [{ label: 'Vaccination' }] },
          phone: { kind: 'text', value: '+91 90000 00000' },
          clinicName: { kind: 'text', value: 'Totally Real Clinic' },
        },
      }),
      TEMPLATES,
    );

    expect(result.fatal).toEqual([]);
    expect(result.direction?.values.phone).toBeUndefined();
    expect(result.direction?.values.clinicName).toBeUndefined();
    expect(result.corrections).toEqual(
      expect.arrayContaining([
        expect.stringContaining('dropped "phone"'),
        expect.stringContaining('dropped "clinicName"'),
      ]),
    );
  });

  it('confirms every protected slot in both templates is non-authorable', () => {
    // If a template ever declared one of these as campaign-sourced, the guard
    // above would pass it straight through.
    const protectedNames = [
      'clinicName',
      'doctorName',
      'qualifications',
      'specialty',
      'phone',
      'email',
      'website',
      'address',
      'bookingUrl',
      'registrationNumber',
    ];
    for (const template of TEMPLATES) {
      for (const name of protectedNames) {
        const spec = template.slots[name];
        if (!spec) continue;
        expect([template.id, name, spec.source]).toEqual([
          template.id,
          name,
          'profile',
        ]);
      }
    }
  });

  it('drops a slot the template does not declare', () => {
    const result = parseArtDirection(
      reply({
        values: {
          headline: { kind: 'richtext', runs: [{ text: 'Hello' }] },
          services: { kind: 'list', items: [{ label: 'Vaccination' }] },
          footerDisclaimer: { kind: 'text', value: 'Terms apply' },
        },
      }),
      TEMPLATES,
    );
    expect(result.direction?.values.footerDisclaimer).toBeUndefined();
    expect(result.corrections).toEqual(
      expect.arrayContaining([
        expect.stringContaining('dropped "footerDisclaimer"'),
      ]),
    );
  });

  it('rejects a value of the wrong kind', () => {
    const result = parseArtDirection(
      reply({
        values: {
          headline: { kind: 'richtext', runs: [{ text: 'Hello' }] },
          services: { kind: 'list', items: [{ label: 'Vaccination' }] },
          cta: { kind: 'list', items: [{ label: 'Book now' }] },
        },
      }),
      TEMPLATES,
    );
    expect(result.direction?.values.cta).toBeUndefined();
    expect(result.corrections).toEqual(
      expect.arrayContaining([expect.stringContaining('expected text')]),
    );
  });

  it('keeps a list item whose icon concept was invented, without the icon', () => {
    const result = parseArtDirection(
      reply({
        values: {
          headline: { kind: 'richtext', runs: [{ text: 'Hello' }] },
          services: {
            kind: 'list',
            items: [
              { label: 'Vaccination', icon: 'vaccination' },
              { label: 'Dental care', icon: 'healthicons:a-tooth-that-smiles' },
            ],
          },
        },
      }),
      TEMPLATES,
    );

    const services = result.direction?.values.services;
    expect(services?.kind).toBe('list');
    if (services?.kind !== 'list') throw new Error('expected a list');
    expect(services.items).toEqual([
      { label: 'Vaccination', icon: 'vaccination' },
      { label: 'Dental care' },
    ]);
    expect(result.corrections).toEqual(
      expect.arrayContaining([expect.stringContaining('not in the vocabulary')]),
    );
  });

  it('trims a list past the slot capacity rather than letting it spill', () => {
    const capacity = CLINIC.slots.services.maxItems!;
    const items = Array.from({ length: capacity + 3 }, (_, i) => ({
      label: `Service ${i + 1}`,
    }));

    const result = parseArtDirection(
      reply({
        values: {
          headline: { kind: 'richtext', runs: [{ text: 'Hello' }] },
          services: { kind: 'list', items },
        },
      }),
      TEMPLATES,
    );

    const services = result.direction?.values.services;
    if (services?.kind !== 'list') throw new Error('expected a list');
    expect(services.items).toHaveLength(capacity);
    expect(result.corrections).toEqual(
      expect.arrayContaining([expect.stringContaining('the rest were cut')]),
    );
  });

  it('keeps over-long copy, because the fit pass can shrink it', () => {
    const long = 'x'.repeat((CLINIC.slots.subheadline.maxChars ?? 100) + 60);
    const result = parseArtDirection(
      reply({
        values: {
          headline: { kind: 'richtext', runs: [{ text: 'Hello' }] },
          services: { kind: 'list', items: [{ label: 'Vaccination' }] },
          subheadline: { kind: 'text', value: long },
        },
      }),
      TEMPLATES,
    );
    expect(result.direction?.values.subheadline).toEqual({
      kind: 'text',
      value: long,
    });
  });

  it('is fatal when a required campaign slot is missing', () => {
    const result = parseArtDirection(
      reply({ values: { services: { kind: 'list', items: [{ label: 'X' }] } } }),
      TEMPLATES,
    );
    expect(result.direction).toBeUndefined();
    expect(result.fatal).toEqual([
      expect.stringContaining('"headline" is required'),
    ]);
  });

  it('is fatal when the template is not one that was offered', () => {
    const result = parseArtDirection(
      reply({ templateId: 'something-invented-01' }),
      TEMPLATES,
    );
    expect(result.direction).toBeUndefined();
    expect(result.fatal[0]).toContain('is not one of the templates offered');
  });

  it('falls back to the reference format when an unsupported one is chosen', () => {
    const result = parseArtDirection(
      reply({ format: 'instagram_story' }),
      TEMPLATES,
    );
    expect(result.direction?.format).toBe(CLINIC.referenceFormat);
    expect(result.corrections[0]).toContain('is not supported');
  });

  it('tolerates a code fence and a preamble', () => {
    const result = parseArtDirection(
      `Here is the plan:\n\n\`\`\`json\n${reply()}\n\`\`\`\n`,
      TEMPLATES,
    );
    expect(result.fatal).toEqual([]);
    expect(result.direction?.templateId).toBe('clinic-profile-01');
  });

  it('is fatal when the reply is not JSON at all', () => {
    const result = parseArtDirection(
      'I would suggest a warm, friendly layout.',
      TEMPLATES,
    );
    expect(result.fatal).toEqual(['the reply was not JSON']);
  });

  it('ignores visible slots the template does not declare', () => {
    const result = parseArtDirection(
      reply({ visibleSlots: ['phone', 'notASlot'] }),
      TEMPLATES,
    );
    expect(result.direction?.visibleSlots).toEqual(['phone']);
  });
});

describe('candidateTemplates', () => {
  it('withholds photo-led layouts when no photograph was supplied', () => {
    const ids = candidateTemplates(TEMPLATES, {}).map((t) => t.id);
    expect(ids).not.toContain(PHOTO.id);
    expect(ids).toContain(CLINIC.id);
  });

  // Without this the director's only option for a brief with no photograph is
  // an A4 flyer, which is not a social post.
  it('still offers a social layout when there is no photograph', () => {
    const offered = candidateTemplates(TEMPLATES, {});
    const social = offered.filter((t) =>
      t.formats.some((f) => f.startsWith('instagram')),
    );
    expect(social.length).toBeGreaterThan(0);
  });

  it('offers them once a photograph is supplied', () => {
    const ids = candidateTemplates(TEMPLATES, {
      photoUrl: 'https://example.test/photo.jpg',
    }).map((t) => t.id);
    expect(ids).toContain(PHOTO.id);
  });

  it('narrows to a requested template', () => {
    const ids = candidateTemplates(TEMPLATES, {
      templateId: CLINIC.id,
    }).map((t) => t.id);
    expect(ids).toEqual([CLINIC.id]);
  });

  it('returns nothing when the requested template needs an asset that is absent', () => {
    expect(candidateTemplates(TEMPLATES, { templateId: PHOTO.id })).toEqual([]);
  });

  it('confirms the photo-led layout really does require its photograph', () => {
    // The filtering above is only meaningful while this holds.
    expect(PHOTO.slots.heroImage.required).toBe(true);
    expect(PHOTO.slots.heroImage.source).toBe('asset');
  });
});
