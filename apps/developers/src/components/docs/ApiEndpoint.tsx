'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CodeBlock } from './CodeBlock';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string;
}

interface Response {
  status: number;
  description: string;
  example: string;
}

interface ApiEndpointProps {
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  authenticated?: boolean;
  adminOnly?: boolean;
  parameters?: {
    path?: Parameter[];
    query?: Parameter[];
    body?: Parameter[];
  };
  requestExample?: string;
  responses: Response[];
}

const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-emerald-500',
  POST: 'bg-blue-500',
  PUT: 'bg-amber-500',
  PATCH: 'bg-purple-500',
  DELETE: 'bg-red-500',
};

export function ApiEndpoint({
  method,
  path,
  title,
  description,
  authenticated = true,
  adminOnly = false,
  parameters,
  requestExample,
  responses,
}: ApiEndpointProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'params' | 'response'>('params');

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden mb-6 animate-fade-in">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
      >
        <span className={cn(
          'px-2 py-1 text-xs font-bold rounded uppercase',
          methodColors[method]
        )}>
          {method}
        </span>
        <code className="text-sm text-slate-300 flex-1 font-mono">{path}</code>
        <div className="flex items-center gap-2">
          {authenticated && (
            <span className="flex items-center gap-1 text-xs text-amber-400" title="Authentication required">
              <Lock className="w-3 h-3" />
            </span>
          )}
          {adminOnly && (
            <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 rounded">
              Admin
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-slate-400">{description}</p>
          </div>

          {authenticated && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-300">
              <Lock className="w-4 h-4" />
              <span>This endpoint requires authentication. Include the Bearer token in the Authorization header.</span>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-slate-700">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('params')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === 'params'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                )}
              >
                Parameters
              </button>
              <button
                onClick={() => setActiveTab('response')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === 'response'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                )}
              >
                Response
              </button>
            </div>
          </div>

          {/* Parameters Tab */}
          {activeTab === 'params' && (
            <div className="space-y-6">
              {parameters?.path && parameters.path.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Path Parameters</h4>
                  <ParameterTable parameters={parameters.path} />
                </div>
              )}

              {parameters?.query && parameters.query.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Query Parameters</h4>
                  <ParameterTable parameters={parameters.query} />
                </div>
              )}

              {parameters?.body && parameters.body.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Request Body</h4>
                  <ParameterTable parameters={parameters.body} />
                </div>
              )}

              {requestExample && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Request Example</h4>
                  <CodeBlock code={requestExample} language="json" title="Request Body" />
                </div>
              )}

              {!parameters?.path?.length && !parameters?.query?.length && !parameters?.body?.length && !requestExample && (
                <p className="text-slate-500 text-sm">No parameters required.</p>
              )}
            </div>
          )}

          {/* Response Tab */}
          {activeTab === 'response' && (
            <div className="space-y-4">
              {responses.map((response, index) => (
                <div key={index}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded',
                      response.status >= 200 && response.status < 300 ? 'bg-emerald-500/20 text-emerald-400' :
                      response.status >= 400 && response.status < 500 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    )}>
                      {response.status}
                    </span>
                    <span className="text-sm text-slate-400">{response.description}</span>
                  </div>
                  <CodeBlock code={response.example} language="json" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ParameterTable({ parameters }: { parameters: Parameter[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-2 px-3 text-slate-400 font-medium">Name</th>
            <th className="text-left py-2 px-3 text-slate-400 font-medium">Type</th>
            <th className="text-left py-2 px-3 text-slate-400 font-medium">Required</th>
            <th className="text-left py-2 px-3 text-slate-400 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((param, index) => (
            <tr key={index} className="border-b border-slate-800">
              <td className="py-3 px-3">
                <code className="text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded text-xs">
                  {param.name}
                </code>
              </td>
              <td className="py-3 px-3">
                <code className="text-purple-400 text-xs">{param.type}</code>
              </td>
              <td className="py-3 px-3">
                {param.required ? (
                  <span className="text-amber-400 text-xs">Required</span>
                ) : (
                  <span className="text-slate-500 text-xs">Optional</span>
                )}
              </td>
              <td className="py-3 px-3 text-slate-400">
                {param.description}
                {param.example && (
                  <span className="block text-xs text-slate-500 mt-1">
                    Example: <code>{param.example}</code>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
