'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adsApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn, formatNumber, formatDate } from '@/lib/utils';
import {
  Plus,
  Megaphone,
  Pause,
  Play,
  BarChart3,
  DollarSign,
  MousePointerClick,
  Eye,
  Trash2,
  Search,
  Rocket,
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
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cost?: number;
  conversions?: number;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
};

const platformColors: Record<string, string> = {
  GOOGLE_ADS: 'bg-blue-100 text-blue-700',
  META_ADS: 'bg-purple-100 text-purple-700',
};

const platformLabels: Record<string, string> = {
  GOOGLE_ADS: 'Google Ads',
  META_ADS: 'Meta Ads',
};

export default function AdsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, [platformFilter, statusFilter]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await adsApi.getCampaigns({
        platform: platformFilter || undefined,
        status: statusFilter || undefined,
        limit: 50,
      });
      setCampaigns(response.data.campaigns || response.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async (id: string) => {
    try {
      setActionLoading(id);
      await adsApi.launchCampaign(id);
      toast.success('Campaign launched successfully');
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to launch campaign');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async (id: string) => {
    try {
      setActionLoading(id);
      await adsApi.pauseCampaign(id);
      toast.success('Campaign paused');
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to pause campaign');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (id: string) => {
    try {
      setActionLoading(id);
      await adsApi.resumeCampaign(id);
      toast.success('Campaign resumed');
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resume campaign');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      setActionLoading(id);
      await adsApi.deleteCampaign(id);
      toast.success('Campaign deleted');
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete campaign');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ads Manager</h1>
          <p className="text-gray-500 mt-1">Create and manage your ad campaigns</p>
        </div>
        <Link href="/dashboard/ads/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
        >
          <option value="">All Platforms</option>
          <option value="GOOGLE_ADS">Google Ads</option>
          <option value="META_ADS">Meta Ads</option>
        </select>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Megaphone className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No campaigns yet</h3>
            <p className="text-gray-400 mb-4 text-center max-w-md">
              Create your first ad campaign to start reaching your audience on Google Ads or Meta Ads.
            </p>
            <Link href="/dashboard/ads/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  {/* Campaign Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold truncate">{campaign.name}</h3>
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs rounded-full font-medium',
                          platformColors[campaign.platform] || 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {platformLabels[campaign.platform] || campaign.platform}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs rounded-full font-medium',
                          statusColors[campaign.status] || 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {campaign.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{campaign.campaignType?.replace(/_/g, ' ')}</span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        ${campaign.budget?.toLocaleString()} {campaign.budgetType === 'DAILY' ? '/day' : 'total'}
                      </span>
                      <span>{formatDate(campaign.startDate)}{campaign.endDate ? ` - ${formatDate(campaign.endDate)}` : ''}</span>
                    </div>

                    {/* Metrics Row */}
                    {(campaign.status === 'ACTIVE' || campaign.status === 'PAUSED' || campaign.status === 'COMPLETED') && (
                      <div className="flex items-center gap-6 mt-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Eye className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{formatNumber(campaign.impressions || 0)}</span>
                          <span className="text-gray-400">impressions</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <MousePointerClick className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{formatNumber(campaign.clicks || 0)}</span>
                          <span className="text-gray-400">clicks</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <BarChart3 className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{((campaign.ctr || 0) * 100).toFixed(2)}%</span>
                          <span className="text-gray-400">CTR</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">${(campaign.cost || 0).toFixed(2)}</span>
                          <span className="text-gray-400">spent</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {campaign.status === 'DRAFT' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLaunch(campaign.id)}
                        disabled={actionLoading === campaign.id}
                      >
                        <Rocket className="w-4 h-4 mr-1" />
                        Launch
                      </Button>
                    )}
                    {campaign.status === 'ACTIVE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePause(campaign.id)}
                        disabled={actionLoading === campaign.id}
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </Button>
                    )}
                    {campaign.status === 'PAUSED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResume(campaign.id)}
                        disabled={actionLoading === campaign.id}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Resume
                      </Button>
                    )}
                    <Link href={`/dashboard/ads/${campaign.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                    </Link>
                    {campaign.status === 'DRAFT' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(campaign.id)}
                        disabled={actionLoading === campaign.id}
                        className="text-red-500 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
