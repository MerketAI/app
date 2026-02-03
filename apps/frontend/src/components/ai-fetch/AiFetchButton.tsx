'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProviderSelectModal } from './ProviderSelectModal';
import { DataPreviewModal } from './DataPreviewModal';
import { aiScraperApi } from '@/lib/api';
import { toast } from 'sonner';

export type FetchType = 'competitor' | 'product' | 'service' | 'audience' | 'brand';

export interface AiFetchButtonProps {
  type: FetchType;
  context?: any;
  onDataFetched: (data: any) => void;
  buttonText?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function AiFetchButton({
  type,
  context,
  onDataFetched,
  buttonText = 'Fetch with AI',
  variant = 'outline',
  size = 'default',
  className,
}: AiFetchButtonProps) {
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [fetchedData, setFetchedData] = useState<any>(null);
  const [sources, setSources] = useState<any>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{
    tasks: { provider: string; status: 'pending' | 'loading' | 'done' | 'error'; dataTypes: string[] }[];
    current: number;
    total: number;
  } | null>(null);

  const handleFetch = async (provider: string, inputData: any) => {
    setIsLoading(true);
    setShowProviderModal(false);

    // Set up progress for auto mode
    if (provider === 'auto') {
      setProgress({
        tasks: [
          { provider: 'perplexity', status: 'loading', dataTypes: ['overview', 'social'] },
          { provider: 'firecrawl', status: 'pending', dataTypes: ['website', 'products'] },
          { provider: 'openai', status: 'pending', dataTypes: ['swot', 'analysis'] },
          { provider: 'merging', status: 'pending', dataTypes: ['combining'] },
        ],
        current: 0,
        total: 4,
      });
    }

    try {
      let response;
      const payload = { provider, ...inputData, ...context };

      switch (type) {
        case 'competitor':
          response = await aiScraperApi.fetchCompetitor(payload);
          break;
        case 'product':
          response = await aiScraperApi.fetchProducts(payload);
          break;
        case 'service':
          response = await aiScraperApi.fetchServices(payload);
          break;
        case 'audience':
          response = await aiScraperApi.fetchAudiences(payload);
          break;
        case 'brand':
          response = await aiScraperApi.fetchBrand(payload);
          break;
      }

      if (response.data?.success) {
        const result = response.data;

        // Handle merged result vs single provider result
        if (result.data?.data) {
          // Merged result (has sources and conflicts)
          setFetchedData(result.data.data);
          setSources(result.data.sources || {});
          setConflicts(result.data.conflicts || []);
        } else {
          // Single provider result
          setFetchedData(result.data);
          setSources({});
          setConflicts([]);
        }

        setShowPreviewModal(true);
        toast.success(`Data fetched! ${result.creditsUsed} credits used.`);
      } else {
        toast.error(response.data?.error || 'Failed to fetch data');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  const handleApplyData = (selectedData: any) => {
    onDataFetched(selectedData);
    setShowPreviewModal(false);
    setFetchedData(null);
    setSources(null);
    setConflicts([]);
    toast.success('Data applied successfully!');
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowProviderModal(true)}
        disabled={isLoading}
        className={className}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {isLoading ? 'Fetching...' : buttonText}
      </Button>

      <ProviderSelectModal
        open={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        onFetch={handleFetch}
        type={type}
        isLoading={isLoading}
        progress={progress}
      />

      <DataPreviewModal
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onApply={handleApplyData}
        data={fetchedData}
        sources={sources}
        conflicts={conflicts}
        type={type}
      />
    </>
  );
}
