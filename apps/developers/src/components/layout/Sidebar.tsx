'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Code2,
  Key,
  Users,
  CreditCard,
  Building2,
  Palette,
  LayoutDashboard,
  AlertCircle,
  Rocket,
  Zap,
  Shield,
  Globe,
  Sparkles,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  badge?: string;
}

const navigation: NavItem[] = [
  {
    title: 'Getting Started',
    icon: Rocket,
    children: [
      { title: 'Introduction', href: '/docs/introduction' },
      { title: 'Quick Start', href: '/docs/quickstart' },
      { title: 'Authentication', href: '/docs/authentication' },
      { title: 'Rate Limits', href: '/docs/rate-limits' },
    ],
  },
  {
    title: 'API Reference',
    icon: Code2,
    children: [
      { title: 'Overview', href: '/api' },
      {
        title: 'Authentication',
        icon: Key,
        children: [
          { title: 'Register', href: '/api/auth/register' },
          { title: 'Login', href: '/api/auth/login' },
          { title: 'Refresh Token', href: '/api/auth/refresh' },
          { title: 'Logout', href: '/api/auth/logout' },
          { title: 'OAuth (Google)', href: '/api/auth/oauth' },
          { title: 'Password Reset', href: '/api/auth/password-reset' },
        ],
      },
      {
        title: 'Users & Profile',
        icon: Users,
        children: [
          { title: 'Get Current User', href: '/api/users/me' },
          { title: 'Update Profile', href: '/api/users/profile' },
          { title: 'Business Profile', href: '/api/users/business' },
        ],
      },
      {
        title: 'Subscriptions',
        icon: CreditCard,
        children: [
          { title: 'Get Subscription', href: '/api/subscriptions/get' },
          { title: 'Available Plans', href: '/api/subscriptions/plans' },
          { title: 'Create Order', href: '/api/subscriptions/order' },
          { title: 'Verify Payment', href: '/api/subscriptions/verify' },
          { title: 'Credit Balance', href: '/api/subscriptions/credits' },
        ],
      },
      {
        title: 'Business Intelligence',
        icon: Building2,
        children: [
          { title: 'Overview', href: '/api/business/overview' },
          { title: 'Products', href: '/api/business/products' },
          { title: 'Services', href: '/api/business/services' },
          { title: 'Competitors', href: '/api/business/competitors' },
          { title: 'Audiences', href: '/api/business/audiences' },
          { title: 'Brand Voice', href: '/api/business/brand' },
        ],
      },
      {
        title: 'AI Scraper',
        icon: Sparkles,
        children: [
          { title: 'Get Providers', href: '/api/ai-scraper/providers' },
          { title: 'Scan Business URL', href: '/api/ai-scraper/scan' },
          { title: 'Fetch Competitors', href: '/api/ai-scraper/competitors' },
        ],
      },
      {
        title: 'Workspace',
        icon: LayoutDashboard,
        children: [
          { title: 'Get Workspace', href: '/api/workspace/get' },
          { title: 'Update Workspace', href: '/api/workspace/update' },
          { title: 'Pages', href: '/api/workspace/pages' },
          { title: 'Menus', href: '/api/workspace/menus' },
        ],
      },
    ],
  },
  {
    title: 'Admin API',
    icon: Shield,
    badge: 'Admin',
    children: [
      { title: 'Overview', href: '/api/admin/overview' },
      { title: 'Dashboard Stats', href: '/api/admin/stats' },
      { title: 'User Management', href: '/api/admin/users' },
      { title: 'Credentials', href: '/api/admin/credentials' },
      { title: 'Plans Management', href: '/api/admin/plans' },
      { title: 'Payments', href: '/api/admin/payments' },
      { title: 'Workspaces', href: '/api/admin/workspaces' },
    ],
  },
  {
    title: 'Error Reference',
    icon: AlertCircle,
    href: '/errors',
  },
  {
    title: 'SDKs & Libraries',
    icon: FileText,
    children: [
      { title: 'JavaScript/TypeScript', href: '/sdks/javascript' },
      { title: 'Python', href: '/sdks/python' },
      { title: 'cURL Examples', href: '/sdks/curl' },
    ],
  },
  {
    title: 'Guides',
    icon: BookOpen,
    children: [
      { title: 'Webhooks', href: '/guides/webhooks' },
      { title: 'Pagination', href: '/guides/pagination' },
      { title: 'Best Practices', href: '/guides/best-practices' },
    ],
  },
];

function NavSection({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(
    item.children?.some(child =>
      child.href === pathname ||
      child.children?.some(c => c.href === pathname)
    ) ?? false
  );

  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href === pathname;
  const Icon = item.icon;

  if (!hasChildren && item.href) {
    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
          isActive
            ? 'bg-blue-500/10 text-blue-400'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
          depth > 0 && 'ml-4'
        )}
      >
        {Icon && <Icon className="w-4 h-4" />}
        <span>{item.title}</span>
        {item.badge && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
            {item.badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className={cn(depth > 0 && 'ml-4')}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors',
          'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
        )}
      >
        {Icon && <Icon className="w-4 h-4" />}
        <span className="flex-1 text-left font-medium">{item.title}</span>
        {item.badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
            {item.badge}
          </span>
        )}
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500" />
        )}
      </button>
      {isOpen && hasChildren && (
        <div className="mt-1 space-y-1">
          {item.children!.map((child, index) => (
            <NavSection key={index} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-72 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl hidden lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Jasper</h1>
            <p className="text-xs text-slate-500">API Documentation</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <input
              type="search"
              placeholder="Search docs..."
              className="w-full px-3 py-2 pl-9 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navigation.map((item, index) => (
            <NavSection key={index} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>API Version 1.0</span>
            <a
              href="https://github.com/jasper"
              className="hover:text-slate-300 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
