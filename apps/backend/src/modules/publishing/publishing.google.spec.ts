import { PublishingService, googlePostText } from './publishing.service';
import { GoogleConnectError, PlatformsService } from '../platforms/platforms.service';

const json = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body }) as any;

describe('Google Business Profile', () => {
  const realFetch = global.fetch;
  afterEach(() => (global.fetch = realFetch));

  it('turns the booking line into the button and drops links and hashtags from the text', () => {
    const { summary, link } = googlePostText(
      'Child fever check-ups in Kondapur this winter.\n\nMost fevers settle in a few days.\n\nBook: https://quickcare.life/x?utm_source=google #ChildHealth #Hyderabad',
    );
    expect(link).toBe('https://quickcare.life/x?utm_source=google');
    expect(summary).toBe('Child fever check-ups in Kondapur this winter.\n\nMost fevers settle in a few days.');
  });

  it('posts to the location with the picture and a Book button', async () => {
    const calls: { url: string; init?: any }[] = [];
    global.fetch = jest.fn(async (url: string, init?: any) => {
      calls.push({ url, init });
      return json({ name: 'accounts/1/locations/2/localPosts/9', searchUrl: 'https://local.google.com/place?id=9' });
    }) as any;
    const platforms = { freshAccessToken: jest.fn(async () => 'tok') } as any;
    const service = new PublishingService({} as any, {} as any, platforms);
    const result = await service.publishToGoogleBusiness(
      {
        caption: 'Winter asthma clinic in Kondapur.\nBook: https://quickcare.life/b?utm_source=google',
        body: null,
        mediaUrls: ['https://cdn/post.png'],
        hashtags: [],
      } as any,
      { accountId: 'accounts/1/locations/2' },
    );
    expect(result).toMatchObject({ success: true, platformPostUrl: 'https://local.google.com/place?id=9' });
    expect(calls[0].url).toBe('https://mybusiness.googleapis.com/v4/accounts/1/locations/2/localPosts');
    expect(JSON.parse(calls[0].init.body)).toEqual({
      languageCode: 'en',
      topicType: 'STANDARD',
      summary: 'Winter asthma clinic in Kondapur.',
      media: [{ mediaFormat: 'PHOTO', sourceUrl: 'https://cdn/post.png' }],
      callToAction: { actionType: 'BOOK', url: 'https://quickcare.life/b?utm_source=google' },
    });
  });

  it("reports Google's own error", async () => {
    global.fetch = jest.fn(async () => json({ error: { message: 'Google My Business API has not been used in project' } }, false, 403)) as any;
    const service = new PublishingService({} as any, {} as any, { freshAccessToken: async () => 'tok' } as any);
    const result = await service.publishToGoogleBusiness({ caption: 'Hi', body: null, mediaUrls: [], hashtags: [] } as any, { accountId: 'accounts/1/locations/2' });
    expect(result).toEqual({ success: false, error: 'Google My Business API has not been used in project' });
  });

  describe('connect', () => {
    const credentials = { get: async (k: string) => (k === 'GOOGLE_CLIENT_ID' ? 'client' : 'secret') };
    const upsert = jest.fn(async ({ create }) => create);
    const service = new PlatformsService({ platformConnection: { upsert } } as any, credentials as any);
    afterEach(() => upsert.mockClear());

    const routes = (locations: unknown[]) =>
      jest.fn(async (url: string) => {
        if (url.includes('oauth2.googleapis.com/token')) return json({ access_token: 'a', refresh_token: 'r', expires_in: 3600 });
        if (url.includes('/v1/accounts?')) return json({ accounts: [{ name: 'accounts/1' }] });
        if (url.includes('/v1/accounts/1/locations')) return json({ locations });
        throw new Error(`unexpected fetch ${url}`);
      }) as any;

    it('saves each location as a connection named with its city', async () => {
      global.fetch = routes([
        { name: 'locations/2', title: 'Docty Clinics', storefrontAddress: { locality: 'Hyderabad' }, websiteUri: 'https://doctyclinics.care/' },
      ]);
      const { connections } = await service.handleGoogleBusinessCallback('u1', 'code', 'https://x/cb');
      expect(connections).toHaveLength(1);
      expect(connections[0]).toMatchObject({
        platform: 'GOOGLE_MY_BUSINESS',
        accountId: 'accounts/1/locations/2',
        accountName: 'Docty Clinics (Hyderabad)',
        refreshToken: 'r',
      });
    });

    it('fails with no-locations when the account manages none', async () => {
      global.fetch = routes([]);
      const err = await service.handleGoogleBusinessCallback('u1', 'code', 'https://x/cb').catch((e) => e);
      expect(err).toBeInstanceOf(GoogleConnectError);
      expect(err.reason).toBe('no-locations');
      expect(upsert).not.toHaveBeenCalled();
    });

    it('asks only to manage Business Profiles, offline', async () => {
      const url = new URL(await service.getGoogleBusinessAuthUrl('https://x/cb', 's'));
      expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/business.manage');
      expect(url.searchParams.get('access_type')).toBe('offline');
    });
  });
});
