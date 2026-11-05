import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface RenderResult {
  buffer: Buffer;
  /** 'puppeteer' is a real render; 'placeholder' means no browser was available. */
  renderer: 'puppeteer' | 'placeholder';
  contentType: string;
  extension: string;
  warning?: string;
}

@Injectable()
export class RendererService {
  private readonly logger = new Logger(RendererService.name);
  private resolvedExecutablePath: string | null | undefined;

  async renderToImage(
    html: string,
    width: number,
    height: number,
    format: 'png' | 'pdf' = 'png',
  ): Promise<RenderResult> {
    // Dynamic import so the app still builds and boots without Puppeteer.
    let puppeteer: any;
    try {
      puppeteer = await (Function('return import("puppeteer")')() as Promise<any>);
      puppeteer = puppeteer.default ?? puppeteer;
    } catch (error) {
      return this.placeholder(
        width,
        height,
        'Puppeteer is not installed on the server. Run "npm install puppeteer" in apps/backend.',
        error as Error,
      );
    }

    let browser: any;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
        ...(this.executablePath() ? { executablePath: this.executablePath() } : {}),
      });
    } catch (error) {
      // A missing or half-extracted Chromium download is the common cause. Degrade
      // to a placeholder rather than returning a 500 from an otherwise valid request.
      return this.placeholder(
        width,
        height,
        'No usable Chromium was found. Run "npx puppeteer browsers install chrome" in apps/backend, or set PUPPETEER_EXECUTABLE_PATH to an existing Chrome binary.',
        error as Error,
      );
    }

    try {
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

      // Webfonts loaded via @import resolve after networkidle0, so wait for them
      // or the render can capture fallback typography.
      await page
        .evaluate(() => (document as any).fonts?.ready)
        .catch(() => undefined);

      // Templates may expose a fit hook. Run it only once text metrics are
      // final, i.e. after the fonts above have settled.
      const fit = await page
        .evaluate(() => {
          const w = window as any;
          return typeof w.__fitDesign === 'function' ? w.__fitDesign() : null;
        })
        .catch(() => null);

      if (fit && fit.fitted === false) {
        this.logger.warn(
          `Design content still overflows at zoom ${fit.zoom}; it will be clipped.`,
        );
      }

      if (format === 'pdf') {
        const pdfBuffer = await page.pdf({
          width: `${width}px`,
          height: `${height}px`,
          printBackground: true,
        });
        return {
          buffer: Buffer.from(pdfBuffer),
          renderer: 'puppeteer',
          contentType: 'application/pdf',
          extension: 'pdf',
        };
      }

      const screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width, height },
      });
      return {
        buffer: Buffer.from(screenshotBuffer),
        renderer: 'puppeteer',
        contentType: 'image/png',
        extension: 'png',
      };
    } finally {
      await browser.close().catch(() => undefined);
    }
  }

  /**
   * Chrome to launch, in order of preference:
   *
   *   1. PUPPETEER_EXECUTABLE_PATH - required in slim Docker images, and the
   *      escape hatch when the pinned build will not download.
   *   2. The newest Chrome already in Puppeteer's cache. Puppeteer pins one exact
   *      build and refuses to start without it, but any recent Chrome renders
   *      these designs identically, so a near-miss version should not be fatal.
   *   3. Undefined - let Puppeteer resolve its own pinned download.
   */
  private executablePath(): string | undefined {
    if (this.resolvedExecutablePath !== undefined) {
      return this.resolvedExecutablePath ?? undefined;
    }

    const configured = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (configured && existsSync(configured)) {
      this.resolvedExecutablePath = configured;
      return configured;
    }

    this.resolvedExecutablePath = this.findCachedChrome();
    if (this.resolvedExecutablePath) {
      this.logger.log(`Using cached Chrome at ${this.resolvedExecutablePath}`);
    }
    return this.resolvedExecutablePath ?? undefined;
  }

  private findCachedChrome(): string | null {
    const cacheRoot =
      process.env.PUPPETEER_CACHE_DIR || join(homedir(), '.cache', 'puppeteer');
    const chromeRoot = join(cacheRoot, 'chrome');
    if (!existsSync(chromeRoot)) return null;

    const candidates: { dir: string; version: number[] }[] = [];
    for (const entry of readdirSync(chromeRoot)) {
      for (const binary of [
        join(chromeRoot, entry, 'chrome-win64', 'chrome.exe'),
        join(chromeRoot, entry, 'chrome-linux64', 'chrome'),
        join(
          chromeRoot,
          entry,
          'chrome-mac-x64',
          'Google Chrome for Testing.app',
          'Contents',
          'MacOS',
          'Google Chrome for Testing',
        ),
        join(
          chromeRoot,
          entry,
          'chrome-mac-arm64',
          'Google Chrome for Testing.app',
          'Contents',
          'MacOS',
          'Google Chrome for Testing',
        ),
      ]) {
        if (existsSync(binary)) {
          const version = (entry.split('-')[1] || '')
            .split('.')
            .map((n) => Number(n) || 0);
          candidates.push({ dir: binary, version });
          break;
        }
      }
    }

    if (candidates.length === 0) return null;

    // Newest first.
    candidates.sort((a, b) => {
      for (let i = 0; i < 4; i++) {
        const diff = (b.version[i] ?? 0) - (a.version[i] ?? 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });

    return candidates[0].dir;
  }

  private placeholder(
    width: number,
    height: number,
    warning: string,
    error?: Error,
  ): RenderResult {
    this.logger.error(
      `${warning}${error ? ` (${error.message.split('\n')[0]})` : ''}`,
    );
    return {
      buffer: Buffer.from(this.generatePlaceholderSvg(width, height), 'utf-8'),
      renderer: 'placeholder',
      contentType: 'image/svg+xml',
      extension: 'svg',
      warning,
    };
  }

  private generatePlaceholderSvg(width: number, height: number): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#f4f4f5"/>
      <text x="50%" y="48%" font-family="Arial, sans-serif" font-size="${Math.round(width / 28)}" fill="#71717a"
            text-anchor="middle" dominant-baseline="middle">
        Preview unavailable (${width}x${height})
      </text>
      <text x="50%" y="56%" font-family="Arial, sans-serif" font-size="${Math.round(width / 46)}" fill="#a1a1aa"
            text-anchor="middle" dominant-baseline="middle">
        No renderer available on the server
      </text>
    </svg>`;
  }
}
