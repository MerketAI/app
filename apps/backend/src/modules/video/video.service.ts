import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CredentialsService } from '../credentials/credentials.service';
import { HeygenProvider } from './providers/heygen.provider';
import { RunwayProvider } from './providers/runway.provider';
import {
  CreateVideoDto,
  UpdateVideoDto,
  VideoFilterDto,
} from './dto/video.dto';

const VideoStatus = {
  DRAFT: 'DRAFT',
  GENERATING: 'GENERATING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

const CREDIT_ACTION = 'VIDEO_GENERATE';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private prisma: PrismaService,
    private heygenProvider: HeygenProvider,
    private runwayProvider: RunwayProvider,
    private subscriptionsService: SubscriptionsService,
    private credentialsService: CredentialsService,
  ) {}

  async createProject(userId: string, dto: CreateVideoDto) {
    let parsedSettings = {};
    if (dto.settings) {
      try {
        parsedSettings = JSON.parse(dto.settings);
      } catch {
        throw new BadRequestException('Invalid settings JSON');
      }
    }

    return this.prisma.videoProject.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        provider: dto.provider || 'RUNWAY',
        status: VideoStatus.DRAFT,
        prompt: dto.prompt,
        scriptContent: dto.scriptContent,
        settings: JSON.stringify(parsedSettings),
      },
    });
  }

  async getProjects(userId: string, filters: VideoFilterDto) {
    const { type, status, provider, limit = 20, offset = 0 } = filters;

    const where: any = { userId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (provider) where.provider = provider;

    const [projects, total] = await Promise.all([
      this.prisma.videoProject.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.videoProject.count({ where }),
    ]);

    return { projects, total, limit, offset };
  }

  async getProjectById(userId: string, id: string) {
    const project = await this.prisma.videoProject.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Video project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return project;
  }

  async updateProject(userId: string, id: string, dto: UpdateVideoDto) {
    const project = await this.getProjectById(userId, id);

    if (
      project.status === VideoStatus.GENERATING
    ) {
      throw new BadRequestException(
        'Cannot update a project while video is generating',
      );
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.prompt !== undefined) updateData.prompt = dto.prompt;
    if (dto.scriptContent !== undefined)
      updateData.scriptContent = dto.scriptContent;
    if (dto.settings !== undefined) {
      try {
        JSON.parse(dto.settings);
      } catch {
        throw new BadRequestException('Invalid settings JSON');
      }
      updateData.settings = dto.settings;
    }

    return this.prisma.videoProject.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteProject(userId: string, id: string) {
    const project = await this.getProjectById(userId, id);

    if (project.status === VideoStatus.GENERATING) {
      throw new BadRequestException(
        'Cannot delete a project while video is generating',
      );
    }

    await this.prisma.videoProject.delete({ where: { id } });

    return { message: 'Video project deleted successfully' };
  }

  async generateVideo(userId: string, projectId: string) {
    const project = await this.getProjectById(userId, projectId);

    if (project.status === VideoStatus.GENERATING) {
      throw new BadRequestException('Video is already generating');
    }

    if (!project.prompt && !project.scriptContent) {
      throw new BadRequestException(
        'Project must have a prompt or script content before generating',
      );
    }

    // Consume credits
    await this.subscriptionsService.consumeCredits(
      userId,
      CREDIT_ACTION,
      projectId,
    );

    let settings: any = {};
    try {
      settings = JSON.parse(project.settings || '{}');
    } catch {
      // ignore parse errors, use defaults
    }

    try {
      let jobId: string;

      if (project.provider === 'HEYGEN') {
        const result = await this.heygenProvider.createVideo({
          script: project.scriptContent || project.prompt || '',
          avatarId: settings.avatarId,
          voiceId: settings.voiceId,
          aspectRatio: settings.aspectRatio,
        });
        jobId = result.jobId;
      } else {
        const result = await this.runwayProvider.createVideo({
          prompt: project.prompt || project.scriptContent || '',
          duration: settings.duration,
          aspectRatio: settings.aspectRatio,
          imageUrl: settings.imageUrl,
        });
        jobId = result.jobId;
      }

      const updated = await this.prisma.videoProject.update({
        where: { id: projectId },
        data: {
          status: VideoStatus.GENERATING,
          providerJobId: jobId,
          creditsConsumed: 30,
          errorMessage: null,
          videoUrl: null,
          thumbnailUrl: null,
        },
      });

      return updated;
    } catch (error) {
      this.logger.error(
        `Video generation failed for project ${projectId}`,
        error,
      );

      // Refund credits on failure to start
      await this.subscriptionsService.refundCredits(
        userId,
        30,
        'Video generation failed to start',
      );

      await this.prisma.videoProject.update({
        where: { id: projectId },
        data: {
          status: VideoStatus.FAILED,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw new BadRequestException('Failed to start video generation');
    }
  }

  async checkStatus(userId: string, projectId: string) {
    const project = await this.getProjectById(userId, projectId);

    if (project.status !== VideoStatus.GENERATING) {
      return project;
    }

    if (!project.providerJobId) {
      throw new BadRequestException('No provider job ID found');
    }

    try {
      let providerStatus: {
        status: string;
        videoUrl?: string;
        thumbnailUrl?: string;
        duration?: number;
      };

      if (project.provider === 'HEYGEN') {
        providerStatus = await this.heygenProvider.checkStatus(
          project.providerJobId,
        );
      } else {
        providerStatus = await this.runwayProvider.checkStatus(
          project.providerJobId,
        );
      }

      if (providerStatus.status === 'COMPLETED') {
        return this.prisma.videoProject.update({
          where: { id: projectId },
          data: {
            status: VideoStatus.COMPLETED,
            videoUrl: providerStatus.videoUrl,
            thumbnailUrl: providerStatus.thumbnailUrl || null,
            duration: providerStatus.duration || null,
          },
        });
      } else if (providerStatus.status === 'FAILED') {
        return this.prisma.videoProject.update({
          where: { id: projectId },
          data: {
            status: VideoStatus.FAILED,
            errorMessage: 'Video generation failed at provider',
          },
        });
      }

      // Still generating
      return project;
    } catch (error) {
      this.logger.error(
        `Status check failed for project ${projectId}`,
        error,
      );
      throw new BadRequestException('Failed to check video generation status');
    }
  }

  async regenerateVideo(userId: string, projectId: string) {
    const project = await this.getProjectById(userId, projectId);

    if (project.status === VideoStatus.GENERATING) {
      throw new BadRequestException(
        'Cannot regenerate while video is still generating',
      );
    }

    // Reset project state
    await this.prisma.videoProject.update({
      where: { id: projectId },
      data: {
        status: VideoStatus.DRAFT,
        providerJobId: null,
        videoUrl: null,
        thumbnailUrl: null,
        duration: null,
        errorMessage: null,
      },
    });

    // Generate again
    return this.generateVideo(userId, projectId);
  }

  async getProviders() {
    const [heygenAvailable, runwayAvailable] = await Promise.all([
      this.heygenProvider.isAvailable(),
      this.runwayProvider.isAvailable(),
    ]);

    return {
      providers: [
        {
          name: 'RUNWAY',
          displayName: 'Runway ML',
          description:
            'AI-powered video generation from text prompts and images',
          available: runwayAvailable,
          supportedTypes: [
            'PRODUCT_SHOWCASE',
            'EXPLAINER',
            'SOCIAL_AD',
            'PROMO',
          ],
        },
        {
          name: 'HEYGEN',
          displayName: 'HeyGen',
          description:
            'AI avatar-based video generation with text-to-speech',
          available: heygenAvailable,
          supportedTypes: [
            'TESTIMONIAL',
            'EXPLAINER',
            'PRODUCT_SHOWCASE',
            'PROMO',
          ],
        },
      ],
    };
  }
}
