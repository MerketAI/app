'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Play,
  Trash2,
  RefreshCw,
  Sparkles,
  Video,
  Loader2,
  AlertCircle,
  Clock,
  Monitor,
  Film,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { videoApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  GENERATING: 'bg-yellow-100 text-yellow-700 animate-pulse',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

const typeLabels: Record<string, string> = {
  PRODUCT_SHOWCASE: 'Product Showcase',
  TESTIMONIAL: 'Testimonial',
  EXPLAINER: 'Explainer',
  SOCIAL_AD: 'Social Ad',
  PROMO: 'Promo',
};

const providerLabels: Record<string, string> = {
  RUNWAY: 'Runway ML',
  HEYGEN: 'HeyGen',
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ['video-project', id],
    queryFn: () => videoApi.getProject(id).then((res) => res.data?.project || res.data),
  });

  // Poll status when generating
  const pollStatus = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await videoApi.checkStatus(id);
        const status = res.data?.status || res.data?.project?.status;
        if (status === 'COMPLETED' || status === 'FAILED') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          queryClient.invalidateQueries({ queryKey: ['video-project', id] });
          if (status === 'COMPLETED') {
            toast.success('Video generation completed!');
          } else {
            toast.error('Video generation failed');
          }
        }
      } catch {
        // Continue polling
      }
    }, 5000);
  }, [id, queryClient]);

  useEffect(() => {
    if (project?.status === 'GENERATING') {
      pollStatus();
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [project?.status, pollStatus]);

  const generateMutation = useMutation({
    mutationFn: () => videoApi.generateVideo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-project', id] });
      toast.success('Video generation started');
      pollStatus();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start generation');
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => videoApi.regenerateVideo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-project', id] });
      toast.success('Video regeneration started');
      pollStatus();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to regenerate');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => videoApi.deleteProject(id),
    onSuccess: () => {
      toast.success('Video project deleted');
      router.push('/dashboard/videos');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete project');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Video className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Project not found</h3>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/videos')}>
          Back to Videos
        </Button>
      </div>
    );
  }

  const settings = project.settings ? (typeof project.settings === 'string' ? JSON.parse(project.settings) : project.settings) : {};

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/videos')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className={cn('text-xs', statusColors[project.status])}>
                {project.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {typeLabels[project.type] || project.type}
              </Badge>
              {project.provider && (
                <Badge variant="outline" className="text-xs">
                  {providerLabels[project.provider] || project.provider}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {project.status === 'DRAFT' && (
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate
            </Button>
          )}
          {(project.status === 'COMPLETED' || project.status === 'FAILED') && (
            <Button
              variant="outline"
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Regenerate
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Video Player / Status */}
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-gray-900">
          {project.status === 'COMPLETED' && project.videoUrl ? (
            <video
              src={project.videoUrl}
              controls
              className="w-full h-full"
              poster={project.thumbnailUrl}
            >
              Your browser does not support the video tag.
            </video>
          ) : project.status === 'GENERATING' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
              <Loader2 className="w-16 h-16 animate-spin text-yellow-400" />
              <div className="text-center">
                <h3 className="text-xl font-medium">Generating your video...</h3>
                <p className="text-gray-400 mt-1">
                  This may take a few minutes. Status is checked automatically.
                </p>
              </div>
            </div>
          ) : project.status === 'FAILED' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
              <AlertCircle className="w-16 h-16 text-red-400" />
              <div className="text-center">
                <h3 className="text-xl font-medium">Generation Failed</h3>
                <p className="text-gray-400 mt-1">
                  {project.errorMessage || 'An error occurred during video generation.'}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => regenerateMutation.mutate()}
                disabled={regenerateMutation.isPending}
              >
                {regenerateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Regenerate
              </Button>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Video className="w-16 h-16 text-gray-600" />
              <p className="text-gray-500">Draft - Not yet generated</p>
            </div>
          )}
        </div>
      </Card>

      {/* Project Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Film className="w-4 h-4" />
              Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Type</span>
              <span className="text-sm font-medium">{typeLabels[project.type] || project.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Provider</span>
              <span className="text-sm font-medium">
                {providerLabels[project.provider] || project.provider || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <Badge variant="secondary" className={cn('text-xs', statusColors[project.status])}>
                {project.status}
              </Badge>
            </div>
            {project.duration && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Duration</span>
                <span className="text-sm font-medium">{formatDuration(project.duration)}</span>
              </div>
            )}
            {settings.aspectRatio && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Aspect Ratio</span>
                <span className="text-sm font-medium">{settings.aspectRatio}</span>
              </div>
            )}
            {settings.style && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Style</span>
                <span className="text-sm font-medium">{settings.style}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Prompt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-md p-3 whitespace-pre-wrap">
              {project.prompt || 'No prompt provided'}
            </p>
          </CardContent>
        </Card>
      </div>

      {project.scriptContent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Script
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-md p-3 whitespace-pre-wrap">
              {project.scriptContent}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
