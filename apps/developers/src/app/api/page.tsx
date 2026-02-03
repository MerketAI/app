import Link from 'next/link';
import {
  Key,
  Users,
  CreditCard,
  Building2,
  Sparkles,
  LayoutDashboard,
  Shield,
  ArrowRight,
} from 'lucide-react';

const apiModules = [
  {
    title: 'Authentication',
    icon: Key,
    description: 'User registration, login, OAuth, and token management',
    href: '/api/auth/login',
    endpoints: [
      { method: 'POST', path: '/auth/register', name: 'Register' },
      { method: 'POST', path: '/auth/login', name: 'Login' },
      { method: 'POST', path: '/auth/refresh', name: 'Refresh Token' },
      { method: 'POST', path: '/auth/logout', name: 'Logout' },
      { method: 'GET', path: '/auth/google', name: 'Google OAuth' },
      { method: 'GET', path: '/auth/me', name: 'Get Current User' },
    ],
  },
  {
    title: 'Users & Profile',
    icon: Users,
    description: 'User profile and business profile management',
    href: '/api/users/profile',
    endpoints: [
      { method: 'GET', path: '/users/profile', name: 'Get Profile' },
      { method: 'PUT', path: '/users/profile', name: 'Update Profile' },
      { method: 'GET', path: '/users/business', name: 'Get Business Profile' },
      { method: 'PUT', path: '/users/business', name: 'Update Business Profile' },
    ],
  },
  {
    title: 'Subscriptions',
    icon: CreditCard,
    description: 'Subscription plans, payments, and credit management',
    href: '/api/subscriptions/get',
    endpoints: [
      { method: 'GET', path: '/subscriptions/me', name: 'Get Subscription' },
      { method: 'GET', path: '/subscriptions/plans', name: 'Get Plans' },
      { method: 'POST', path: '/subscriptions/order', name: 'Create Order' },
      { method: 'POST', path: '/subscriptions/verify', name: 'Verify Payment' },
      { method: 'GET', path: '/subscriptions/credits', name: 'Get Credits' },
    ],
  },
  {
    title: 'Business Intelligence',
    icon: Building2,
    description: 'Products, services, competitors, audiences, and brand data',
    href: '/api/business/overview',
    endpoints: [
      { method: 'GET', path: '/business/products', name: 'Get Products' },
      { method: 'POST', path: '/business/products', name: 'Create Product' },
      { method: 'GET', path: '/business/services', name: 'Get Services' },
      { method: 'GET', path: '/business/competitors', name: 'Get Competitors' },
      { method: 'GET', path: '/business/audiences', name: 'Get Audiences' },
      { method: 'GET', path: '/business/brand', name: 'Get Brand Voice' },
    ],
  },
  {
    title: 'AI Scraper',
    icon: Sparkles,
    description: 'AI-powered business data extraction from URLs',
    href: '/api/ai-scraper/scan',
    endpoints: [
      { method: 'GET', path: '/ai-scraper/providers', name: 'Get Providers' },
      { method: 'POST', path: '/ai-scraper/scan', name: 'Scan Business URL' },
      { method: 'POST', path: '/ai-scraper/competitors', name: 'Fetch Competitors' },
    ],
  },
  {
    title: 'Workspace',
    icon: LayoutDashboard,
    description: 'Website builder with pages and menus',
    href: '/api/workspace/get',
    endpoints: [
      { method: 'GET', path: '/workspace', name: 'Get Workspace' },
      { method: 'PUT', path: '/workspace', name: 'Update Workspace' },
      { method: 'GET', path: '/workspace/pages', name: 'Get Pages' },
      { method: 'POST', path: '/workspace/pages', name: 'Create Page' },
      { method: 'GET', path: '/workspace/menus', name: 'Get Menus' },
    ],
  },
  {
    title: 'Admin APIs',
    icon: Shield,
    description: 'Platform administration and management (Admin only)',
    href: '/api/admin/overview',
    badge: 'Admin',
    endpoints: [
      { method: 'GET', path: '/admin/stats', name: 'Dashboard Stats' },
      { method: 'GET', path: '/admin/users', name: 'List Users' },
      { method: 'GET', path: '/admin/credentials', name: 'Get Credentials' },
      { method: 'GET', path: '/admin/plans', name: 'Get Plans' },
      { method: 'GET', path: '/admin/payments', name: 'Payment History' },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500',
  POST: 'bg-blue-500',
  PUT: 'bg-amber-500',
  PATCH: 'bg-purple-500',
  DELETE: 'bg-red-500',
};

export default function ApiReferencePage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-12">
        <p className="text-sm text-blue-400 mb-2">API Reference</p>
        <h1 className="text-4xl font-bold mb-4">API Overview</h1>
        <p className="text-lg text-slate-400">
          Complete reference documentation for all Jasper API endpoints.
          All endpoints are prefixed with <code className="text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded">/api/v1</code>
        </p>
      </div>

      {/* Base URL */}
      <div className="mb-12 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">Base URL:</span>
          <code className="text-blue-400 font-mono">http://localhost:3002/api/v1</code>
        </div>
      </div>

      {/* API Modules */}
      <div className="space-y-8">
        {apiModules.map((module) => {
          const Icon = module.icon;
          return (
            <div
              key={module.title}
              className="border border-slate-700 rounded-xl overflow-hidden"
            >
              {/* Module Header */}
              <div className="p-6 bg-slate-800/30">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold">{module.title}</h2>
                      {module.badge && (
                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                          {module.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400">{module.description}</p>
                  </div>
                  <Link
                    href={module.href}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
                  >
                    View Docs
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Endpoints List */}
              <div className="divide-y divide-slate-800">
                {module.endpoints.map((endpoint, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-slate-800/30 transition-colors"
                  >
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${methodColors[endpoint.method]}`}
                    >
                      {endpoint.method}
                    </span>
                    <code className="text-sm text-slate-400 font-mono flex-1">
                      {endpoint.path}
                    </code>
                    <span className="text-sm text-slate-500">{endpoint.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Swagger UI Link */}
      <div className="mt-12 p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl">
        <h3 className="text-lg font-semibold mb-2">Interactive API Explorer</h3>
        <p className="text-slate-400 mb-4">
          Use our Swagger UI to test API endpoints directly in your browser.
        </p>
        <a
          href="http://localhost:3002/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
        >
          Open Swagger UI
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
