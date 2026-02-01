'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';

interface DashboardStats {
  overview: {
    totalContent: number;
    publishedThisMonth: number;
    scheduledContent: number;
    creditsRemaining: number;
    creditsTotal: number;
  };
  engagement: {
    period: string;
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
  };
  contentBreakdown: Array<{
    type: string;
    count: number;
  }>;
  subscription: {
    tier: string;
    renewsAt: string;
  } | null;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get('/analytics/dashboard');
        setStats(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600">Track your content performance and engagement metrics</p>
      </div>

      {/* Engagement Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Engagement Overview ({stats?.engagement.period})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">
              {stats?.engagement.impressions.toLocaleString() || 0}
            </p>
            <p className="text-sm text-gray-600">Impressions</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {stats?.engagement.reach.toLocaleString() || 0}
            </p>
            <p className="text-sm text-gray-600">Reach</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">
              {stats?.engagement.likes.toLocaleString() || 0}
            </p>
            <p className="text-sm text-gray-600">Likes</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">
              {stats?.engagement.comments.toLocaleString() || 0}
            </p>
            <p className="text-sm text-gray-600">Comments</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              {stats?.engagement.shares.toLocaleString() || 0}
            </p>
            <p className="text-sm text-gray-600">Shares</p>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <p className="text-2xl font-bold text-indigo-600">
              {stats?.engagement.clicks.toLocaleString() || 0}
            </p>
            <p className="text-sm text-gray-600">Clicks</p>
          </div>
        </div>
      </div>

      {/* Content Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Content Breakdown</h2>
        {stats?.contentBreakdown && stats.contentBreakdown.length > 0 ? (
          <div className="space-y-3">
            {stats.contentBreakdown.map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <span className="text-gray-700">{item.type.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          (item.count / (stats.overview.totalContent || 1)) * 100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No content created yet</p>
        )}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Content</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {stats?.overview.totalContent || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Published This Month</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {stats?.overview.publishedThisMonth || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Scheduled</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {stats?.overview.scheduledContent || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Credits Remaining</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {stats?.overview.creditsRemaining || 0}
            <span className="text-sm text-gray-400 font-normal">
              /{stats?.overview.creditsTotal || 0}
            </span>
          </p>
        </div>
      </div>

      {/* Subscription Info */}
      {stats?.subscription && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Current Plan: {stats.subscription.tier}</h3>
              <p className="text-blue-100">
                Renews on {new Date(stats.subscription.renewsAt).toLocaleDateString()}
              </p>
            </div>
            <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
              Upgrade Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
