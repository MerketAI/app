import { detectMediaType, LibraryService, normaliseFolder, normaliseTags } from './library.service';

describe('library helpers', () => {
  it('detects media types from MIME type and extension, including React and Lottie JSON', () => {
    expect(detectMediaType('image/png', 'png')).toBe('image');
    expect(detectMediaType('image/gif', 'gif')).toBe('gif');
    expect(detectMediaType('image/svg+xml', 'svg')).toBe('svg');
    expect(detectMediaType('video/mp4', 'mp4')).toBe('video');
    expect(detectMediaType('text/html', 'html')).toBe('html');
    expect(detectMediaType('text/plain', 'tsx')).toBe('react');
    expect(detectMediaType('application/json', 'json')).toBe('json');
    expect(detectMediaType('', 'json')).toBe('json');
    expect(detectMediaType('application/octet-stream', 'bin')).toBe('other');
  });

  it('normalises folders into a bounded tree under known roots', () => {
    expect(normaliseFolder('Campaigns / Eye Test Camp', 'misc')).toBe('campaigns/eye-test-camp');
    expect(normaliseFolder('random/stuff', 'misc')).toBe('misc/random/stuff');
    expect(normaliseFolder('a/b/c/d/e/f', 'misc')).toBe('misc/a/b/c');
    expect(normaliseFolder('', 'uploads')).toBe('uploads');
    expect(normaliseFolder('../../etc', 'misc')).toBe('misc/etc');
  });

  it('normalises and de-duplicates tags', () => {
    expect(normaliseTags(['Eye Care', 'eye-care', ' Offer! ', ''])).toEqual(['eye-care', 'offer']);
  });
});

describe('LibraryService', () => {
  const make = () => {
    const prisma: any = {
      libraryAsset: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockImplementation(({ create }) => ({ id: 'a1', ...create })),
        update: jest.fn().mockResolvedValue({ id: 'a1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const uploads: any = { uploadBuffer: jest.fn().mockResolvedValue({ url: 'http://cdn.test/x.png', key: 'library/u1/k.png' }) };
    return { service: new LibraryService(prisma, uploads), prisma, uploads };
  };

  it('stores a file under the user and folder, filing type, size and hash', async () => {
    const { service, uploads, prisma } = make();
    await service.store('u1', { buffer: Buffer.from('abc'), mimeType: 'image/png', extension: 'png', name: 'Eye Camp' },
      { kind: 'post', folder: 'campaigns/eye-camp', tags: ['Eye Care'] });
    const [, options] = uploads.uploadBuffer.mock.calls[0];
    expect(options.folder).toBe('library/u1/campaigns/eye-camp');
    expect(options.fileName).toMatch(/^eye-camp-[0-9a-f]{12}$/);
    expect(prisma.libraryAsset.upsert.mock.calls[0][0].create).toMatchObject({
      userId: 'u1', mediaType: 'image', kind: 'post', folder: 'campaigns/eye-camp', tags: ['eye-care'], sizeBytes: 3,
      contentHash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    });
  });

  it('stores identical bytes only once', async () => {
    const { service, prisma, uploads } = make();
    prisma.libraryAsset.findFirst.mockResolvedValue({ id: 'existing', url: 'http://cdn.test/old.png' });
    const asset = await service.store('u1', { buffer: Buffer.from('abc'), mimeType: 'image/png', extension: 'png' }, { kind: 'post' });
    expect(asset.id).toBe('existing');
    expect(uploads.uploadBuffer).not.toHaveBeenCalled();
  });

  it("searches only the user's assets, every word must match, proven assets first, paged", async () => {
    const { service, prisma } = make();
    prisma.libraryAsset.findMany.mockResolvedValue(Array.from({ length: 4 }, (_, i) => ({ id: `a${i}` })));
    const page = await service.search('u1', { query: 'eye camp', tags: ['Offer'], mediaType: 'image', limit: 3 });
    const args = prisma.libraryAsset.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ userId: 'u1', mediaType: 'image', tags: { hasSome: ['offer'] } });
    expect(args.where.AND).toHaveLength(2);
    expect(args.orderBy[0]).toEqual({ usageCount: 'desc' });
    expect(args.take).toBe(4);
    expect(page).toEqual({ items: [{ id: 'a0' }, { id: 'a1' }, { id: 'a2' }], nextCursor: 'a2' });
  });

  it("returns a post's copy with it, trimmed, and nothing extra for other kinds", async () => {
    const { service, prisma } = make();
    prisma.libraryAsset.findMany.mockResolvedValue([
      { id: 'p1', kind: 'post', prompt: 'FREE Eye Test Camp | 50% off glasses' },
      { id: 'a1', kind: 'artwork', prompt: 'long image-model prompt' },
    ]);
    const { items } = await service.search('u1', {});
    expect(items[0]).toEqual({ id: 'p1', kind: 'post', copy: 'FREE Eye Test Camp | 50% off glasses' });
    expect(items[1]).toEqual({ id: 'a1', kind: 'artwork' });
  });

  it('never fails the caller when filing fails', async () => {
    const { service, prisma } = make();
    prisma.libraryAsset.upsert.mockRejectedValue(new Error('db down'));
    await expect(service.recordQuietly('u1', { kind: 'icon', url: 'u', storageKey: 'k' })).resolves.toBeNull();
  });
});
