import { validateTemplate } from '../schema/validate-template';
import { validateAndInjectFacts } from '../validation/validate-facts';
import { createRenderSnapshot } from '../schema/snapshot';
import {
  SCHEMA_VERSION,
  TemplateDefinition,
  CampaignContent,
} from '../schema/types';
import { VerifiedProfile } from '../schema/protected-fields';

function baseTemplate(): TemplateDefinition {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'doctor-branding-01',
    templateVersion: '1.0.0',
    title: 'Doctor branding',
    family: 'medical-editorial',
    status: 'active',
    formats: ['instagram_portrait'],
    referenceFormat: 'instagram_portrait',
    theme: { mood: 'clinical', background: 'surface' },
    capabilities: {
      maxServices: 5,
      supportsCutout: true,
      supportsPhoto: true,
      supportsTimings: false,
      supportsBadges: false,
    },
    slots: {
      headline: {
        kind: 'richtext',
        source: 'campaign',
        required: true,
        maxChars: 60,
        maxLines: 3,
        minFontSize: 40,
        maxFontSize: 96,
        overflow: 'shrink',
      },
      phone: {
        kind: 'text',
        source: 'profile',
        profileField: 'phone',
        required: false,
        overflow: 'truncate',
        fallback: 'hide',
      },
    },
    zones: [
      {
        id: 'copy',
        layer: 1,
        frame: { x: 70, y: 160, width: 500, height: 420 },
        children: [{ component: 'Heading', slot: 'headline' }],
      },
      {
        id: 'contact',
        layer: 2,
        frame: { x: 0, y: 1190, width: 1080, height: 160 },
        children: [{ component: 'ContactBar', slot: 'phone' }],
      },
    ],
  };
}

const errorsOf = (t: unknown) =>
  validateTemplate(t).issues.filter((i) => i.severity === 'error');

describe('validateTemplate', () => {
  it('accepts a well-formed template', () => {
    const result = validateTemplate(baseTemplate());
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('rejects a component outside the allow-list', () => {
    const t = baseTemplate();
    (t.zones[0].children[0] as any).component = 'ScriptTag';
    expect(errorsOf(t).some((e) => /not an allow-listed component/.test(e.message))).toBe(true);
  });

  it('rejects a style property outside the allow-list', () => {
    const t = baseTemplate();
    (t.zones[0].children[0] as any).style = { position: 'fixed' };
    expect(errorsOf(t).some((e) => /not an allow-listed style/.test(e.message))).toBe(true);
  });

  it('rejects CSS that can load or execute something', () => {
    const t = baseTemplate();
    t.zones[0].children[0].style = { background: 'url(https://evil.test/x.png)' };
    expect(errorsOf(t).some((e) => /disallowed construct/.test(e.message))).toBe(true);
  });

  it('refuses a protected field sourced from campaign copy', () => {
    const t = baseTemplate();
    t.slots.phone.source = 'campaign';
    expect(
      errorsOf(t).some((e) => /Protected facts must have source "profile"/.test(e.message)),
    ).toBe(true);
  });

  it('refuses a hardcoded contact detail in literal text', () => {
    const t = baseTemplate();
    t.zones[1].children.push({ component: 'Text', text: 'Call +91 85868 98752' });
    expect(
      errorsOf(t).some((e) => /must come from the verified profile/.test(e.message)),
    ).toBe(true);
  });

  it('rejects a zone that lies entirely outside the canvas', () => {
    const t = baseTemplate();
    t.zones[0].frame = { x: 5000, y: 5000, width: 100, height: 100 };
    expect(errorsOf(t).some((e) => /entirely outside the canvas/.test(e.message))).toBe(true);
  });

  it('rejects an incompatible schema major version', () => {
    const t = baseTemplate();
    t.schemaVersion = '2.0.0';
    expect(errorsOf(t).some((e) => /Incompatible schema major/.test(e.message))).toBe(true);
  });

  it('rejects a required slot no zone renders', () => {
    const t = baseTemplate();
    t.zones[0].children = [];
    expect(errorsOf(t).some((e) => /no zone renders it/.test(e.message))).toBe(true);
  });

  it('requires font bounds when overflow is shrink', () => {
    const t = baseTemplate();
    delete t.slots.headline.minFontSize;
    expect(errorsOf(t).some((e) => /requires both minFontSize/.test(e.message))).toBe(true);
  });
});

describe('validateAndInjectFacts', () => {
  const profile: VerifiedProfile = {
    profileVersion: 'v3',
    phone: '+91 85868 98752',
  };

  it('overwrites a model-supplied protected fact and flags it', () => {
    const content: CampaignContent = {
      values: {
        headline: { kind: 'text', value: 'Caring for your child' },
        phone: { kind: 'text', value: '+91 99999 00000' },
      },
    };

    const result = validateAndInjectFacts(baseTemplate(), profile, content);

    expect(result.valid).toBe(false);
    expect(
      result.issues.some((i) => /does not match the verified profile/.test(i.message)),
    ).toBe(true);
    // Regardless of the rejection, the rendered value is the verified one.
    expect(result.resolved.phone).toEqual({
      kind: 'text',
      value: '+91 85868 98752',
    });
  });

  it('omits an optional protected field the profile lacks', () => {
    const result = validateAndInjectFacts(
      baseTemplate(),
      { profileVersion: 'v3' },
      { values: { headline: { kind: 'text', value: 'Hello' } } },
    );
    expect(result.valid).toBe(true);
    expect(result.omitted).toContain('phone');
    expect(result.resolved.phone).toBeUndefined();
  });

  it('rejects campaign copy containing a phone number', () => {
    const result = validateAndInjectFacts(baseTemplate(), profile, {
      values: {
        headline: { kind: 'text', value: 'Call us on 085868 98752 today' },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => /phone number/.test(i.message))).toBe(true);
  });

  it('rejects a missing required slot', () => {
    const result = validateAndInjectFacts(baseTemplate(), profile, { values: {} });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => /Required slot has no value/.test(i.message))).toBe(true);
  });
});

describe('createRenderSnapshot', () => {
  const profile: VerifiedProfile = { profileVersion: 'v3', phone: '+91 85868 98752' };
  const resolved = {
    headline: { kind: 'text' as const, value: 'Caring for your child' },
    phone: { kind: 'text' as const, value: '+91 85868 98752' },
  };

  it('is deterministic for identical inputs', () => {
    const make = () =>
      createRenderSnapshot({
        template: { id: 'doctor-branding-01', templateVersion: '1.0.0' },
        format: 'instagram_portrait',
        profile,
        resolvedContent: resolved,
        theme: { accent: '#0ea5e9' },
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

    expect(make().snapshotId).toBe(make().snapshotId);
  });

  it('ignores creation time, so the id reflects only inputs', () => {
    const at = (iso: string) =>
      createRenderSnapshot({
        template: { id: 'doctor-branding-01', templateVersion: '1.0.0' },
        format: 'instagram_portrait',
        profile,
        resolvedContent: resolved,
        theme: { accent: '#0ea5e9' },
        createdAt: new Date(iso),
      }).snapshotId;

    expect(at('2026-01-01T00:00:00Z')).toBe(at('2027-06-06T12:00:00Z'));
  });

  it('changes when the template version changes', () => {
    const withVersion = (v: string) =>
      createRenderSnapshot({
        template: { id: 'doctor-branding-01', templateVersion: v },
        format: 'instagram_portrait',
        profile,
        resolvedContent: resolved,
        theme: { accent: '#0ea5e9' },
      }).snapshotId;

    expect(withVersion('1.0.0')).not.toBe(withVersion('1.0.1'));
  });

  it('changes when a verified fact changes', () => {
    const withPhone = (phone: string) =>
      createRenderSnapshot({
        template: { id: 'doctor-branding-01', templateVersion: '1.0.0' },
        format: 'instagram_portrait',
        profile: { profileVersion: 'v3', phone },
        resolvedContent: resolved,
        theme: { accent: '#0ea5e9' },
      }).snapshotId;

    expect(withPhone('+91 85868 98752')).not.toBe(withPhone('+91 85868 98753'));
  });
});
