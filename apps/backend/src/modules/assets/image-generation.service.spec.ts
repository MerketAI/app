import { ImageGenerationService } from './image-generation.service';

const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as any;

describe('ImageGenerationService - Magnific', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; jest.useRealTimers(); });

  const make = (creds: Record<string, string>) => {
    const credentials = { get: jest.fn(async (k: string) => creds[k] || '') };
    const uploads = {
      objectUrlIfExists: jest.fn().mockResolvedValue(null),
      uploadBuffer: jest.fn().mockResolvedValue({ url: 'http://cdn.test/art.png', key: 'k' }),
    };
    return { service: new ImageGenerationService(credentials as any, uploads as any), uploads };
  };

  it('prefers Magnific and accepts MAGNIFY_API_KEY as an alias', async () => {
    const { service } = make({ MAGNIFY_API_KEY: 'm', OPENAI_API_KEY: 'o' });
    expect(await service.availableProviders()).toEqual(['magnific', 'openai']);
  });

  it('submits a Mystic task, polls it and stores the image', async () => {
    jest.useFakeTimers();
    const { service, uploads } = make({ MAGNIFIC_API_KEY: 'm' });
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(json(200, { data: { task_id: 't1', status: 'CREATED' } }))
      .mockResolvedValueOnce(json(200, { data: { status: 'IN_PROGRESS' } }))
      .mockResolvedValueOnce(json(200, { data: { status: 'COMPLETED', generated: ['http://mg.test/i.jpg'] } }))
      .mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => new Uint8Array([1, 2]).buffer });
    global.fetch = fetchMock as any;

    const run = service.generate('u1', { subject: 'glasses on a desk', aspect: 'square', style: 'photographic' });
    await jest.advanceTimersByTimeAsync(7000);
    const result = await run;

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.magnific.com/v1/ai/mystic');
    expect(init.headers['x-magnific-api-key']).toBe('m');
    expect(JSON.parse(init.body)).toMatchObject({ model: 'realism', aspect_ratio: 'square_1_1' });
    expect(JSON.parse(init.body).prompt).toContain('ABSOLUTELY NO TEXT');
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.magnific.com/v1/ai/mystic/t1');
    expect(uploads.uploadBuffer).toHaveBeenCalled();
    expect(result).toMatchObject({ provider: 'magnific', url: 'http://cdn.test/art.png', cached: false });
  });

  it('reports a failed task instead of storing anything', async () => {
    jest.useFakeTimers();
    const { service, uploads } = make({ MAGNIFIC_API_KEY: 'm' });
    global.fetch = jest.fn()
      .mockResolvedValueOnce(json(200, { data: { task_id: 't1' } }))
      .mockResolvedValueOnce(json(200, { data: { status: 'FAILED' } })) as any;

    const run = service.generate('u1', { subject: 's', aspect: 'square' });
    const assertion = expect(run).rejects.toThrow('Image generation failed: the task failed');
    await jest.advanceTimersByTimeAsync(4000);
    await assertion;
    expect(uploads.uploadBuffer).not.toHaveBeenCalled();
  });

  it('passes on a rejected submission', async () => {
    const { service } = make({ MAGNIFIC_API_KEY: 'bad' });
    global.fetch = jest.fn().mockResolvedValueOnce(json(401, { message: 'Unauthorized: invalid key' })) as any;
    await expect(service.generate('u1', { subject: 's' })).rejects.toThrow('Unauthorized: invalid key');
  });
});
