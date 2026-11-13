import { reelFilter, reelSeconds } from './reel.service';
import { isVideoUrl } from '../publishing/publishing.service';
import { imagesFrom } from '../agent/agent.service';

describe('reels', () => {
  it('counts the crossfade overlap in the length', () => {
    expect(reelSeconds(1, 4)).toBe(4);
    expect(reelSeconds(2, 4)).toBe(7.4);
    expect(reelSeconds(3, 5)).toBe(13.8);
  });

  it('chains a crossfade between every pair of images', () => {
    const graph = reelFilter(3, 4);
    expect(graph.match(/zoompan/g)).toHaveLength(3);
    expect(graph.match(/xfade/g)).toHaveLength(2);
    expect(graph).toContain('offset=3.40');
    expect(graph).toContain('offset=6.80');
    expect(graph.endsWith('[out]')).toBe(true);
  });

  it('fades a single image in and out without crossfades', () => {
    const graph = reelFilter(1, 5);
    expect(graph).not.toContain('xfade');
    expect(graph).toContain('fade=t=out:st=4.50');
  });

  it('publishes video media as a reel or video', () => {
    expect(isVideoUrl('https://x/a/reel-1.mp4')).toBe(true);
    expect(isVideoUrl('https://x/a/post.png')).toBe(false);
    expect(isVideoUrl(undefined)).toBe(false);
  });

  it('shows a reel in the chat with its length', () => {
    expect(imagesFrom({ url: 'https://x/r.mp4', width: 1080, height: 1920, seconds: 7.4 })[0].label).toBe('Reel · 7.4 s');
  });
});
