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
import {
  Sparkles,
  Search,
  Globe,
  Brain,
  FileSearch,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { aiScraperApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { FetchType } from './AiFetchButton';

interface Provider {
  name: string;
  displayName: string;
  description: string;
  available: boolean;
  reason?: string;
}

interface ProgressTask {
  provider: string;
  status: 'pending' | 'loading' | 'done' | 'error';
  dataTypes: string[];
}

interface ProviderSelectModalProps {
  open: boolean;
  onClose: () => void;
  onFetch: (provider: string, inputData: any) => void;
  type: FetchType;
  isLoading: boolean;
  progress: {
    tasks: ProgressTask[];
    current: number;
    total: number;
  } | null;
}

const PROVIDER_ICONS: Record<string, any> = {
  auto: Sparkles,
  perplexity: Search,
  serper: Search,
  openai: Brain,
  firecrawl: FileSearch,
  merging: Sparkles,
};

const CREDIT_COSTS: Record<FetchType, { single: number; auto: number }> = {
  competitor: { single: 10, auto: 20 },
  product: { single: 5, auto: 12 },
  service: { single: 5, auto: 12 },
  audience: { single: 8, auto: 15 },
  brand: { single: 5, auto: 10 },
};

const INPUT_FIELDS: Record<FetchType, { name: string; label: string; placeholder: string; required?: boolean }[]> = {
  competitor: [
    { name: 'competitorName', label: 'Competitor Name', placeholder: 'e.g., Acme Corp', required: true },
    { name: 'competitorUrl', label: 'Website URL (optional)', placeholder: 'e.g., https://acme.com' },
    { name: 'industry', label: 'Industry (optional)', placeholder: 'e.g., SaaS, E-commerce' },
  ],
  product: [
    { name: 'industry', label: 'Industry', placeholder: 'e.g., Technology, Healthcare', required: true },
    { name: 'targetMarket', label: 'Target Market', placeholder: 'e.g., Small businesses, Developers' },
  ],
  service: [
    { name: 'industry', label: 'Industry', placeholder: 'e.g., Marketing, Consulting', required: true },
    { name: 'businessModel', label: 'Business Model', placeholder: 'e.g., B2B, B2C' },
  ],
  audience: [
    { name: 'industry', label: 'Industry', placeholder: 'e.g., Fashion, Technology', required: true },
  ],
  brand: [
    { name: 'businessName', label: 'Business Name', placeholder: 'Your company name', required: true },
    { name: 'industry', label: 'Industry', placeholder: 'e.g., Technology, Retail' },
    { name: 'targetAudience', label: 'Target Audience', placeholder: 'Brief description of your audience' },
  ],
};

export function ProviderSelectModal({
  open,
  onClose,
  onFetch,
  type,
  isLoading,
  progress,
}: ProviderSelectModalProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('auto');
  const [inputData, setInputData] = useState<Record<string, string>>({});
  const [loadingProviders, setLoadingProviders] = useState(true);

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
      // Use fallback providers
      setProviders([
        { name: 'auto', displayName: 'Auto - Let AI Choose', description: 'Uses multiple providers for best results', available: true },
        { name: 'perplexity', displayName: 'Perplexity AI', description: 'Real-time web search', available: false, reason: 'API key not configured' },
        { name: 'serper', displayName: 'Serper + Claude', description: 'Google search with AI', available: false, reason: 'API key not configured' },
        { name: 'openai', displayName: 'OpenAI', description: 'GPT-4 analysis', available: false, reason: 'API key not configured' },
        { name: 'firecrawl', displayName: 'Firecrawl + Claude', description: 'Deep website scraping', available: false, reason: 'API key not configured' },
      ]);
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setInputData(prev => ({ ...prev, [name]: value }));
  };

  const handleFetch = () => {
    const fields = INPUT_FIELDS[type];
    const requiredField = fields.find(f => f.required);

    if (requiredField && !inputData[requiredField.name]) {
      return;
    }

    onFetch(selectedProvider, inputData);
  };

  const selectedProviderData = providers.find(p => p.name === selectedProvider);
  const creditCost = selectedProvider === 'auto'
    ? CREDIT_COSTS[type].auto
    : CREDIT_COSTS[type].single;

  // Show progress view when loading
  if (isLoading && progress) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fetching Data...</DialogTitle>
            <DialogDescription>
              Running multiple AI providers in parallel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {progress.tasks.map((task, index) => {
              const Icon = PROVIDER_ICONS[task.provider] || Search;
              return (
                <div
                  key={task.provider}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    task.status === 'done' && 'bg-green-50 border-green-200',
                    task.status === 'loading' && 'bg-blue-50 border-blue-200',
                    task.status === 'error' && 'bg-red-50 border-red-200',
                    task.status === 'pending' && 'bg-gray-50 border-gray-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <div>
                      <p className="font-medium capitalize">{task.provider}</p>
                      <p className="text-xs text-gray-500">
                        {task.dataTypes.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div>
                    {task.status === 'pending' && <Clock className="w-5 h-5 text-gray-400" />}
                    {task.status === 'loading' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                    {task.status === 'done' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {task.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                  </div>
                </div>
              );
            })}

            {/* Progress bar */}
            <div className="pt-2">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Progress</span>
                <span>{Math.round((progress.current / progress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Fetch with AI</DialogTitle>
          <DialogDescription>
            Choose an AI provider to fetch {type} data from the internet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>Choose AI Provider</Label>
            {loadingProviders ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid gap-2">
                {providers.map((provider) => {
                  const Icon = PROVIDER_ICONS[provider.name] || Globe;
                  const isSelected = selectedProvider === provider.name;
                  const isAuto = provider.name === 'auto';

                  return (
                    <button
                      key={provider.name}
                      onClick={() => provider.available && setSelectedProvider(provider.name)}
                      disabled={!provider.available}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                        isSelected && 'border-primary bg-primary/5',
                        !isSelected && provider.available && 'hover:border-gray-300',
                        !provider.available && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className={cn(
                        'p-2 rounded-lg',
                        isAuto ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-gray-100',
                        isAuto && 'text-white'
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{provider.displayName}</span>
                          {isAuto && (
                            <Badge variant="secondary" className="text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {provider.description}
                        </p>
                        {!provider.available && provider.reason && (
                          <p className="text-xs text-red-500 mt-1">
                            {provider.reason}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="text-primary">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Input Fields */}
          <div className="space-y-3 pt-2">
            <Label>Search Information</Label>
            {INPUT_FIELDS[type].map((field) => (
              <div key={field.name}>
                <Label className="text-sm text-gray-600">{field.label}</Label>
                <Input
                  value={inputData[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="mt-1"
                />
              </div>
            ))}
          </div>

          {/* Credit Cost */}
          <div className="flex items-center justify-between pt-2 text-sm">
            <span className="text-gray-500">Estimated cost:</span>
            <Badge variant="outline">{creditCost} credits</Badge>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleFetch}
            disabled={
              !selectedProviderData?.available ||
              !INPUT_FIELDS[type].every(f => !f.required || inputData[f.name])
            }
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Fetch Data
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
