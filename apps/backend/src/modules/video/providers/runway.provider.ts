import { Injectable, Logger } from '@nestjs/common';
import { CredentialsService } from '../../credentials/credentials.service';

export interface RunwayCreateOptions {
  prompt: string;
  duration?: number;
  aspectRatio?: string;
  imageUrl?: string;
}

export interface RunwayStatusResult {
  status: string;
  videoUrl?: string;
  duration?: number;
}

@Injectable()
export class RunwayProvider {
  private readonly logger = new Logger(RunwayProvider.name);
  private readonly apiBaseUrl = 'https://api.dev.runwayml.com/v1';
  private readonly apiVersion = '2024-11-06';

  constructor(private credentialsService: CredentialsService) {}

  async isAvailable(): Promise<boolean> {
    const key = await this.credentialsService.get('RUNWAY_API_KEY');
    return !!key;
  }

  async createVideo(
    options: RunwayCreateOptions,
  ): Promise<{ jobId: string }> {
    const apiKey = await this.credentialsService.get('RUNWAY_API_KEY');
    if (!apiKey) {
      this.logger.warn('RUNWAY_API_KEY not configured, using mock response');
      return { jobId: `mock-runway-${Date.now()}` };
    }

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/image_to_video`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Runway-Version': this.apiVersion,
          },
          body: JSON.stringify({
            model: 'gen3a_turbo',
            promptText: options.prompt,
            duration: options.duration || 5,
            ratio: options.aspectRatio || '16:9',
            ...(options.imageUrl ? { promptImage: options.imageUrl } : {}),
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Runway API error: ${response.status} - ${errorText}`);
        throw new Error(`Runway API returned ${response.status}`);
      }

      const data = await response.json();
      return { jobId: data.id || `mock-runway-${Date.now()}` };
    } catch (error) {
      this.logger.error('Runway createVideo failed', error);
      throw error;
    }
  }

  async checkStatus(jobId: string): Promise<RunwayStatusResult> {
    const apiKey = await this.credentialsService.get('RUNWAY_API_KEY');
    if (!apiKey) {
      return {
        status: 'COMPLETED',
        videoUrl: `https://example.com/videos/${jobId}.mp4`,
        duration: 5,
      };
    }

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/tasks/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'X-Runway-Version': this.apiVersion,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Runway status API error: ${response.status} - ${errorText}`);
        throw new Error(`Runway API returned ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'SUCCEEDED') {
        return {
          status: 'COMPLETED',
          videoUrl: data.output?.[0],
          duration: data.options?.duration || 5,
        };
      } else if (data.status === 'FAILED') {
        return { status: 'FAILED' };
      }

      return { status: 'GENERATING' };
    } catch (error) {
      this.logger.error('Runway checkStatus failed', error);
      throw error;
    }
  }
}
