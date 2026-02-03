'use client';

import { useState } from 'react';
import { Play, Copy, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-emerald-500',
  POST: 'bg-blue-500',
  PUT: 'bg-amber-500',
  PATCH: 'bg-purple-500',
  DELETE: 'bg-red-500',
};

const sampleEndpoints = [
  { method: 'POST' as HttpMethod, path: '/auth/login', name: 'Login', body: '{\n  "email": "user@example.com",\n  "password": "password123"\n}' },
  { method: 'GET' as HttpMethod, path: '/auth/me', name: 'Get Current User', body: '' },
  { method: 'GET' as HttpMethod, path: '/subscriptions/me', name: 'Get Subscription', body: '' },
  { method: 'GET' as HttpMethod, path: '/subscriptions/plans', name: 'Get Plans', body: '' },
  { method: 'POST' as HttpMethod, path: '/ai-scraper/providers', name: 'Get AI Providers', body: '' },
];

export default function PlaygroundPage() {
  const [method, setMethod] = useState<HttpMethod>('POST');
  const [endpoint, setEndpoint] = useState('/auth/login');
  const [body, setBody] = useState('{\n  "email": "user@example.com",\n  "password": "password123"\n}');
  const [token, setToken] = useState('');
  const [response, setResponse] = useState('');
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEndpoints, setShowEndpoints] = useState(false);

  const baseUrl = 'http://localhost:3002/api/v1';

  const executeRequest = async () => {
    setLoading(true);
    setResponse('');
    setStatusCode(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
        options.body = body;
      }

      const res = await fetch(`${baseUrl}${endpoint}`, options);
      const data = await res.json();

      setStatusCode(res.status);
      setResponse(JSON.stringify(data, null, 2));

      // Auto-save token if login was successful
      if (endpoint === '/auth/login' && res.ok && data.accessToken) {
        setToken(data.accessToken);
      }
    } catch (error: any) {
      setResponse(`Error: ${error.message}`);
      setStatusCode(0);
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = async () => {
    await navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectEndpoint = (ep: typeof sampleEndpoints[0]) => {
    setMethod(ep.method);
    setEndpoint(ep.path);
    setBody(ep.body);
    setShowEndpoints(false);
  };

  const generateCurl = () => {
    let curl = `curl -X ${method} "${baseUrl}${endpoint}"`;
    curl += ` \\\n  -H "Content-Type: application/json"`;
    if (token) {
      curl += ` \\\n  -H "Authorization: Bearer ${token}"`;
    }
    if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
      curl += ` \\\n  -d '${body.replace(/\n/g, '').replace(/\s+/g, ' ')}'`;
    }
    return curl;
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">API Playground</h1>
        <p className="text-lg text-slate-400">
          Test API endpoints directly from your browser. Enter your credentials and make live requests.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Panel */}
        <div className="space-y-4">
          <div className="border border-slate-700 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 border-b border-slate-700">
              <h2 className="font-semibold">Request</h2>
            </div>

            <div className="p-4 space-y-4">
              {/* Endpoint Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowEndpoints(!showEndpoints)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                >
                  <span className="text-slate-400">Quick select endpoint...</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showEndpoints && "rotate-180")} />
                </button>
                {showEndpoints && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden">
                    {sampleEndpoints.map((ep, i) => (
                      <button
                        key={i}
                        onClick={() => selectEndpoint(ep)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700 transition-colors text-left"
                      >
                        <span className={cn("px-1.5 py-0.5 text-[10px] font-bold rounded", methodColors[ep.method])}>
                          {ep.method}
                        </span>
                        <span className="text-sm text-slate-300">{ep.name}</span>
                        <span className="text-xs text-slate-500 ml-auto font-mono">{ep.path}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Method & Endpoint */}
              <div className="flex gap-2">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as HttpMethod)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-bold text-white border-0 cursor-pointer",
                    methodColors[method]
                  )}
                >
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                    <option key={m} value={m} className="bg-slate-800 text-white">
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="/auth/login"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-mono"
                />
              </div>

              {/* Auth Token */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Bearer Token</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your access token here..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-mono"
                />
                {token && (
                  <p className="text-xs text-emerald-400 mt-1">Token set - requests will be authenticated</p>
                )}
              </div>

              {/* Request Body */}
              {['POST', 'PUT', 'PATCH'].includes(method) && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Request Body (JSON)</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-mono resize-none"
                    placeholder='{\n  "key": "value"\n}'
                  />
                </div>
              )}

              {/* Execute Button */}
              <button
                onClick={executeRequest}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 rounded-lg font-medium transition-colors"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Send Request
                  </>
                )}
              </button>
            </div>
          </div>

          {/* cURL Command */}
          <div className="border border-slate-700 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">cURL Command</span>
            </div>
            <pre className="p-4 text-xs overflow-x-auto">
              <code className="text-slate-300">{generateCurl()}</code>
            </pre>
          </div>
        </div>

        {/* Response Panel */}
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold">Response</h2>
            <div className="flex items-center gap-2">
              {statusCode !== null && (
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded",
                    statusCode >= 200 && statusCode < 300
                      ? "bg-emerald-500/20 text-emerald-400"
                      : statusCode >= 400 && statusCode < 500
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-red-500/20 text-red-400"
                  )}
                >
                  {statusCode}
                </span>
              )}
              {response && (
                <button
                  onClick={copyResponse}
                  className="p-1.5 rounded hover:bg-slate-700 transition-colors"
                  title="Copy response"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="p-4 min-h-[400px] max-h-[600px] overflow-auto">
            {response ? (
              <pre className="text-sm">
                <code className="text-slate-300">{response}</code>
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>Send a request to see the response</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 p-4 bg-slate-800/30 border border-slate-800 rounded-lg">
        <h3 className="font-medium mb-2">Tips</h3>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>Use the Login endpoint first to get an access token, which will be automatically saved.</li>
          <li>The token will be included in subsequent requests automatically.</li>
          <li>For admin endpoints, make sure you log in with an admin account.</li>
          <li>The cURL command is generated automatically for you to copy and use elsewhere.</li>
        </ul>
      </div>
    </div>
  );
}
