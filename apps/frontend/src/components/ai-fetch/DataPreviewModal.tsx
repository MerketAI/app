'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FetchType } from './AiFetchButton';
import { SourceBadge } from './SourceBadge';

interface DataPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (selectedData: any) => void;
  data: any;
  sources: Record<string, any[]>;
  conflicts: any[];
  type: FetchType;
}

interface SelectableField {
  path: string;
  label: string;
  value: any;
  source?: string;
  selected: boolean;
}

export function DataPreviewModal({
  open,
  onClose,
  onApply,
  data,
  sources,
  conflicts,
  type,
}: DataPreviewModalProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  // Initialize with all fields selected
  useMemo(() => {
    if (data) {
      const allPaths = getAllPaths(data);
      setSelectedFields(new Set(allPaths));
    }
  }, [data]);

  const toggleField = (path: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFields(newSelected);
  };

  const selectAll = () => {
    if (data) {
      setSelectedFields(new Set(getAllPaths(data)));
    }
  };

  const deselectAll = () => {
    setSelectedFields(new Set());
  };

  const handleApply = () => {
    if (!data) return;

    // Build selected data object
    const selectedData = buildSelectedData(data, selectedFields);
    onApply(selectedData);
  };

  if (!data) return null;

  const isArray = Array.isArray(data);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Preview Fetched Data</DialogTitle>
          <DialogDescription>
            Review and select the data you want to apply
          </DialogDescription>
        </DialogHeader>

        {/* Conflicts Alert */}
        {conflicts && conflicts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">
                  {conflicts.length} conflict(s) resolved
                </p>
                <ul className="text-sm text-amber-700 mt-1 space-y-1">
                  {conflicts.slice(0, 3).map((conflict, i) => (
                    <li key={i}>
                      <span className="font-medium">{conflict.field}:</span>{' '}
                      {conflict.values.map((v: any) => `${v.value} (${v.provider})`).join(' vs ')}
                      {' → '}
                      <span className="font-medium">Resolved: {String(conflict.resolved)}</span>
                    </li>
                  ))}
                  {conflicts.length > 3 && (
                    <li className="text-amber-600">
                      +{conflicts.length - 3} more conflicts
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Data Preview */}
        <ScrollArea className="h-[400px] pr-4">
          {isArray ? (
            <ArrayDataPreview
              data={data}
              sources={sources}
              selectedFields={selectedFields}
              onToggle={toggleField}
              type={type}
            />
          ) : (
            <ObjectDataPreview
              data={data}
              sources={sources}
              selectedFields={selectedFields}
              onToggle={toggleField}
              path=""
            />
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              Deselect All
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={selectedFields.size === 0}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply Selected ({selectedFields.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for object data
function ObjectDataPreview({
  data,
  sources,
  selectedFields,
  onToggle,
  path,
}: {
  data: any;
  sources: Record<string, any[]>;
  selectedFields: Set<string>;
  onToggle: (path: string) => void;
  path: string;
}) {
  if (!data || typeof data !== 'object') return null;

  return (
    <div className="space-y-2">
      {Object.entries(data).map(([key, value]) => {
        const fieldPath = path ? `${path}.${key}` : key;
        const fieldSources = sources[fieldPath];
        const isSelected = selectedFields.has(fieldPath);

        if (value === null || value === undefined) return null;

        // Handle nested objects
        if (typeof value === 'object' && !Array.isArray(value)) {
          return (
            <div key={key} className="border rounded-lg p-3">
              <h4 className="font-medium text-sm mb-2 capitalize">
                {formatLabel(key)}
              </h4>
              <ObjectDataPreview
                data={value}
                sources={sources}
                selectedFields={selectedFields}
                onToggle={onToggle}
                path={fieldPath}
              />
            </div>
          );
        }

        // Handle arrays
        if (Array.isArray(value)) {
          return (
            <div key={key} className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggle(fieldPath)}
                />
                <h4 className="font-medium text-sm capitalize">
                  {formatLabel(key)} ({value.length})
                </h4>
                {fieldSources && <SourceBadge sources={fieldSources} />}
              </div>
              <div className="flex flex-wrap gap-1 ml-6">
                {value.slice(0, 10).map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {typeof item === 'object' ? item.name || JSON.stringify(item) : String(item)}
                  </Badge>
                ))}
                {value.length > 10 && (
                  <Badge variant="outline" className="text-xs">
                    +{value.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          );
        }

        // Handle primitive values
        return (
          <div
            key={key}
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg border',
              isSelected ? 'bg-primary/5 border-primary/20' : 'bg-gray-50'
            )}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggle(fieldPath)}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-500 capitalize">
                {formatLabel(key)}:
              </span>
              <span className="text-sm font-medium ml-2 truncate">
                {String(value)}
              </span>
            </div>
            {fieldSources && <SourceBadge sources={fieldSources} />}
          </div>
        );
      })}
    </div>
  );
}

// Helper component for array data (products, services, audiences)
function ArrayDataPreview({
  data,
  sources,
  selectedFields,
  onToggle,
  type,
}: {
  data: any[];
  sources: Record<string, any[]>;
  selectedFields: Set<string>;
  onToggle: (path: string) => void;
  type: FetchType;
}) {
  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const itemPath = `[${index}]`;
        const isSelected = selectedFields.has(itemPath);
        const itemSources = sources[`${type}s[${index}]`] || sources[itemPath];

        return (
          <div
            key={index}
            className={cn(
              'border rounded-lg p-4',
              isSelected ? 'bg-primary/5 border-primary/20' : ''
            )}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle(itemPath)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">
                    {item.name || `Item ${index + 1}`}
                  </h4>
                  {itemSources && <SourceBadge sources={itemSources} />}
                </div>
                {item.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {item.description}
                  </p>
                )}
                {item.category && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {item.category}
                  </Badge>
                )}
                {/* Show key fields based on type */}
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  {item.features && (
                    <p>Features: {item.features.slice(0, 3).join(', ')}</p>
                  )}
                  {item.benefits && (
                    <p>Benefits: {item.benefits.slice(0, 3).join(', ')}</p>
                  )}
                  {item.painPoints && (
                    <p>Pain Points: {item.painPoints.slice(0, 3).join(', ')}</p>
                  )}
                  {item.priceRange && <p>Price: {item.priceRange}</p>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helper functions
function getAllPaths(data: any, prefix = ''): string[] {
  const paths: string[] = [];

  if (Array.isArray(data)) {
    data.forEach((_, index) => {
      paths.push(`[${index}]`);
    });
  } else if (typeof data === 'object' && data !== null) {
    Object.entries(data).forEach(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        paths.push(...getAllPaths(value, path));
      } else {
        paths.push(path);
      }
    });
  }

  return paths;
}

function buildSelectedData(data: any, selectedPaths: Set<string>): any {
  if (Array.isArray(data)) {
    return data.filter((_, index) => selectedPaths.has(`[${index}]`));
  }

  const result: any = {};

  const addPath = (obj: any, pathParts: string[], value: any) => {
    const [first, ...rest] = pathParts;
    if (rest.length === 0) {
      obj[first] = value;
    } else {
      if (!obj[first]) obj[first] = {};
      addPath(obj[first], rest, value);
    }
  };

  selectedPaths.forEach((path) => {
    const value = getValueByPath(data, path);
    if (value !== undefined) {
      const parts = path.split('.');
      addPath(result, parts, value);
    }
  });

  return result;
}

function getValueByPath(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/_/g, ' ');
}
