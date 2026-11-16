import { PublishingService } from './publishing.service';
import { PlatformsService, LINKEDIN_SCOPES } from '../platforms/platforms.service';

const post = (mediaUrls: string[]) => ({
  id: 'c1',
  userId: 'u1',
  type: 'LINKEDIN_POST',
  title: 'Winter asthma',
  caption: 'In my clinic I see more asthma flares in winter.',
  body: null,
  seoTitle: null,
  seoDescription: null,
  mediaUrls,
  hashtags: ['asthma'],
  seoKeywords: [],
});
const connection = { accessToken: 'tok', accountId: 'abc123' };

describe('LinkedIn', () => {
  const realFetch = global.fetch;
  afterEach(() => (global.fetch = realFetch));
  const service = new PublishingService({} as any, {} as any);

  it('uploads each picture and shares the returned asset, not the URL', async () => {
    const calls: { url: string; init?: any }[] = [];
    global.fetch = jest.fn(async (url: string, init?: any) => {
      calls.push({ url, init });
      if (url.includes('registerUpload')) {
        return {
          ok: true,
          json: async () => ({
            value: {
              asset: 'urn:li:digitalmediaAsset:A1',
              uploadMechanism: { 'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': { uploadUrl: 'https://upload.linkedin/x' } },
            },
          }),
        } as any;
      }
      if (url === 'https://cdn/post.png') {
        return { ok: true, headers: new Map([['content-type', 'image/png']]), arrayBuffer: async () => new ArrayBuffer(4) } as any;
      }
      if (url === 'https://upload.linkedin/x') return { ok: true, status: 201 } as any;
      if (url.endsWith('/v2/ugcPosts')) {
        return { ok: true, headers: new Map([['x-restli-id', 'urn:li:share:99']]), json: async () => ({ id: 'urn:li:share:99' }) } as any;
      }
      throw new Error(`unexpected fetch ${url}`);
    }) as any;

    const result = await service.publishToLinkedIn(post(['https://cdn/post.png']) as any, connection);
    expect(result).toMatchObject({ success: true, platformPostId: '99' });
    const share = JSON.parse(calls.find((c) => c.url.endsWith('/v2/ugcPosts'))!.init.body);
    const content = share.specificContent['com.linkedin.ugc.ShareContent'];
    expect(share.author).toBe('urn:li:person:abc123');
    expect(content.shareMediaCategory).toBe('IMAGE');
    expect(content.media).toEqual([{ status: 'READY', media: 'urn:li:digitalmediaAsset:A1', title: { text: 'Winter asthma' } }]);
    expect(content.shareCommentary.text).toContain('#asthma');
    expect(calls.find((c) => c.url === 'https://upload.linkedin/x')!.init.method).toBe('PUT');
  });

  it('posts text alone without uploading', async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (url.endsWith('/v2/ugcPosts')) return { ok: true, headers: new Map(), json: async () => ({ id: 'urn:li:share:7' }) } as any;
      throw new Error(`unexpected fetch ${url}`);
    }) as any;
    const result = await service.publishToLinkedIn(post([]) as any, connection);
    expect(result).toMatchObject({ success: true, platformPostId: '7' });
  });

  it('refuses a video post', async () => {
    global.fetch = jest.fn() as any;
    const result = await service.publishToLinkedIn(post(['https://cdn/reel.mp4']) as any, connection);
    expect(result.success).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('asks only for sign-in and posting, never the retired r_liteprofile', async () => {
    const platforms = new PlatformsService({} as any, { get: async () => 'client' } as any);
    const url = new URL(await platforms.getLinkedInAuthUrl('https://x/cb', 's'));
    expect(url.searchParams.get('scope')).toBe('openid profile w_member_social');
    expect(LINKEDIN_SCOPES).not.toContain('r_liteprofile');
  });
});
