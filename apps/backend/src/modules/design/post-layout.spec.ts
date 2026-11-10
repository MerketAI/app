import { buildPostLayout, pickIcon, POST_FORMATS } from './post-layout';
import { CREATIVE_SPECS, resolveSpec } from './creative-specs';

const base = { artworkUrl: 'http://img.test/a.png' };
// Only the generated markup, not the fit script or the styles.
const body = (html: string) => html.slice(html.indexOf('<div class="stage'), html.indexOf('<script>'));

describe('buildPostLayout', () => {
  it('lays out a full brief: headline lines, hero price, cards, note, CTA and footer', () => {
    const html = body(buildPostLayout({
      ...base,
      format: 'portrait',
      headline: 'FULL BODY\nHEALTH CHECKUP',
      price: '₹599',
      priceNote: 'Take the first step towards better health.',
      items: [{ label: 'LFT', detail: 'Liver Function Test' }, { label: 'KFT', detail: 'Kidney Function Test' }, { label: 'Cholesterol Test' }],
      itemsNote: 'Contact us for the complete test list.',
      cta: 'BOOK YOUR CHECKUP TODAY',
      footerLines: ['[Lab / Clinic Name]', 'Call / WhatsApp: [Phone Number]', '[Location]'],
    }));
    expect(html).toContain('<span class="fit-line">FULL BODY</span><span class="fit-line">HEALTH CHECKUP</span>');
    expect(html).toContain('<div class="price"><span class="fit-line">₹599</span></div>');
    expect(html.match(/class="card"/g)).toHaveLength(3);
    expect(html).toContain('<div class="card-label">LFT</div><div class="card-detail">Liver Function Test</div>');
    expect(html).toContain('<div class="items-note" data-drop="1">Contact us for the complete test list.</div>');
    expect(html).toContain('<div class="cta"><span>BOOK YOUR CHECKUP TODAY</span>');
    expect(html.match(/class="foot-line[ "]/g)).toHaveLength(3);
    expect(html).toContain('[Phone Number]');
  });

  it('still accepts the legacy formats', () => {
    for (const [format, size] of Object.entries(POST_FORMATS)) {
      const html = buildPostLayout({ ...base, format: format as any, headline: 'H' });
      expect(html).toContain(`width:${size.width}px;height:${size.height}px`);
    }
  });

  it('sizes the page for every creative spec and picks the layout family from its ratio', () => {
    for (const spec of CREATIVE_SPECS) {
      const html = buildPostLayout({ ...base, spec, headline: 'H' });
      expect(html).toContain(`body{width:${spec.width}px;height:${spec.height}px`);
      expect(html).toContain(`class="stage ${spec.family}" data-spec="${spec.id}"`);
    }
  });

  it('keeps text out of a placement safe area', () => {
    const story = resolveSpec({ spec: 'instagram-story' });
    const html = buildPostLayout({ ...base, spec: story, headline: 'H', footerLines: ['Clinic'] });
    // Column starts below the app's top bar; footer sits above the reply bar.
    expect(html).toMatch(new RegExp(`\\.col\\{[^}]*top:${story.safe!.top + 90}px`));
    expect(html).toMatch(new RegExp(`footer\\{[^}]*bottom:${story.safe!.bottom}px`));
  });

  it('marks optional lines with a drop order and ships the fit pass that uses it', () => {
    const html = buildPostLayout({ ...base, headline: 'H', priceNote: 'n', itemsNote: 'x', items: [{ label: 'a' }], subheading: 's' });
    expect(html).toContain('class="items-note" data-drop="1"');
    expect(html).toContain('class="price-note" data-drop="2"');
    expect(html).toContain('class="cards" data-drop="3"');
    expect(html).toContain('class="sub" data-drop="4"');
    expect(html).toContain('dropped.push');
  });

  it('keeps leading offers as badges', () => {
    const html = body(buildPostLayout({ ...base, headline: 'Camp', points: ['50% off glasses & frames', 'FREE eye check-up'] }));
    expect(html).toContain('<span class="badge">50%</span><span>off glasses &amp; frames</span>');
    expect(html).toContain('<span class="badge">FREE</span><span>eye check-up</span>');
  });

  it('escapes every piece of copy', () => {
    const html = body(buildPostLayout({
      ...base, headline: '<img src=x onerror=alert(1)>', price: '"><b>', items: [{ label: '<i>' }], cta: '</div>', footerLines: ['<script>'],
    }));
    expect(html).not.toMatch(/<img src=x|<b>|<i>|<script>/);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('reserves logo space, shows a logo on file, or leaves it out', () => {
    expect(body(buildPostLayout({ ...base, headline: 'H', logo: 'reserve' }))).toContain('<div class="logo"></div>');
    expect(body(buildPostLayout({ ...base, headline: 'H', logoUrl: 'http://l.test/logo.png' }))).toContain('<img src="http://l.test/logo.png"');
    expect(body(buildPostLayout({ ...base, headline: 'H' }))).not.toContain('class="logo"');
  });

  it('omits sections that have no copy', () => {
    const html = body(buildPostLayout({ ...base, headline: 'H' }));
    expect(html).not.toMatch(/class="(price|cards|cta|sub|rows)"|<footer>/);
  });
});

describe('pickIcon', () => {
  it('picks an icon from the words, honouring an explicit choice', () => {
    expect(pickIcon('LFT Liver Function Test')).toBe('liver');
    expect(pickIcon('KFT Kidney Function Test')).toBe('kidney');
    expect(pickIcon('Cholesterol Test')).toBe('heart');
    expect(pickIcon('HbA1c sugar test')).toBe('drop');
    expect(pickIcon('Thyroid profile')).toBe('thyroid');
    expect(pickIcon('Something else')).toBe('check');
    expect(pickIcon('Liver', 'eye')).toBe('eye');
    expect(pickIcon('Liver', 'not-an-icon')).toBe('liver');
  });
});
