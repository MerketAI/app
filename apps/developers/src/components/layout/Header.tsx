'use client';

import { Github, ExternalLink, Menu } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4 lg:hidden">
          <button className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold">Jasper Docs</span>
        </div>

        <div className="hidden lg:flex items-center gap-6">
          <nav className="flex items-center gap-1">
            <Link
              href="/docs/introduction"
              className="px-3 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/api"
              className="px-3 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              API Reference
            </Link>
            <Link
              href="/errors"
              className="px-3 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              Errors
            </Link>
            <Link
              href="/playground"
              className="px-3 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              Playground
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="http://localhost:3002/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <span className="hidden sm:inline">Swagger UI</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href="https://github.com/jasper"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Github className="w-5 h-5 text-slate-400 hover:text-white" />
          </a>
          <Link
            href="http://localhost:3000"
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
