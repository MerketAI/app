'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Globe,
  Linkedin,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  MapPin,
  Loader2,
  CheckCircle,
  Link as LinkIcon,
} from 'lucide-react';
import { aiScraperApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Provider {
  name: string;
  displayName: string;
  description: string;
  available: boolean;
  reason?: string;
}

interface BusinessScanModalProps {
  open: boolean;
  onClose: () => void;
  onDataScanned: (data: any) => void;
}

const URL_TYPES = [
  { id: 'website', label: 'Website', icon: Globe, placeholder: 'https://example.com' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/company/...' },
  { id: 'google_my_business', label: 'Google Business', icon: MapPin, placeholder: 'Google Maps URL or Business Name' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/...' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/...' },
  { id: 'twitter', label: 'Twitter/X', icon: Twitter, placeholder: 'https://twitter.com/...' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/...' },
];

const CREDIT_COSTS = {
  single: 8,
  auto: 15,
};

export function BusinessScanModal({
  open,
  onClose,
  onDataScanned,
}: BusinessScanModalProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('auto');
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('website');
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (open) {
      loadProviders();
    }
  }, [open]);

  const loadProviders = async () => {
    setLoadingProviders(true);
    try {
      const response = await aiScraperApi.getProviders();
      setProviders(response.data.providers || []);
      setSelectedProvider(response.data.defaultProvider || 'auto');
    } catch {
      setProviders([
        { name: 'auto', displayName: 'Auto - Let AI Choose', description: 'Uses multiple providers', available: true },
        { name: 'perplexity', displayName: 'Perplexity AI', description: 'Real-time web search', available: false, reason: 'API key not configured' },
        { name: 'firecrawl', displayName: 'Firecrawl + Claude', description: 'Deep website scraping', available: false, reason: 'API key not configured' },
      ]);
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleUrlChange = (type: string, value: string) => {
    setUrlInputs(prev => ({ ...prev, [type]: value }));
  };

  const getActiveUrl = () => {
    return urlInputs[activeTab] || '';
  };

  const handleScan = async () => {
    const url = getActiveUrl();
    if (!url) {
      toast.error('Please enter a URL to scan');
      return;
    }

    setIsScanning(true);
    try {
      const response = await aiScraperApi.scanBusinessUrl({
        provider: selectedProvider,
        url,
        urlType: activeTab as any,
      });

      if (response.data?.success) {
        const scannedData = response.data.data?.data || response.data.data;
        onDataScanned(scannedData);
        toast.success(`Business data scanned! ${response.data.creditsUsed} credits used.`);
        onClose();
      } else {
        toast.error(response.data?.error || 'Failed to scan URL');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to scan URL');
    } finally {
      setIsScanning(false);
    }
  };

  const creditCost = selectedProvider === 'auto' ? CREDIT_COSTS.auto : CREDIT_COSTS.single;
  const hasUrl = !!getActiveUrl();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Scan Business Profile with AI
          </DialogTitle>
          <DialogDescription>
            Enter your business URL, LinkedIn, Google My Business, or social media links to automatically extract company information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* URL Input Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 lg:grid-cols-7">
              {URL_TYPES.map((type) => {
                const Icon = type.icon;
                const hasValue = !!urlInputs[type.id];
                return (
                  <TabsTrigger
                    key={type.id}
                    value={type.id}
                    className={cn(
                      'relative',
                      hasValue && 'text-green-600'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {hasValue && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {URL_TYPES.map((type) => (
              <TabsContent key={type.id} value={type.id} className="mt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    {type.label} URL
                    {urlInputs[type.id] && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={urlInputs[type.id] || ''}
                        onChange={(e) => handleUrlChange(type.id, e.target.value)}
                        placeholder={type.placeholder}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {type.id === 'google_my_business'
                      ? 'Paste your Google Maps link or Google Business Profile URL'
                      : `Paste your ${type.label} profile or page URL`}
                  </p>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Provider Selection */}
          <div className="space-y-2 pt-2">
            <Label>AI Provider</Label>
            {loadingProviders ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {providers.slice(0, 4).map((provider) => {
                  const isSelected = selectedProvider === provider.name;
                  const isAuto = provider.name === 'auto';

                  return (
                    <button
                      key={provider.name}
                      onClick={() => provider.available && setSelectedProvider(provider.name)}
                      disabled={!provider.available}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-colors',
                        isSelected && 'border-primary bg-primary/5',
                        !isSelected && provider.available && 'hover:border-gray-300',
                        !provider.available && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className={cn(
                        'p-1.5 rounded',
                        isAuto ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' : 'bg-gray-100'
                      )}>
                        <Sparkles className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-xs">{provider.displayName}</span>
                        {isAuto && (
                          <Badge variant="secondary" className="ml-1 text-[10px] py-0">
                            Best
                          </Badge>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Credit Cost */}
          <div className="flex items-center justify-between pt-2 text-sm">
            <span className="text-gray-500">Estimated cost:</span>
            <Badge variant="outline">{creditCost} credits</Badge>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isScanning}>
            Cancel
          </Button>
          <Button
            onClick={handleScan}
            disabled={!hasUrl || isScanning || loadingProviders}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Scan & Extract Data
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
