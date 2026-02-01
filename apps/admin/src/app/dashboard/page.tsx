'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { Users, CreditCard, IndianRupee, TrendingUp, FileText } from 'lucide-react';

interface Stats {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    newThisWeek: number;
  };
  subscriptions: {
    total: number;
    byTier: { tier: string; count: number }[];
  };
  revenue: {
    total: number;
    thisMonth: number;
  };
  content: {
    total: number;
    published: number;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await adminApi.getStats();
      setStats(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        {error}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: formatNumber(stats?.users.total || 0),
      icon: Users,
      description: `${stats?.users.newThisWeek || 0} new this week`,
    },
    {
      title: 'Active Users',
      value: formatNumber(stats?.users.active || 0),
      icon: TrendingUp,
      description: 'Users with active status',
    },
    {
      title: 'Total Subscriptions',
      value: formatNumber(stats?.subscriptions.total || 0),
      icon: CreditCard,
      description: 'All subscriptions',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats?.revenue.total || 0),
      icon: IndianRupee,
      description: `${formatCurrency(stats?.revenue.thisMonth || 0)} this month`,
    },
    {
      title: 'Content Created',
      value: formatNumber(stats?.content.total || 0),
      icon: FileText,
      description: `${stats?.content.published || 0} published`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your application metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subscriptions by Tier */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions by Tier</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.subscriptions.byTier && stats.subscriptions.byTier.length > 0 ? (
            <div className="space-y-3">
              {stats.subscriptions.byTier.map((tier) => {
                const maxCount = Math.max(...stats.subscriptions.byTier.map((t) => t.count));
                return (
                  <div key={tier.tier} className="flex items-center">
                    <div className="w-28 text-sm font-medium">
                      {tier.tier}
                    </div>
                    <div className="flex-1">
                      <div
                        className="h-6 rounded bg-primary flex items-center px-2"
                        style={{
                          width: `${Math.max((tier.count / maxCount) * 100, 10)}%`,
                        }}
                      >
                        <span className="text-xs text-white font-medium">
                          {tier.count}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground">No subscriptions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
