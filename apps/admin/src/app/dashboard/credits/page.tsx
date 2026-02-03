'use client';

import { useEffect, useState } from 'react';
import { creditsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  TrendingUp,
  AlertTriangle,
  Activity,
  Users,
} from 'lucide-react';

interface CreditStats {
  overview: {
    totalCreditsAllocated: number;
    totalCreditsRemaining: number;
    totalCreditsUsed: number;
    overallUtilization: number;
    criticalUsersCount: number;
  };
  byTier: {
    tier: string;
    count: number;
    creditsAllocated: number;
    creditsRemaining: number;
    creditsUsed: number;
    utilization: number;
  }[];
  recentTransactions: {
    id: string;
    type: string;
    amount: number;
    balance: number;
    description: string | null;
    createdAt: string;
    user: {
      id: string;
      email: string;
      name: string;
    };
  }[];
}

interface SubscriptionUtilization {
  id: string;
  userId: string;
  tier: string;
  status: string;
  creditsTotal: number;
  creditsRemaining: number;
  creditsUsed: number;
  percentUsed: number;
  currentPeriodEnd: string;
  user: {
    id: string;
    email: string;
    name: string;
    status: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CreditsPage() {
  const [stats, setStats] = useState<CreditStats | null>(null);
  const [utilization, setUtilization] = useState<SubscriptionUtilization[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [tierFilter, setTierFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [pagination.page, tierFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, utilizationRes] = await Promise.all([
        creditsApi.getStats(),
        creditsApi.getUtilization({
          page: pagination.page,
          limit: pagination.limit,
          tier: tierFilter || undefined,
        }),
      ]);
      setStats(statsRes.data);
      setUtilization(utilizationRes.data.subscriptions);
      setPagination(utilizationRes.data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load credit data');
    } finally {
      setIsLoading(false);
    }
  };

  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getUtilizationBadge = (percent: number) => {
    if (percent >= 90) return <Badge variant="destructive">Critical</Badge>;
    if (percent >= 70) return <Badge variant="warning">Warning</Badge>;
    return <Badge variant="success">Healthy</Badge>;
  };

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      STARTER: 'bg-blue-100 text-blue-800',
      PROFESSIONAL: 'bg-purple-100 text-purple-800',
      BUSINESS: 'bg-amber-100 text-amber-800',
      ENTERPRISE: 'bg-emerald-100 text-emerald-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[tier] || 'bg-gray-100 text-gray-800'}`}>
        {tier}
      </span>
    );
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Credit Utilization</h1>
        <p className="text-muted-foreground">
          Monitor credit usage and utilization across all subscribers
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Allocated</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.overview.totalCreditsAllocated)}</p>
                </div>
                <Zap className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Used</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.overview.totalCreditsUsed)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Remaining</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.overview.totalCreditsRemaining)}</p>
                </div>
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Utilization Rate</p>
                  <p className="text-2xl font-bold">{stats.overview.overallUtilization}%</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">%</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical Users</p>
                  <p className="text-2xl font-bold text-red-600">{stats.overview.criticalUsersCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Utilization by Tier */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Utilization by Subscription Tier</CardTitle>
            <CardDescription>Credit allocation and usage breakdown by plan tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.byTier.map((tier) => (
                <div key={tier.tier} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTierBadge(tier.tier)}
                      <span className="text-sm text-muted-foreground">
                        {tier.count} subscribers
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{formatNumber(tier.creditsUsed)}</span>
                      <span className="text-muted-foreground"> / {formatNumber(tier.creditsAllocated)}</span>
                      <span className="ml-2 font-medium">({tier.utilization}%)</span>
                    </div>
                  </div>
                  <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getUtilizationColor(tier.utilization)} transition-all duration-500`}
                      style={{ width: `${Math.min(tier.utilization, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscriber Utilization Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscriber Credit Usage</CardTitle>
              <CardDescription>Individual subscriber credit utilization (sorted by lowest remaining)</CardDescription>
            </div>
            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Tiers</option>
              <option value="STARTER">Starter</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="BUSINESS">Business</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscriber</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Credits Used</TableHead>
                    <TableHead>Credits Remaining</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Period Ends</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {utilization.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sub.user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {sub.user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getTierBadge(sub.tier)}</TableCell>
                      <TableCell>
                        <span className="font-medium">{formatNumber(sub.creditsUsed)}</span>
                        <span className="text-muted-foreground"> / {formatNumber(sub.creditsTotal)}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${sub.creditsRemaining < sub.creditsTotal * 0.1 ? 'text-red-600' : ''}`}>
                          {formatNumber(sub.creditsRemaining)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getUtilizationColor(sub.percentUsed)}`}
                              style={{ width: `${Math.min(sub.percentUsed, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{sub.percentUsed}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{getUtilizationBadge(sub.percentUsed)}</TableCell>
                      <TableCell>{formatDate(sub.currentPeriodEnd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} subscribers
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                    }
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                    disabled={pagination.page === pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      {stats && stats.recentTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Credit Transactions</CardTitle>
            <CardDescription>Latest credit activity across all subscribers</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tx.user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {tx.user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.type === 'USAGE' ? 'secondary' : tx.type === 'SUBSCRIPTION' ? 'success' : 'default'}>
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={tx.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                        {tx.amount > 0 ? '+' : ''}{formatNumber(tx.amount)}
                      </span>
                    </TableCell>
                    <TableCell>{formatNumber(tx.balance)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {tx.description || '-'}
                    </TableCell>
                    <TableCell>{formatDate(tx.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
