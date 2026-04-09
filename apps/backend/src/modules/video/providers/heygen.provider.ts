import { Injectable, Logger } from '@nestjs/common';
import { CredentialsService } from '../../credentials/credentials.service';

export interface HeygenCreateOptions {
  script: string;
  avatarId?: string;
  voiceId?: string;
  aspectRatio?: string;
}

export interface HeygenStatusResult {
  status: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
}

@Injectable()
export class HeygenProvider {
  private readonly logger = new Logger(HeygenProvider.name);

  constructor(private credentialsService: CredentialsService) {}

  async isAvailable(): Promise<boolean> {
    const key = await this.credentialsService.get('HEYGEN_API_KEY');
    return !!key;
  }

  async createVideo(
    options: HeygenCreateOptions,
  ): Promise<{ jobId: string }> {
    const apiKey = await this.credentialsService.get('HEYGEN_API_KEY');
    if (!apiKey) {
      this.logger.warn('HEYGEN_API_KEY not configured, using mock response');
      return this.mockCreateVideo();
    }

    try {
      const dimension =
        options.aspectRatio === '9:16'
          ? { width: 1080, height: 1920 }
          : { width: 1920, height: 1080 };

      const response = await fetch(
        'https://api.heygen.com/v2/video/generate',
        {
          method: 'POST',
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_inputs: [
              {
                character: {
                  type: 'avatar',
                  avatar_id: options.avatarId || 'default',
                },
                voice: {
                  type: 'text',
                  input_text: options.script,
                  voice_id: options.voiceId || 'default',
                },
              },
            ],
            dimension,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`HeyGen API error: ${response.status} - ${errorText}`);
        throw new Error(`HeyGen API returned ${response.status}`);
      }

      const data = await response.json();
      return { jobId: data.data?.video_id || `mock-heygen-${Date.now()}` };
    } catch (error) {
      this.logger.error('HeyGen createVideo failed', error);
      throw error;
    }
  }

  async checkStatus(jobId: string): Promise<HeygenStatusResult> {
    const apiKey = await this.credentialsService.get('HEYGEN_API_KEY');
    if (!apiKey) {
      return this.mockCheckStatus(jobId);
    }

    try {
      const response = await fetch(
        `https://api.heygen.com/v1/video_status.get?video_id=${jobId}`,
        {
          headers: { 'X-Api-Key': apiKey },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`HeyGen status API error: ${response.status} - ${errorText}`);
        throw new Error(`HeyGen API returned ${response.status}`);
      }

      const data = await response.json();

      if (data.data?.status === 'completed') {
        return {
          status: 'COMPLETED',
          videoUrl: data.data.video_url,
          thumbnailUrl: data.data.thumbnail_url,
          duration: data.data.duration,
        };
      } else if (data.data?.status === 'failed') {
        return { status: 'FAILED' };
      }

      return { status: 'GENERATING' };
    } catch (error) {
      this.logger.error('HeyGen checkStatus failed', error);
      throw error;
    }
  }

  private mockCreateVideo(): { jobId: string } {
    return { jobId: `mock-heygen-${Date.now()}` };
  }

  private mockCheckStatus(jobId: string): HeygenStatusResult {
    return {
      status: 'COMPLETED',
      videoUrl: `https://example.com/videos/${jobId}.mp4`,
      thumbnailUrl: `https://example.com/thumbnails/${jobId}.jpg`,
      duration: 30,
    };
  }
}
