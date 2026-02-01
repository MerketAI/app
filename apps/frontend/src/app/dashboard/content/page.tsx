'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Send,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { contentApi, publishingApi } from '@/lib/api';
import { formatDateTime, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  READY: 'bg-blue-100 text-blue-700',
  SCHEDULED: 'bg-yellow-100 text-yellow-700',
  PUBLISHING: 'bg-purple-100 text-purple-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

const platformIcons: Record<string, string> = {
  INSTAGRAM_IMAGE: 'IG',
  INSTAGRAM_CAROUSEL: 'IG',
  INSTAGRAM_REEL: 'IG',
  FACEBOOK_IMAGE: 'FB',
  FACEBOOK_VIDEO: 'FB',
  FACEBOOK_LINK: 'FB',
  BLOG_POST: 'Blog',
};

export default function ContentPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['content', search, statusFilter],
    queryFn: () =>
      contentApi.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        limit: 50,
      }).then((res) => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast({ title: 'Content deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => publishingApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast({ title: 'Content published successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Publishing failed',
        description: error.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Content</h1>
          <p className="text-gray-500 mt-1">Manage your marketing content</p>
        </div>
        <Link href="/dashboard/content/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Content
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search content..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="READY">Ready</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="PUBLISHED">Published</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Content list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : data?.contents?.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Content</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Type</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.contents.map((content: any) => (
                  <tr key={content.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center">
                        {content.thumbnailUrl && (
                          <img
                            src={content.thumbnailUrl}
                            alt=""
                            className="w-12 h-12 rounded object-cover mr-3"
                          />
                        )}
                        <div>
                          <p className="font-medium">
                            {content.title || content.caption?.substring(0, 50) + '...' || 'Untitled'}
                          </p>
                          {content.connection && (
                            <p className="text-sm text-gray-500">
                              {content.connection.accountName}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 text-xs bg-gray-100 rounded font-medium">
                        {platformIcons[content.type] || content.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={cn('px-2 py-1 text-xs rounded', statusColors[content.status])}>
                        {content.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {content.publishedAt
                        ? formatDateTime(content.publishedAt)
                        : content.scheduledAt
                        ? formatDateTime(content.scheduledAt)
                        : formatDateTime(content.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/content/${content.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        {content.status === 'DRAFT' || content.status === 'READY' ? (
                          <>
                            <Link href={`/dashboard/content/${content.id}/edit`}>
                              <Button variant="ghost" size="icon">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => publishMutation.mutate(content.id)}
                              disabled={publishMutation.isPending}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </>
                        ) : null}
                        {content.status !== 'PUBLISHED' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(content.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">No content found</p>
              <Link href="/dashboard/content/create">
                <Button className="mt-4">Create your first content</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
