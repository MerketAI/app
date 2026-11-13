import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as sharp from 'sharp';
import { LibraryService } from '../library/library.service';
import { fetchInputImage } from './designer.service';

/** Reels and stories are 9:16. */
export const REEL = { width: 1080, height: 1920, fps: 30 };
const MAX_IMAGES = 6;
const FADE = 0.6;

export interface ReelInput {
  /** 1-6 finished images (story-size renders look best), in order. */
  imageUrls: string[];
  /** Seconds each image stays on screen (2-8, default 4). */
  secondsPerImage?: number;
  folder?: string;
  title?: string;
  tags?: string[];
  notes?: string;
}

export interface ReelResult {
  url: string;
  libraryId: string;
  width: number;
  height: number;
  seconds: number;
  images: number;
}

/** Seconds a reel lasts: each image's time, less the overlap of each crossfade. */
export function reelSeconds(images: number, perImage: number): number {
  return Math.round((images * perImage - (images - 1) * FADE) * 10) / 10;
}

/**
 * The ffmpeg filter graph: each still gets a slow push-in (alternating centre and
 * a slight drift so consecutive images don't move identically), then the clips are
 * joined with crossfades. Images are upscaled before zoompan to avoid its jitter.
 */
export function reelFilter(images: number, perImage: number): string {
  const frames = Math.round(perImage * REEL.fps);
  const parts: string[] = [];
  for (let i = 0; i < images; i++) {
    const x = i % 2 === 0 ? "iw/2-(iw/zoom/2)" : "iw/2-(iw/zoom/2)+on*0.15";
    parts.push(
      `[${i}:v]scale=${REEL.width * 2}:${REEL.height * 2},zoompan=z='min(1+0.0009*on,1.12)':x='${x}':y='ih/2-(ih/zoom/2)':d=${frames}:s=${REEL.width}x${REEL.height}:fps=${REEL.fps},setsar=1,format=yuv420p[v${i}]`,
    );
  }
  if (images === 1) {
    parts.push('[v0]fade=t=in:st=0:d=0.4,fade=t=out:st=' + (perImage - 0.5).toFixed(2) + ':d=0.5[out]');
    return parts.join(';');
  }
  let last = 'v0';
  for (let i = 1; i < images; i++) {
    const offset = (i * perImage - i * FADE).toFixed(2);
    const label = i === images - 1 ? 'mix' : `x${i}`;
    parts.push(`[${last}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${offset}[${label}]`);
    last = label;
  }
  const total = reelSeconds(images, perImage);
  parts.push(`[mix]fade=t=in:st=0:d=0.4,fade=t=out:st=${(total - 0.5).toFixed(2)}:d=0.5[out]`);
  return parts.join(';');
}

/**
 * Short vertical videos (Reels, Stories, WhatsApp status) made from finished post
 * images: a gentle push-in on each, crossfades between them, a silent audio track
 * (some players reject video with none) and H.264 with faststart so it streams.
 */
@Injectable()
export class ReelService {
  private readonly logger = new Logger(ReelService.name);

  constructor(private library: LibraryService) {}

  private ffmpegPath(): string {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = process.env.FFMPEG_PATH || (require('ffmpeg-static') as string);
    if (!path) throw new BadRequestException('Video making is not available on this server (ffmpeg missing).');
    return path;
  }

  async create(userId: string, input: ReelInput): Promise<ReelResult> {
    const urls = (input.imageUrls || []).filter(Boolean).slice(0, MAX_IMAGES);
    if (!urls.length) throw new BadRequestException('A reel needs at least one image.');
    const perImage = Math.min(8, Math.max(2, Number(input.secondsPerImage) || 4));

    const dir = await fs.mkdtemp(join(tmpdir(), 'reel-'));
    try {
      // Each image fills 9:16: a blurred, darkened copy behind it, the image whole on top.
      const frames: string[] = [];
      for (const [i, url] of urls.entries()) {
        // Print flyers (A4 at 300 dpi) run past the designer's 8 MB cap; a reel needs the detail.
        const source = await fetchInputImage(url, { maxBytes: 30 * 1048576, maxSide: 2400 });
        const background = await sharp(source).resize(REEL.width, REEL.height, { fit: 'cover' }).blur(40).modulate({ brightness: 0.7 }).toBuffer();
        const front = await sharp(source).resize(REEL.width, REEL.height, { fit: 'inside' }).toBuffer();
        const file = join(dir, `${i}.png`);
        await sharp(background).composite([{ input: front, gravity: 'centre' }]).png().toFile(file);
        frames.push(file);
      }

      const out = join(dir, 'reel.mp4');
      const seconds = reelSeconds(frames.length, perImage);
      const args = [
        '-y',
        ...frames.flatMap((f) => ['-loop', '1', '-framerate', String(REEL.fps), '-t', String(perImage), '-i', f]),
        '-f', 'lavfi', '-t', String(seconds), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-filter_complex', reelFilter(frames.length, perImage),
        '-map', '[out]', '-map', `${frames.length}:a`,
        '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(REEL.fps),
        '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart',
        out,
      ];
      await this.run(args);
      const buffer = await fs.readFile(out);
      const asset = await this.library.store(
        userId,
        { buffer, mimeType: 'video/mp4', extension: 'mp4', name: `reel-${input.title || 'post'}` },
        {
          kind: 'post',
          folder: input.folder,
          title: `${input.title || 'Reel'} (reel, ${seconds}s)`,
          tags: [...(input.tags || []), 'reel', 'video'],
          notes: input.notes,
          source: 'reel',
          width: REEL.width,
          height: REEL.height,
          durationMs: Math.round(seconds * 1000),
          metadata: { reel: true, seconds, images: urls },
        },
      );
      this.logger.log(`Reel ${seconds}s from ${frames.length} image(s) for ${userId}`);
      return { url: asset.url, libraryId: asset.id, width: REEL.width, height: REEL.height, seconds, images: frames.length };
    } finally {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private run(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.ffmpegPath(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let err = '';
      child.stderr.on('data', (d) => (err = (err + d.toString()).slice(-4000)));
      const timer = setTimeout(() => child.kill('SIGKILL'), 3 * 60 * 1000);
      child.on('error', (e) => { clearTimeout(timer); reject(e); });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) return resolve();
        this.logger.warn(`ffmpeg failed (${code}): ${err.split('\n').slice(-6).join(' | ')}`);
        reject(new BadRequestException('The reel could not be made from those images.'));
      });
    });
  }
}
