import { brandColour, buildPostImageHtml, PostImageService } from './post-image.service';

describe('buildPostImageHtml', () => {
  const base = { scene: 'x', artworkUrl: 'http://img.test/a.png' };

  it('turns leading offers into badges and keeps the rest of the line', () => {
    const html = buildPostImageHtml({
      ...base,
      headline: 'FREE Eye Test Camp',
      points: ['50% off glasses & frames', 'FREE eye check-up', 'Walk-ins welcome'],
    });
    expect(html).toContain('<span class="badge">50%</span>off glasses &amp; frames');
    expect(html).toContain('<span class="badge">FREE</span>eye check-up');
    expect(html).toContain('<span class="dot"></span>Walk-ins welcome');
  });

  it('escapes copy so it cannot inject markup', () => {
    const html = buildPostImageHtml({ ...base, headline: '<script>x</script>', footer: 'A "B"' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &quot;B&quot;');
  });

  it('caps the list at six points and omits empty sections', () => {
    const html = buildPostImageHtml({ ...base, headline: 'H', points: Array(9).fill('p') });
    expect(html.match(/class="row"/g)).toHaveLength(6);
    expect(html).not.toContain('class="sub"');
    expect(html).not.toContain('class="foot"');
  });
});

describe('brandColour', () => {
  it('finds a hex colour in any stored shape and falls back to teal', () => {
    expect(brandColour('["#123abc","#ffffff"]')).toBe('#123abc');
    expect(brandColour({ primary: '#AABBCC' })).toBe('#AABBCC');
    expect(brandColour(null)).toBe('#0f766e');
  });
});

describe('PostImageService.compose', () => {
  const make = (renderer = 'puppeteer', cached = false) => {
    const deps = {
      prisma: { userProfile: { findUnique: jest.fn().mockResolvedValue({ businessName: 'Vision Eye Centre', industry: 'Healthcare', brandColors: '#0f766e' }) } },
      images: { generate: jest.fn().mockResolvedValue({ url: 'http://img.test/a.png', provider: 'magnific', cached, warnings: [] }) },
      renderer: { renderToImage: jest.fn().mockResolvedValue({ renderer, buffer: Buffer.from('png'), warning: 'no chrome' }) },
      uploads: { uploadBuffer: jest.fn().mockResolvedValue({ url: 'http://cdn.test/post.png' }) },
      subs: { consumeCredits: jest.fn().mockResolvedValue({}) },
    };
    const service = new PostImageService(deps.prisma as any, deps.images as any, deps.renderer as any, deps.uploads as any, deps.subs as any);
    return { service, ...deps };
  };

  it('draws the scene without text, lays the copy over it and stores the render', async () => {
    const { service, images, renderer, subs } = make();
    const result = await service.compose('u1', { scene: 'glasses on a desk', headline: 'FREE Eye Test Camp' });
    expect(images.generate).toHaveBeenCalledWith('u1', expect.objectContaining({ subject: 'glasses on a desk', style: 'photographic' }));
    expect(renderer.renderToImage.mock.calls[0][0]).toContain('FREE Eye Test Camp');
    expect(renderer.renderToImage.mock.calls[0][0]).toContain('Vision Eye Centre');
    expect(subs.consumeCredits).toHaveBeenCalledWith('u1', 'ARTWORK_GENERATE');
    expect(result).toMatchObject({ url: 'http://cdn.test/post.png', provider: 'magnific' });
  });

  it('does not charge for cached artwork', async () => {
    const { service, subs } = make('puppeteer', true);
    await service.compose('u1', { scene: 's', headline: 'H' });
    expect(subs.consumeCredits).not.toHaveBeenCalled();
  });

  it('refuses to store a placeholder render', async () => {
    const { service, uploads } = make('placeholder');
    await expect(service.compose('u1', { scene: 's', headline: 'H' })).rejects.toThrow('no chrome');
    expect(uploads.uploadBuffer).not.toHaveBeenCalled();
  });
});
