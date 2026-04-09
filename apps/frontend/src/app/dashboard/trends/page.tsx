'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  TrendingUp,
  RefreshCw,
  Briefcase,
  Lightbulb,
  ArrowRight,
  Globe,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { trendsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CATEGORIES = [
  'All',
  'Technology',
  'Business',
  'Marketing',
  'Lifestyle',
  'Finance',
  'Health',
];

const categoryColors: Record<string, string> = {
  Technology: 'bg-blue-100 text-blue-700',
  Business: 'bg-purple-100 text-purple-700',
  Marketing: 'bg-pink-100 text-pink-700',
  Lifestyle: 'bg-orange-100 text-orange-700',
  Finance: 'bg-emerald-100 text-emerald-700',
  Health: 'bg-red-100 text-red-700',
};

const contentTypeColors: Record<string, string> = {
  Blog: 'bg-blue-100 text-blue-700',
  'Instagram Post': 'bg-pink-100 text-pink-700',
  'Twitter Thread': 'bg-sky-100 text-sky-700',
  'LinkedIn Post': 'bg-indigo-100 text-indigo-700',
  'Facebook Post': 'bg-blue-100 text-blue-700',
  Video: 'bg-red-100 text-red-700',
  Newsletter: 'bg-amber-100 text-amber-700',
};

function ScoreBar({ score }: { score: number }) {
  const maxScore = 100;
  const percentage = Math.min((score / maxScore) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            percentage >= 75
              ? 'bg-green-500'
              : percentage >= 50
              ? 'bg-yellow-500'
              : percentage >= 25
              ? 'bg-orange-500'
              : 'bg-red-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{score}</span>
    </div>
  );
}

function RelevanceIndicator({ relevance }: { relevance: number }) {
  const dots = 5;
  const filled = Math.round((relevance / 100) * dots);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: dots }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-2 h-2 rounded-full',
            i < filled ? 'bg-primary' : 'bg-gray-200'
          )}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{relevance}%</span>
    </div>
  );
}

function LoadingSection() {
  return (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export default function TrendsPage() {
  const [categoryFilter, setCategoryFilter] = useState('All');
  const queryClient = useQueryClient();

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['trends', categoryFilter],
    queryFn: () =>
      trendsApi
        .getTrends({
          category: categoryFilter !== 'All' ? categoryFilter : undefined,
          limit: 20,
        })
        .then((res) => res.data),
  });

  const { data: industryData, isLoading: industryLoading } = useQuery({
    queryKey: ['industry-trends'],
    queryFn: () => trendsApi.getIndustryTrends().then((res) => res.data),
  });

  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['trend-suggestions'],
    queryFn: () => trendsApi.getContentSuggestions().then((res) => res.data),
  });

  const syncMutation = useMutation({
    mutationFn: () => trendsApi.syncTrends(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trends'] });
      queryClient.invalidateQueries({ queryKey: ['industry-trends'] });
      queryClient.invalidateQueries({ queryKey: ['trend-suggestions'] });
      toast.success('Trends refreshed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to refresh trends');
    },
  });

  const trends = trendsData?.trends || trendsData || [];
  const industryTrends = industryData?.trends || industryData || [];
  const suggestions = suggestionsData?.suggestions || suggestionsData || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Trending Topics</h1>
          <p className="text-gray-500 mt-1">
            Discover what is trending and get AI-powered content ideas
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', syncMutation.isPending && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Category Filter Tabs */}
      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <TabsList>
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Section 1: Trending Now */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Trending Now</h2>
        </div>

        {trendsLoading ? (
          <LoadingSection />
        ) : trends.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...trends]
              .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
              .map((trend: any) => (
                <Card key={trend.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-sm line-clamp-2">{trend.topic || trend.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {trend.category && (
                        <Badge
                          variant="secondary"
                          className={cn('text-xs', categoryColors[trend.category] || 'bg-gray-100 text-gray-700')}
                        >
                          {trend.category}
                        </Badge>
                      )}
                      {trend.region && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {trend.region}
                        </span>
                      )}
                    </div>
                    {trend.score !== undefined && <ScoreBar score={trend.score} />}
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingUp className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No trending topics found</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                Refresh Trends
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Section 2: Industry Trends */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Industry Trends</h2>
        </div>

        {industryLoading ? (
          <LoadingSection />
        ) : industryTrends.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {industryTrends.map((trend: any) => (
              <Card key={trend.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-sm">{trend.topic || trend.name}</h3>
                    {trend.category && (
                      <Badge
                        variant="secondary"
                        className={cn('text-xs ml-2 shrink-0', categoryColors[trend.category] || 'bg-gray-100 text-gray-700')}
                      >
                        {trend.category}
                      </Badge>
                    )}
                  </div>
                  {trend.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{trend.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Relevance</span>
                    <RelevanceIndicator relevance={trend.relevance || trend.score || 0} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No industry trends available</p>
              <p className="text-xs text-gray-400 mt-1">
                Industry trends are based on your profile settings
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Section 3: Content Suggestions */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Content Suggestions</h2>
        </div>

        {suggestionsLoading ? (
          <LoadingSection />
        ) : suggestions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestions.map((suggestion: any, index: number) => (
              <Card key={suggestion.id || index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-medium text-sm">{suggestion.topic}</h3>

                  <div className="flex flex-wrap gap-2">
                    {suggestion.contentType && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-xs',
                          contentTypeColors[suggestion.contentType] || 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {suggestion.contentType}
                      </Badge>
                    )}
                    {suggestion.platform && (
                      <Badge variant="outline" className="text-xs">
                        {suggestion.platform}
                      </Badge>
                    )}
                  </div>

                  {suggestion.reason && (
                    <p className="text-xs text-gray-500 line-clamp-2">{suggestion.reason}</p>
                  )}

                  <Link
                    href={`/dashboard/content/create?topic=${encodeURIComponent(suggestion.topic)}`}
                  >
                    <Button variant="outline" size="sm" className="w-full mt-1">
                      Create Content
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Lightbulb className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No content suggestions yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Suggestions are generated based on current trends
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
