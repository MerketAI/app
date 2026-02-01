'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import {
  Instagram,
  Facebook,
  FileText,
  Link2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { platformsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn, formatDateTime } from '@/lib/utils';

const platformConfig: Record<string, { name: string; icon: any; color: string; description: string }> = {
  INSTAGRAM: {
    name: 'Instagram',
    icon: Instagram,
    color: 'from-purple-500 to-pink-500',
    description: 'Connect your Instagram Business account to publish posts and stories',
  },
  FACEBOOK: {
    name: 'Facebook',
    icon: Facebook,
    color: 'from-blue-600 to-blue-500',
    description: 'Connect your Facebook Pages to publish posts and manage engagement',
  },
  WORDPRESS: {
    name: 'WordPress',
    icon: FileText,
    color: 'from-blue-400 to-blue-600',
    description: 'Connect your WordPress site to publish blog articles',
  },
  GOOGLE_ADS: {
    name: 'Google Ads',
    icon: ExternalLink,
    color: 'from-red-500 to-yellow-500',
    description: 'Connect Google Ads to manage your advertising campaigns',
  },
};

const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
  CONNECTED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  DISCONNECTED: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle },
  EXPIRED: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: RefreshCw },
  ERROR: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
};

export default function PlatformsPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Show toast for OAuth callback results
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success) {
      toast({
        title: 'Platform Connected',
        description: `Successfully connected to ${success}`,
      });
    } else if (error) {
      toast({
        title: 'Connection Failed',
        description: `Failed to connect to ${error}`,
        variant: 'destructive',
      });
    }
  }, [searchParams, toast]);

  const { data: connections, isLoading } = useQuery({
    queryKey: ['platform-connections'],
    queryFn: () => platformsApi.getConnections().then((res) => res.data),
  });

  const connectMetaMutation = useMutation({
    mutationFn: () => platformsApi.getMetaAuthUrl(),
    onSuccess: (response) => {
      window.location.href = response.data.url;
    },
    onError: () => {
      toast({
        title: 'Connection Failed',
        description: 'Failed to initiate Meta connection',
        variant: 'destructive',
      });
    },
  });

  const connectGoogleMutation = useMutation({
    mutationFn: () => platformsApi.getGoogleAuthUrl(),
    onSuccess: (response) => {
      window.location.href = response.data.url;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => platformsApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-connections'] });
      toast({ title: 'Platform disconnected' });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => platformsApi.testConnection(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['platform-connections'] });
      toast({
        title: response.data.status === 'connected' ? 'Connection Working' : 'Connection Issue',
        description: response.data.message,
        variant: response.data.status === 'connected' ? 'default' : 'destructive',
      });
    },
  });

  const groupedConnections = connections?.reduce((acc: any, conn: any) => {
    if (!acc[conn.platform]) acc[conn.platform] = [];
    acc[conn.platform].push(conn);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Connected Platforms</h1>
        <p className="text-gray-500 mt-1">Manage your social media and publishing connections</p>
      </div>

      {/* Available Platforms */}
      <Card>
        <CardHeader>
          <CardTitle>Connect New Platform</CardTitle>
          <CardDescription>Add new platforms to publish your content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Meta (Instagram + Facebook) */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Instagram className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium">Meta</h3>
                  <p className="text-xs text-gray-500">Instagram & Facebook</p>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={() => connectMetaMutation.mutate()}
                disabled={connectMetaMutation.isPending}
              >
                <Link2 className="w-4 h-4 mr-2" />
                Connect
              </Button>
            </div>

            {/* Google */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-yellow-500 flex items-center justify-center">
                  <ExternalLink className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium">Google</h3>
                  <p className="text-xs text-gray-500">Ads & Business</p>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={() => connectGoogleMutation.mutate()}
                disabled={connectGoogleMutation.isPending}
              >
                <Link2 className="w-4 h-4 mr-2" />
                Connect
              </Button>
            </div>

            {/* WordPress */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium">WordPress</h3>
                  <p className="text-xs text-gray-500">Blog Publishing</p>
                </div>
              </div>
              <Button size="sm" className="w-full" variant="outline" disabled>
                Coming Soon
              </Button>
            </div>

            {/* More platforms */}
            <div className="p-4 border rounded-lg border-dashed">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400 text-xl">+</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-500">More Platforms</h3>
                  <p className="text-xs text-gray-400">Coming soon</p>
                </div>
              </div>
              <Button size="sm" className="w-full" variant="ghost" disabled>
                Request Integration
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Your active platform connections</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : connections && connections.length > 0 ? (
            <div className="space-y-4">
              {connections.map((connection: any) => {
                const config = platformConfig[connection.platform];
                const status = statusColors[connection.status];
                const StatusIcon = status?.icon || CheckCircle;

                return (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn('w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center', config?.color || 'from-gray-400 to-gray-500')}>
                        {config?.icon && <config.icon className="w-6 h-6 text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{connection.accountName || config?.name}</h3>
                          <span className={cn('px-2 py-0.5 text-xs rounded-full flex items-center gap-1', status?.bg, status?.text)}>
                            <StatusIcon className="w-3 h-3" />
                            {connection.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {config?.name} • Connected {formatDateTime(connection.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testMutation.mutate(connection.id)}
                        disabled={testMutation.isPending}
                      >
                        <RefreshCw className={cn('w-4 h-4', testMutation.isPending && 'animate-spin')} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => disconnectMutation.mutate(connection.id)}
                        disabled={disconnectMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No platforms connected yet</p>
              <p className="text-sm text-gray-400">Connect a platform above to start publishing</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
