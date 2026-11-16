import { MetaConnectError, PlatformsService, pageInstagram } from './platforms.service';

/** Answers Graph API calls by URL fragment, in the order the callback makes them. */
function graph(routes: Record<string, unknown>) {
  return jest.fn(async (url: string) => {
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) throw new Error(`unexpected fetch ${url}`);
    return { status: 200, json: async () => routes[key] } as Response;
  });
}

describe('PlatformsService.handleMetaCallback', () => {
  const credentials = { get: async (k: string) => (k === 'META_APP_ID' ? 'app' : 'secret') };
  const upsert = jest.fn(async ({ create }) => create);
  const service = new PlatformsService({ platformConnection: { upsert } } as any, credentials as any);
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    upsert.mockClear();
  });

  it('fails with no-pages, not success, when Facebook shares no Page', async () => {
    global.fetch = graph({
      'grant_type=fb_exchange_token': { access_token: 'long' },
      'oauth/access_token': { access_token: 'short' },
      'me/accounts': { data: [] },
      'me/permissions': { data: [{ permission: 'public_profile', status: 'granted' }] },
    }) as any;
    const err = await service.handleMetaCallback('u1', 'code', 'https://x/cb').catch((e) => e);
    expect(err).toBeInstanceOf(MetaConnectError);
    expect(err.reason).toBe('no-pages');
    expect(err.message).toContain('public_profile');
    expect(upsert).not.toHaveBeenCalled();
  });

  it("reports Facebook's own error when listing Pages fails", async () => {
    global.fetch = graph({
      'grant_type=fb_exchange_token': { access_token: 'long' },
      'oauth/access_token': { access_token: 'short' },
      'me/accounts': { error: { message: 'Invalid OAuth access token' } },
    }) as any;
    const err = await service.handleMetaCallback('u1', 'code', 'https://x/cb').catch((e) => e);
    expect(err.reason).toBe('facebook');
    expect(err.message).toContain('Invalid OAuth access token');
  });

  it('saves each shared Page', async () => {
    global.fetch = graph({
      'grant_type=fb_exchange_token': { access_token: 'long' },
      'oauth/access_token': { access_token: 'short' },
      'me/accounts': { data: [{ id: 'p1', name: 'Clinic', access_token: 'pt' }] },
      'fields=instagram_business_account': {},
    }) as any;
    const { connections } = await service.handleMetaCallback('u1', 'code', 'https://x/cb');
    expect(connections).toHaveLength(1);
    expect(connections[0]).toMatchObject({ platform: 'FACEBOOK', accountName: 'Clinic' });
  });

  const login = {
    'grant_type=fb_exchange_token': { access_token: 'long' },
    'oauth/access_token': { access_token: 'short' },
    'me/accounts': { data: [{ id: 'p1', name: 'Clinic', access_token: 'pt' }] },
  };
  const allowed = {
    data: ['pages_show_list', 'instagram_basic', 'instagram_content_publish'].map((permission) => ({ permission, status: 'granted' })),
  };

  it('marks a Page with no Instagram linked, when Instagram was allowed', async () => {
    global.fetch = graph({ ...login, 'fields=instagram_business_account': {}, 'me/permissions': allowed }) as any;
    const { connections } = await service.handleMetaCallback('u1', 'code', 'https://x/cb');
    expect(pageInstagram(connections[0].metadata)).toBe('none');
  });

  it('marks a Page whose Instagram was not allowed at login', async () => {
    global.fetch = graph({
      ...login,
      'fields=instagram_business_account': {},
      'me/permissions': { data: [{ permission: 'pages_show_list', status: 'granted' }] },
    }) as any;
    const { connections } = await service.handleMetaCallback('u1', 'code', 'https://x/cb');
    expect(pageInstagram(connections[0].metadata)).toBe('not-allowed');
  });

  it('saves the Instagram account and marks the Page linked', async () => {
    global.fetch = graph({
      ...login,
      'fields=instagram_business_account': { instagram_business_account: { id: 'ig1' } },
      'fields=username': { username: 'clinic.hyd' },
    }) as any;
    const { connections } = await service.handleMetaCallback('u1', 'code', 'https://x/cb');
    expect(connections.map((c) => c.platform)).toEqual(['FACEBOOK', 'INSTAGRAM']);
    expect(pageInstagram(connections[0].metadata)).toBe('linked');
    expect(connections[1]).toMatchObject({ accountName: 'clinic.hyd' });
  });
});

describe('PlatformsService.getConnections', () => {
  it("shows a Page's Instagram finding and keeps metadata internal", async () => {
    const findMany = jest.fn(async () => [
      { id: '1', platform: 'FACEBOOK', accountName: 'Clinic', metadata: '{"instagram":"none"}' },
      { id: '2', platform: 'FACEBOOK', accountName: 'Old Page', metadata: null },
      { id: '3', platform: 'INSTAGRAM', accountName: 'clinic.hyd', metadata: '{"linkedPageId":"p9"}' },
    ]);
    const service = new PlatformsService({ platformConnection: { findMany } } as any, {} as any);
    expect(await service.getConnections('u1')).toEqual([
      { id: '1', platform: 'FACEBOOK', accountName: 'Clinic', instagram: 'none' },
      { id: '2', platform: 'FACEBOOK', accountName: 'Old Page', instagram: null },
      { id: '3', platform: 'INSTAGRAM', accountName: 'clinic.hyd' },
    ]);
  });
});
