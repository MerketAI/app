import { brandColour, buildPostImageHtml, PostImageService } from './post-image.service';

describe('buildPostImageHtml', () => {
  it('is the full layout engine', () => {
    const html = buildPostImageHtml({ artworkUrl: 'http://img.test/a.png', headline: 'H', price: '₹599' });
    expect(html).toContain('class="price"');
    expect(html).toContain('window.__fitDesign');
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
  const make = (renderer = 'puppeteer', cached = false, picked: any = { id: 'art1', mediaType: 'image', url: 'http://lib.test/art1.png', scene: 'glasses on a desk' }) => {
    const deps = {
      prisma: { userProfile: { findUnique: jest.fn().mockResolvedValue({ businessName: 'Vision Eye Centre', industry: 'Healthcare', brandColors: '#0f766e' }) } },
      images: { generate: jest.fn().mockResolvedValue({ url: 'http://img.test/a.png', libraryId: 'gen1', provider: 'magnific', cached, warnings: [] }) },
      renderer: { renderToImage: jest.fn().mockResolvedValue({ renderer, buffer: Buffer.from('png'), warning: 'no chrome' }) },
      library: {
        get: jest.fn().mockResolvedValue(picked),
        store: jest.fn().mockImplementation(async (_u: string, file: any, filing: any) =>
          ({ id: filing.kind === 'post' ? 'post1' : 'tpl1', url: `http://cdn.test/${filing.kind}.${file.extension}` })),
      },
      subs: { consumeCredits: jest.fn().mockResolvedValue({}) },
    };
    const service = new PostImageService(deps.prisma as any, deps.images as any, deps.renderer as any, deps.library as any, deps.subs as any);
    return { service, ...deps };
  };

  it('draws the scene without text, lays the copy over it and files post and layout', async () => {
    const { service, images, renderer, subs, library } = make();
    const result = await service.compose('u1', {
      scene: 'glasses on a desk', headline: 'FREE Eye Test Camp', folder: 'campaigns/eye-camp', tags: ['eye-care'], notes: 'Nov camp',
    });
    expect(images.generate).toHaveBeenCalledWith('u1', expect.objectContaining({
      subject: 'glasses on a desk', style: 'photographic', filing: expect.objectContaining({ folder: 'campaigns/eye-camp' }),
    }));
    expect(renderer.renderToImage.mock.calls[0][0]).toContain('FREE Eye Test Camp');
    expect(renderer.renderToImage.mock.calls[0][0]).toContain('Vision Eye Centre');
    expect(subs.consumeCredits).toHaveBeenCalledWith('u1', 'ARTWORK_GENERATE');

    const [, layoutFile, layoutFiling] = library.store.mock.calls[0];
    expect(layoutFile).toMatchObject({ mimeType: 'text/html', extension: 'html' });
    expect(layoutFiling).toMatchObject({ kind: 'template', folder: 'campaigns/eye-camp', parentId: 'gen1' });
    const [, , postFiling] = library.store.mock.calls[1];
    expect(postFiling).toMatchObject({
      kind: 'post', folder: 'campaigns/eye-camp', tags: ['eye-care', 'instagram', 'feed-portrait'], notes: 'Nov camp', parentId: 'gen1',
      width: 1080, height: 1350, metadata: expect.objectContaining({ spec: 'instagram-feed-portrait', category: 'social', ratio: '4:5' }),
    });
    expect(result).toMatchObject({ url: 'http://cdn.test/post.png', libraryId: 'post1', artworkId: 'gen1', provider: 'magnific', spec: 'instagram-feed-portrait' });
  });

  it('renders several placements from one picture, skipping duplicate sizes', async () => {
    const { service, images, renderer } = make();
    const result = await service.compose('u1', {
      scene: 's', headline: 'H', specs: ['instagram-feed-portrait', 'facebook-feed-portrait', 'instagram-story', 'web-hero'],
    });
    expect(images.generate).toHaveBeenCalledTimes(1);
    // Facebook's 4:5 post is the same size as Instagram's, so it is not rendered twice.
    expect(renderer.renderToImage.mock.calls.map((c: any[]) => `${c[1]}x${c[2]}`)).toEqual(['1080x1350', '1080x1920', '1920x600']);
    expect(result.sizes.map((s) => s.spec)).toEqual(['instagram-feed-portrait', 'instagram-story', 'web-hero']);
  });

  it('accepts an exact custom size and rejects an unusable one', async () => {
    const { service, renderer } = make();
    await service.compose('u1', { scene: 's', headline: 'H', width: 1200, height: 1500 });
    expect(renderer.renderToImage.mock.calls[0].slice(1, 3)).toEqual([1200, 1500]);
    await expect(service.compose('u1', { scene: 's', headline: 'H', width: 50, height: 50 })).rejects.toThrow('between');
  });

  it('reports lines the layout had no room for', async () => {
    const { service, renderer } = make();
    renderer.renderToImage.mockResolvedValue({ renderer: 'puppeteer', buffer: Buffer.from('png'), fit: { fitted: true, zoom: 0.55, dropped: ['items-note'] } });
    const result = await service.compose('u1', { scene: 's', headline: 'H', spec: 'x-header' });
    expect(result.warnings.join(' ')).toContain('no room for the line under the cards');
    expect(result.sizes[0].dropped).toEqual(['the line under the cards']);
  });

  it('reuses a library picture by id without calling the image model or charging', async () => {
    const { service, images, subs, renderer } = make();
    const result = await service.compose('u1', { artworkId: 'art1', headline: 'FREE Eye Test Camp' });
    expect(images.generate).not.toHaveBeenCalled();
    expect(subs.consumeCredits).not.toHaveBeenCalled();
    expect(renderer.renderToImage.mock.calls[0][0]).toContain('http://lib.test/art1.png');
    expect(result).toMatchObject({ artworkId: 'art1', provider: 'library', scene: 'glasses on a desk' });
  });

  it('will not use a non-picture asset as the background', async () => {
    const { service } = make('puppeteer', false, { id: 'j1', mediaType: 'json', url: 'http://x' });
    await expect(service.compose('u1', { artworkId: 'j1', headline: 'H' })).rejects.toThrow('not a picture');
  });

  it('needs a scene or a library picture', async () => {
    const { service } = make();
    await expect(service.compose('u1', { headline: 'H' })).rejects.toThrow('scene');
  });

  it('does not charge for cached artwork', async () => {
    const { service, subs } = make('puppeteer', true);
    await service.compose('u1', { scene: 's', headline: 'H' });
    expect(subs.consumeCredits).not.toHaveBeenCalled();
  });

  it('refuses to store a placeholder render', async () => {
    const { service, library } = make('placeholder');
    await expect(service.compose('u1', { scene: 's', headline: 'H' })).rejects.toThrow('no chrome');
    expect(library.store).not.toHaveBeenCalled();
  });
});
