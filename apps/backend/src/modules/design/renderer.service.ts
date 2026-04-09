import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RendererService {
  private readonly logger = new Logger(RendererService.name);

  async renderToImage(
    html: string,
    width: number,
    height: number,
    format: 'png' | 'pdf' = 'png',
  ): Promise<Buffer> {
    // Dynamic import to avoid build errors when puppeteer is not installed
    let puppeteer: any;
    try {
      puppeteer = await (Function('return import("puppeteer")')() as Promise<any>);
    } catch {
      this.logger.warn(
        'Puppeteer is not installed. Returning placeholder. Install with: npm install puppeteer',
      );
      return Buffer.from(
        this.generatePlaceholderSvg(width, height),
        'utf-8',
      );
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width, height });
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

      if (format === 'pdf') {
        const pdfBuffer = await page.pdf({
          width: `${width}px`,
          height: `${height}px`,
          printBackground: true,
        });
        return Buffer.from(pdfBuffer);
      }

      const screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width, height },
      });
      return Buffer.from(screenshotBuffer);
    } finally {
      await browser.close();
    }
  }

  private generatePlaceholderSvg(width: number, height: number): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" font-family="Arial" font-size="24" fill="#999"
            text-anchor="middle" dominant-baseline="middle">
        Design Preview (${width}x${height})
      </text>
    </svg>`;
  }
}
