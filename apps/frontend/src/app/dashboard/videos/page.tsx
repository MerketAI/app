'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Plus,
  Video,
  Play,
  Trash2,
  Eye,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { videoApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const VIDEO_TYPES = [
  { value: 'PRODUCT_SHOWCASE', label: 'Product Showcase' },
  { value: 'TESTIMONIAL', label: 'Testimonial' },
  { value: 'EXPLAINER', label: 'Explainer' },
  { value: 'SOCIAL_AD', label: 'Social Ad' },
  { value: 'PROMO', label: 'Promo' },
];

const VIDEO_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'GENERATING', label: 'Generating' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
];

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  GENERATING: 'bg-yellow-100 text-yellow-700 animate-pulse',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

const typeColors: Record<string, string> = {
  PRODUCT_SHOWCASE: 'bg-blue-100 text-blue-700',
  TESTIMONIAL: 'bg-purple-100 text-purple-700',
  EXPLAINER: 'bg-indigo-100 text-indigo-700',
  SOCIAL_AD: 'bg-pink-100 text-pink-700',
  PROMO: 'bg-orange-100 text-orange-700',
};

const providerColors: Record<string, string> = {
  RUNWAY: 'bg-emerald-100 text-emerald-700',
  HEYGEN: 'bg-cyan-100 text-cyan-700',
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `0:${secs.toString().padStart(2, '0')}`;
}

function formatType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function VideosPage() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['video-projects', typeFilter, statusFilter],
    queryFn: () =>
      videoApi
        .getProjects({
          type: typeFilter !== 'all' ? typeFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          limit: 50,
        })
        .then((res) => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => videoApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-projects'] });
      toast.success('Video project deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete project');
    },
  });

  const checkStatusMutation = useMutation({
    mutationFn: (id: string) => videoApi.checkStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-projects'] });
      toast.success('Status updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to check status');
    },
  });

  const projects = data?.projects || data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Video Projects</h1>
          <p className="text-gray-500 mt-1">Create and manage AI-generated videos</p>
        </div>
        <Link href="/dashboard/videos/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Video
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {VIDEO_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {VIDEO_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: any) => (
            <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Thumbnail / Preview */}
              <div className="relative aspect-video bg-gray-100">
                {project.status === 'COMPLETED' && project.thumbnailUrl ? (
                  <>
                    <img
                      src={project.thumbnailUrl}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                    <Link
                      href={`/dashboard/videos/${project.id}`}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="w-6 h-6 text-gray-900 ml-0.5" />
                      </div>
                    </Link>
                    {project.duration && (
                      <span className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-0.5 rounded">
                        {formatDuration(project.duration)}
                      </span>
                    )}
                  </>
                ) : project.status === 'GENERATING' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                    <p className="text-sm text-gray-500">Generating video...</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => checkStatusMutation.mutate(project.id)}
                      disabled={checkStatusMutation.isPending}
                    >
                      <RefreshCw className={cn('w-3 h-3 mr-1', checkStatusMutation.isPending && 'animate-spin')} />
                      Check Status
                    </Button>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="w-12 h-12 text-gray-300" />
                  </div>
                )}
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-1">{project.name}</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className={cn('text-xs', typeColors[project.type] || 'bg-gray-100 text-gray-700')}
                  >
                    {formatType(project.type)}
                  </Badge>
                  {project.provider && (
                    <Badge
                      variant="secondary"
                      className={cn('text-xs', providerColors[project.provider] || 'bg-gray-100 text-gray-700')}
                    >
                      {project.provider === 'RUNWAY' ? 'Runway ML' : 'HeyGen'}
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className={cn('text-xs', statusColors[project.status])}
                  >
                    {project.status}
                  </Badge>
                </div>

                <div className="flex justify-end gap-1">
                  <Link href={`/dashboard/videos/${project.id}`}>
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(project.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Video className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No video projects yet</h3>
          <p className="text-gray-500 mb-4">Create your first AI-generated video project</p>
          <Link href="/dashboard/videos/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Video
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
