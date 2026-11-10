import * as sharp from 'sharp';
import { composeDesignerPrompt, copyLines, DesignerService, fetchInputImage, modelSize } from './designer.service';
import { resolveSpec } from './creative-specs';
import { THEMES } from './post-themes';

const copy = {
  headline: 'FULL BODY\nHEALTH CHECKUP',
  price: '₹599',
  items: [{ label: 'LFT', detail: 'Liver Function Test' }],
  cta: 'BOOK NOW',
  footerLines: ['Call: 98980 48888'],
};

describe('designer prompt', () => {
  it('lists every line of copy with its role, in reading order', () => {
    expect(copyLines(copy).map((l) => l.text)).toEqual(['FULL BODY HEALTH CHECKUP', '₹599', 'LFT — Liver Function Test', 'BOOK NOW', 'Call: 98980 48888']);
  });

  it('renders at a size the model accepts, with the same ratio', () => {
    expect(modelSize(resolveSpec({ spec: 'instagram-feed-portrait' }))).toEqual({ width: 1088, height: 1360 });
    for (const id of ['instagram-story', 'web-hero', 'x-post', 'facebook-link', 'linkedin-feed-square']) {
      const spec = resolveSpec({ spec: id });
      const size = modelSize(spec);
      expect(size.width % 16 + size.height % 16).toBe(0);
      expect(Math.abs(size.height / size.width - spec.height / spec.width) / (spec.height / spec.width)).toBeLessThan(0.006);
    }
    const a4 = modelSize(resolveSpec({ spec: 'print-a4' }));
    expect(Math.max(a4.width, a4.height)).toBeLessThanOrEqual(2048);
    expect(a4.width % 16 + a4.height % 16).toBe(0);
  });

  it('demands exact text and forbids invented content and logo placeholders', () => {
    const spec = resolveSpec({ spec: 'instagram-feed-portrait' });
    const prompt = composeDesignerPrompt({ spec, copy, theme: THEMES['bold-promo'], brandColour: '#d6336c' }, { width: 1088, height: 1360 });
    expect(prompt).toContain('1088×1360 px, 4:5 portrait');
    expect(prompt).toContain('1. [headline] "FULL BODY HEALTH CHECKUP"');
    expect(prompt).toContain('[price - the largest, most prominent element] "₹599"');
    expect(prompt).toMatch(/Do not add, change.*phone numbers/);
    expect(prompt).toContain('do not write any placeholder such as "logo"');
    expect(prompt).toContain('#d6336c');
  });

  it('places a supplied logo exactly and treats references as style only', () => {
    const spec = resolveSpec({ spec: 'instagram-story' });
    const prompt = composeDesignerPrompt(
      { spec, copy, theme: THEMES['clinical-clean'], logo: Buffer.from('x'), references: [Buffer.from('y')] },
      { width: 1088, height: 1920 },
      ['price reads ₹559'],
    );
    expect(prompt).toContain('the first provided image is the logo. Place it exactly as supplied');
    expect(prompt).toContain('never copy their text, people, faces or logos');
    expect(prompt).toContain('take the brand colours from the provided logo');
    expect(prompt).toContain('250px top, 340px bottom');
    expect(prompt).toContain('The previous attempt had these errors, which must be fixed: price reads ₹559.');
  });
});

describe('designer prompt: photo and logo space', () => {
  const spec = resolveSpec({ spec: 'instagram-feed-portrait' });
  const size = { width: 1088, height: 1360 };

  it('builds around a supplied photo, numbered after the logo', () => {
    const withLogo = composeDesignerPrompt({ spec, copy, theme: THEMES['clinical-clean'], logo: Buffer.from('l'), photo: Buffer.from('p') }, size);
    expect(withLogo).toContain('the second provided image is the photograph to use as the main imagery');
    expect(withLogo).not.toContain('Imagery:');
    const alone = composeDesignerPrompt({ spec, copy, theme: THEMES['clinical-clean'], photo: Buffer.from('p'), picture: 'ignored' }, size);
    expect(alone).toContain('the first provided image is the photograph');
  });

  it('keeps an empty corner when logo space is reserved, and never writes a placeholder', () => {
    const prompt = composeDesignerPrompt({ spec, copy, theme: THEMES['clinical-clean'], reserveLogo: true }, size);
    expect(prompt).toContain('LOGO SPACE: leave the top-left corner');
    expect(prompt).toContain('do not write any placeholder text there or anywhere');
  });
});

describe('fetchInputImage', () => {
  it.each(['http://cdn.test/logo.png', 'https://localhost/logo.png', 'https://127.0.0.1/logo.png', 'https://10.0.0.5/x.png', 'https://[::1]/x.png', 'https://box.internal/x.png', 'not a url'])(
    'refuses %s',
    async (url) => {
      await expect(fetchInputImage(url)).rejects.toThrow();
    },
  );
});

describe('DesignerService.design', () => {
  const png = () => sharp({ create: { width: 1088, height: 1360, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const make = () => {
    const credentials = { get: jest.fn(async (k: string) => ({ OPENAI_API_KEY: 'o', ANTHROPIC_API_KEY: 'a' } as any)[k] || '') };
    const service = new DesignerService(credentials as any);
    return { service, credentials };
  };
  const input = () => ({ spec: resolveSpec({ spec: 'instagram-feed-portrait' }), copy, theme: THEMES['clinical-clean'] });

  it('returns the first design that passes verification, at the exact delivery size', async () => {
    const { service } = make();
    const generate = jest.spyOn(service as any, 'generate').mockImplementation(png);
    jest.spyOn(service, 'verify').mockResolvedValue({ ok: true, transcript: 'ok', imagery: 'a doctor', problems: [] });
    const result = await service.design(input());
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][0]).toBe('gpt-image-2.6-flare');
    const meta = await sharp(result.buffer).metadata();
    expect([meta.width, meta.height]).toEqual([1080, 1350]);
  });

  it('retries once with the problems spelled out, then gives up', async () => {
    const { service } = make();
    const generate = jest.spyOn(service as any, 'generate').mockImplementation(png);
    jest.spyOn(service, 'verify').mockResolvedValue({ ok: false, transcript: '₹559', imagery: 'a doctor', problems: ['price reads ₹559'] });
    await expect(service.design(input())).rejects.toThrow('price reads ₹559');
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1][1]).toContain('The previous attempt had these errors, which must be fixed: price reads ₹559');
  });

  it('succeeds on the retry when the second design is right', async () => {
    const { service } = make();
    jest.spyOn(service as any, 'generate').mockImplementation(png);
    jest.spyOn(service, 'verify')
      .mockResolvedValueOnce({ ok: false, transcript: '', imagery: 'a doctor', problems: ['missing BOOK NOW'] })
      .mockResolvedValueOnce({ ok: true, transcript: 'ok', imagery: 'a doctor', problems: [] });
    const result = await service.design(input());
    expect(result.attempts).toBe(2);
  });
});
