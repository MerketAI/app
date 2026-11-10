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
    expect(postFiling).toMatchObject({ kind: 'post', folder: 'campaigns/eye-camp', tags: ['eye-care'], notes: 'Nov camp', parentId: 'gen1' });
    expect(result).toMatchObject({ url: 'http://cdn.test/post.png', libraryId: 'post1', artworkId: 'gen1', provider: 'magnific' });
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
