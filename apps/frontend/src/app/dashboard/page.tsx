'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  FileText,
  Clock,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { analyticsApi, contentApi } from '@/lib/api';
import { formatNumber, formatDateTime } from '@/lib/utils';

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => analyticsApi.getDashboard().then((res) => res.data),
  });

  const { data: scheduled } = useQuery({
    queryKey: ['scheduled-content'],
    queryFn: () => contentApi.getScheduled().then((res) => res.data),
  });

  const { data: trending } = useQuery({
    queryKey: ['trending-topics'],
    queryFn: () => contentApi.getTrending().then((res) => res.data),
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here&apos;s your marketing overview.</p>
        </div>
        <Link href="/dashboard/content/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Content
          </Button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Content</p>
                <p className="text-3xl font-bold">{stats?.overview?.totalContent || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Published This Month</p>
                <p className="text-3xl font-bold">{stats?.overview?.publishedThisMonth || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Scheduled</p>
                <p className="text-3xl font-bold">{stats?.overview?.scheduledContent || 0}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Credits Remaining</p>
                <p className="text-3xl font-bold">{stats?.overview?.creditsRemaining || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-bold">CR</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement stats */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold">{formatNumber(stats?.engagement?.impressions || 0)}</p>
              <p className="text-sm text-gray-500">Impressions</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-pink-100 rounded-full flex items-center justify-center mb-2">
                <Heart className="w-5 h-5 text-pink-600" />
              </div>
              <p className="text-2xl font-bold">{formatNumber(stats?.engagement?.likes || 0)}</p>
              <p className="text-sm text-gray-500">Likes</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold">{formatNumber(stats?.engagement?.comments || 0)}</p>
              <p className="text-sm text-gray-500">Comments</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold">{formatNumber(stats?.engagement?.shares || 0)}</p>
              <p className="text-sm text-gray-500">Shares</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Scheduled content */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Scheduled</CardTitle>
            <Link href="/dashboard/content?status=scheduled">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {scheduled && scheduled.length > 0 ? (
              <div className="space-y-4">
                {scheduled.slice(0, 5).map((content: any) => (
                  <div key={content.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{content.title || content.caption?.substring(0, 40) + '...' || 'Untitled'}</p>
                      <p className="text-sm text-gray-500">
                        {content.connection?.platform} - {formatDateTime(content.scheduledAt)}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                      Scheduled
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No scheduled content</p>
            )}
          </CardContent>
        </Card>

        {/* Trending topics */}
        <Card>
          <CardHeader>
            <CardTitle>Trending Topics</CardTitle>
          </CardHeader>
          <CardContent>
            {trending && trending.length > 0 ? (
              <div className="space-y-3">
                {trending.slice(0, 5).map((topic: any, index: number) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold mr-3">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{topic.topic}</p>
                        <p className="text-xs text-gray-500">{topic.category}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {topic.hashtags?.slice(0, 2).map((tag: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Loading trending topics...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
