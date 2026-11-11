import { CREATIVE_SPECS, CreativeSpecError, familyOf, orientationOf, ratioOf, resolveSpec, SIZE_LIMITS, specCatalogue } from './creative-specs';

describe('creative specs', () => {
  it('has unique ids, valid sizes and consistent derived fields', () => {
    const ids = CREATIVE_SPECS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of CREATIVE_SPECS) {
      expect(s.width).toBeGreaterThanOrEqual(SIZE_LIMITS.min);
      expect(s.height).toBeGreaterThanOrEqual(SIZE_LIMITS.min - 10); // LinkedIn's 191px cover is the one exception
      expect(s.width).toBeLessThanOrEqual(SIZE_LIMITS.max);
      expect(s.family).toBe(familyOf(s.width, s.height));
      expect(s.orientation).toBe(orientationOf(s.width, s.height));
      if (s.safe) {
        expect(s.safe.left + s.safe.right).toBeLessThan(s.width / 2);
        expect(s.safe.top + s.safe.bottom).toBeLessThan(s.height);
      }
    }
  });

  it('covers the main categories and social platforms', () => {
    const tree = specCatalogue();
    expect(Object.keys(tree)).toEqual(expect.arrayContaining(['social', 'website', 'email', 'blog', 'ads', 'print']));
    expect(Object.keys(tree.social)).toEqual(expect.arrayContaining(['instagram', 'facebook', 'x', 'linkedin', 'whatsapp', 'youtube']));
  });

  it('reads ratios the way people write them', () => {
    expect(ratioOf(1080, 1350)).toBe('4:5');
    expect(ratioOf(1080, 1920)).toBe('9:16');
    expect(ratioOf(1600, 900)).toBe('16:9');
    expect(ratioOf(1200, 627)).toBe('1.91:1');
  });

  it('maps ratios to layout families', () => {
    expect(familyOf(1080, 1920)).toBe('story');
    expect(familyOf(1080, 1350)).toBe('portrait');
    expect(familyOf(1080, 1080)).toBe('square');
    expect(familyOf(1200, 630)).toBe('landscape');
    expect(familyOf(1920, 600)).toBe('banner');
  });

  describe('resolveSpec', () => {
    it('resolves ids, legacy formats and platform defaults, defaulting to the Instagram 4:5 post', () => {
      expect(resolveSpec({ spec: 'web-hero' })).toMatchObject({ width: 1920, height: 600, category: 'website' });
      expect(resolveSpec({ spec: 'story' }).id).toBe('instagram-story');
      expect(resolveSpec({ platform: 'linkedin' }).id).toBe('linkedin-feed-square');
      expect(resolveSpec({ platform: 'Twitter' }).id).toBe('x-post');
      expect(resolveSpec().id).toBe('instagram-feed-portrait');
    });

    it('takes an exact custom size, reusing a known spec when one matches', () => {
      expect(resolveSpec({ width: 1080, height: 1920 }).id).toBe('instagram-story');
      expect(resolveSpec({ width: 1200, height: 1500 })).toMatchObject({ id: 'custom-1200x1500', ratio: '4:5', family: 'portrait' });
    });

    it('rejects unknown ids and unusable sizes', () => {
      expect(() => resolveSpec({ spec: 'tiktok-video' })).toThrow(CreativeSpecError);
      expect(() => resolveSpec({ width: 100, height: 100 })).toThrow('between');
      expect(() => resolveSpec({ width: 5000, height: 1000 })).toThrow('between');
      expect(() => resolveSpec({ width: 3000, height: 300 })).toThrow('narrow');
      expect(() => resolveSpec({ width: 1080 })).toThrow('both');
    });
  });
});
