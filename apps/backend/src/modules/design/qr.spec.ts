import { buildPostLayout } from './post-layout';
import { resolveSpec } from './creative-specs';
import { bookingLinks, campaignFromFolder, isBookableUrl, qrBox, qrSvg, trackedUrl } from './qr';

describe('booking QR codes', () => {
  const page = 'https://quickcare.life/patients/public/find-doctor/doctor-booking/42';

  it('tags a booking URL and replaces old tags', () => {
    const url = new URL(trackedUrl(`${page}?utm_source=old&x=1`, { source: 'instagram', medium: 'qr', campaign: 'eye-camp' }));
    expect(url.searchParams.get('utm_source')).toBe('instagram');
    expect(url.searchParams.get('utm_medium')).toBe('qr');
    expect(url.searchParams.get('utm_campaign')).toBe('eye-camp');
    expect(url.searchParams.get('x')).toBe('1');
    expect(url.searchParams.getAll('utm_source')).toHaveLength(1);
  });

  it('takes the campaign from the last folder segment', () => {
    expect(campaignFromFolder('campaigns/Eye Camp Nov 2026')).toBe('eye-camp-nov-2026');
    expect(campaignFromFolder(undefined)).toBeUndefined();
  });

  it('only encodes real web addresses', () => {
    expect(isBookableUrl(page)).toBe(true);
    expect(isBookableUrl('javascript:alert(1)')).toBe(false);
    expect(isBookableUrl('quickcare.life/x')).toBe(false);
    expect(bookingLinks(null)).toBeNull();
    expect(new URL(bookingLinks(page)!.facebook).searchParams.get('utm_source')).toBe('facebook');
  });

  it('draws a real QR code', async () => {
    const svg = await qrSvg(page);
    expect(svg).toMatch(/^<svg[\s\S]*<path/);
  });

  it('keeps the code inside the canvas and clear of the app areas', () => {
    for (const id of ['instagram-feed-portrait', 'instagram-story', 'print-a4', 'print-a4-landscape']) {
      const spec = resolveSpec({ spec: id });
      const box = qrBox(spec);
      expect(box.left).toBeGreaterThan(0);
      expect(box.top).toBeGreaterThan(0);
      expect(box.left + box.side).toBeLessThanOrEqual(spec.width - (spec.safe?.right || 0));
      expect(box.top + box.height).toBeLessThanOrEqual(spec.height - (spec.safe?.bottom || 0));
    }
  });

  it('puts the plate in the layout only when asked', async () => {
    const base = { headline: 'Free eye camp', artworkUrl: 'https://x/a.png', footerLines: ['Clinic', '98765 43210'] };
    expect(buildPostLayout(base)).not.toContain('qr-plate');
    const html = buildPostLayout({ ...base, qrSvg: await qrSvg(page) });
    expect(html).toContain('qr-plate');
    expect(html).toContain('Scan to book');
  });
});

describe('Indian scripts on post images', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { scriptFonts, withScripts } = require('./templates/tokens');

  it('finds the scripts in the copy and the fonts they need', () => {
    expect(scriptFonts('Free eye camp').scripts).toEqual([]);
    expect(scriptFonts('मुफ़्त नेत्र जाँच — Vision Eye Centre').scripts).toEqual(['Devanagari']);
    expect(scriptFonts('இலவச கண் பரிசோதனை').families[0]).toMatch(/^Noto\+Sans\+Tamil/);
  });

  it('puts the script font before the generic family', () => {
    expect(withScripts("'Poppins', system-ui, sans-serif", "'Noto Sans Tamil'")).toBe("'Poppins', 'Noto Sans Tamil', system-ui, sans-serif");
    expect(withScripts("'Poppins', system-ui, sans-serif", '')).toBe("'Poppins', system-ui, sans-serif");
  });

  it('loads the font and marks the page Hindi when the text is', () => {
    const html = buildPostLayout({ headline: 'मुफ़्त नेत्र जाँच शिविर', artworkUrl: 'https://x/a.png' });
    expect(html).toContain('lang="hi"');
    expect(html).toContain('Noto+Sans+Devanagari');
    expect(buildPostLayout({ headline: 'Free eye camp', artworkUrl: 'https://x/a.png' })).not.toContain('Noto+Sans');
  });
});
