'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Source {
  provider: string;
  confidence: number;
  rawValue?: any;
}

interface SourceBadgeProps {
  sources: Source[];
  className?: string;
}

const PROVIDER_COLORS: Record<string, string> = {
  perplexity: 'bg-purple-100 text-purple-700 border-purple-200',
  serper: 'bg-blue-100 text-blue-700 border-blue-200',
  openai: 'bg-green-100 text-green-700 border-green-200',
  firecrawl: 'bg-orange-100 text-orange-700 border-orange-200',
  merged: 'bg-gray-100 text-gray-700 border-gray-200',
};

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  perplexity: 'Perplexity',
  serper: 'Serper',
  openai: 'OpenAI',
  firecrawl: 'Firecrawl',
  merged: 'Merged',
};

export function SourceBadge({ sources, className }: SourceBadgeProps) {
  if (!sources || sources.length === 0) return null;

  // If single source
  if (sources.length === 1) {
    const source = sources[0];
    const colorClass = PROVIDER_COLORS[source.provider] || PROVIDER_COLORS.merged;
    const displayName = PROVIDER_DISPLAY_NAMES[source.provider] || source.provider;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn('text-xs cursor-help', colorClass, className)}
            >
              {displayName}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Source: {displayName}
              <br />
              Confidence: {Math.round(source.confidence * 100)}%
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Multiple sources (merged)
  const primarySource = sources.reduce((a, b) =>
    a.confidence > b.confidence ? a : b
  );
  const colorClass = PROVIDER_COLORS.merged;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn('text-xs cursor-help', colorClass, className)}
          >
            Merged ({sources.length})
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p className="font-medium">Combined from:</p>
            {sources.map((source, i) => (
              <p key={i}>
                {PROVIDER_DISPLAY_NAMES[source.provider] || source.provider}:{' '}
                {Math.round(source.confidence * 100)}%
              </p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
