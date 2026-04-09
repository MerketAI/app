'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adsApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatNumber, formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  Rocket,
  Pause,
  Play,
  RefreshCw,
  Eye,
  MousePointerClick,
  BarChart3,
  DollarSign,
  TrendingUp,
  Target,
  Percent,
  Activity,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  campaignType: string;
  budget: number;
  budgetType: string;
  startDate: string;
  endDate?: string;
  targeting?: {
    keywords?: string[];
    locations?: string[];
    ageMin?: number;
    ageMax?: number;
    gender?: string;
  };
  creative?: {
    headlines?: string[];
    descriptions?: string[];
  };
  createdAt: string;
}

interface CampaignMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cost: number;
  conversions: number;
  conversionRate: number;
  roas: number;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
};

const platformLabels: Record<string, string> = {
  GOOGLE_ADS: 'Google Ads',
  META_ADS: 'Meta Ads',
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    fetchCampaign();
    fetchMetrics();
  }, [id]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const response = await adsApi.getCampaign(id);
      setCampaign(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await adsApi.getCampaignMetrics(id);
      setMetrics(response.data);
    } catch {
      // Metrics may not be available for draft campaigns
    }
  };

  const handleLaunch = async () => {
    try {
      setActionLoading(true);
      await adsApi.launchCampaign(id);
      toast.success('Campaign launched successfully');
      fetchCampaign();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to launch campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setActionLoading(true);
      await adsApi.pauseCampaign(id);
      toast.success('Campaign paused');
      fetchCampaign();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to pause campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setActionLoading(true);
      await adsApi.resumeCampaign(id);
      toast.success('Campaign resumed');
      fetchCampaign();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resume campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncMetrics = async () => {
    try {
      setSyncLoading(true);
      await adsApi.syncMetrics(id);
      toast.success('Metrics synced');
      fetchMetrics();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to sync metrics');
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Campaign not found</p>
        <Button className="mt-4" onClick={() => router.push('/dashboard/ads')}>
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const metricsData = [
    { label: 'Impressions', value: formatNumber(metrics?.impressions || 0), icon: Eye, color: 'text-blue-500' },
    { label: 'Clicks', value: formatNumber(metrics?.clicks || 0), icon: MousePointerClick, color: 'text-green-500' },
    { label: 'CTR', value: `${((metrics?.ctr || 0) * 100).toFixed(2)}%`, icon: Percent, color: 'text-purple-500' },
    { label: 'CPC', value: `$${(metrics?.cpc || 0).toFixed(2)}`, icon: DollarSign, color: 'text-orange-500' },
    { label: 'Total Cost', value: `$${(metrics?.cost || 0).toFixed(2)}`, icon: BarChart3, color: 'text-red-500' },
    { label: 'Conversions', value: formatNumber(metrics?.conversions || 0), icon: Target, color: 'text-emerald-500' },
    { label: 'Conv. Rate', value: `${((metrics?.conversionRate || 0) * 100).toFixed(2)}%`, icon: Activity, color: 'text-indigo-500' },
    { label: 'ROAS', value: `${(metrics?.roas || 0).toFixed(2)}x`, icon: TrendingUp, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/ads')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{campaign.name}</h1>
              <span
                className={cn(
                  'px-2.5 py-0.5 text-xs rounded-full font-medium',
                  statusColors[campaign.status] || 'bg-gray-100 text-gray-700'
                )}
              >
                {campaign.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span>{platformLabels[campaign.platform] || campaign.platform}</span>
              <span>-</span>
              <span>{campaign.campaignType?.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {campaign.status === 'DRAFT' && (
            <Button onClick={handleLaunch} disabled={actionLoading}>
              <Rocket className="w-4 h-4 mr-1" />
              Launch
            </Button>
          )}
          {campaign.status === 'ACTIVE' && (
            <Button variant="outline" onClick={handlePause} disabled={actionLoading}>
              <Pause className="w-4 h-4 mr-1" />
              Pause
            </Button>
          )}
          {campaign.status === 'PAUSED' && (
            <Button onClick={handleResume} disabled={actionLoading}>
              <Play className="w-4 h-4 mr-1" />
              Resume
            </Button>
          )}
          {campaign.status !== 'DRAFT' && (
            <Button variant="outline" onClick={handleSyncMetrics} disabled={syncLoading}>
              <RefreshCw className={cn('w-4 h-4 mr-1', syncLoading && 'animate-spin')} />
              Sync Metrics
            </Button>
          )}
        </div>
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <dt className="text-sm text-gray-500">Budget</dt>
                <dd className="text-sm font-medium">
                  ${campaign.budget?.toLocaleString()} {campaign.budgetType === 'DAILY' ? '/ day' : 'lifetime'}
                </dd>
              </div>
              <div className="flex justify-between py-2 border-b">
                <dt className="text-sm text-gray-500">Start Date</dt>
                <dd className="text-sm font-medium">{formatDate(campaign.startDate)}</dd>
              </div>
              {campaign.endDate && (
                <div className="flex justify-between py-2 border-b">
                  <dt className="text-sm text-gray-500">End Date</dt>
                  <dd className="text-sm font-medium">{formatDate(campaign.endDate)}</dd>
                </div>
              )}
              <div className="flex justify-between py-2">
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm font-medium">{formatDate(campaign.createdAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Targeting</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {campaign.targeting?.locations && campaign.targeting.locations.length > 0 && (
                <div className="py-2 border-b">
                  <dt className="text-sm text-gray-500 mb-1">Locations</dt>
                  <dd className="flex flex-wrap gap-1">
                    {campaign.targeting.locations.map((loc, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {loc}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}
              {campaign.targeting?.keywords && campaign.targeting.keywords.length > 0 && (
                <div className="py-2 border-b">
                  <dt className="text-sm text-gray-500 mb-1">Keywords</dt>
                  <dd className="flex flex-wrap gap-1">
                    {campaign.targeting.keywords.map((kw, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <dt className="text-sm text-gray-500">Age Range</dt>
                <dd className="text-sm font-medium">
                  {campaign.targeting?.ageMin || 18} - {campaign.targeting?.ageMax || 65}
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-sm text-gray-500">Gender</dt>
                <dd className="text-sm font-medium">{campaign.targeting?.gender || 'All'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Creative */}
      {campaign.creative && (
        <Card>
          <CardHeader>
            <CardTitle>Ad Creative</CardTitle>
          </CardHeader>
          <CardContent>
            {campaign.creative.headlines && campaign.creative.headlines.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Headlines</p>
                <div className="space-y-1">
                  {campaign.creative.headlines.map((h, i) => (
                    <p key={i} className="text-sm font-medium">{h}</p>
                  ))}
                </div>
              </div>
            )}
            {campaign.creative.descriptions && campaign.creative.descriptions.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Descriptions</p>
                <div className="space-y-1">
                  {campaign.creative.descriptions.map((d, i) => (
                    <p key={i} className="text-sm text-gray-700">{d}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      {metrics && (
        <>
          <h2 className="text-xl font-semibold">Performance Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metricsData.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn('w-4 h-4', m.color)} />
                      <span className="text-sm text-gray-500">{m.label}</span>
                    </div>
                    <p className="text-2xl font-bold">{m.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
