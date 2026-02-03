'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({
  code,
  language = 'json',
  title,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <span className="text-xs font-medium text-slate-400">{title}</span>
          <span className="text-xs text-slate-500">{language}</span>
        </div>
      )}
      <div className="relative">
        <pre className={cn(
          "overflow-x-auto p-4 text-sm",
          showLineNumbers && "pl-12"
        )}>
          {showLineNumbers && (
            <div className="absolute left-0 top-0 bottom-0 w-10 bg-slate-800/50 border-r border-slate-700 flex flex-col items-end py-4 pr-2 text-slate-600 text-xs select-none">
              {lines.map((_, i) => (
                <span key={i} className="leading-6">{i + 1}</span>
              ))}
            </div>
          )}
          <code className={`language-${language}`}>
            {code}
          </code>
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute top-3 right-3 p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>
    </div>
  );
}
