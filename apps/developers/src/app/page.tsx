import Link from 'next/link';
import {
  Zap,
  Code2,
  BookOpen,
  Key,
  CreditCard,
  Building2,
  ArrowRight,
  Terminal,
  Sparkles,
  Shield,
} from 'lucide-react';

const features = [
  {
    icon: Key,
    title: 'Authentication',
    description: 'Secure JWT-based authentication with OAuth support for Google.',
    href: '/api/auth/login',
  },
  {
    icon: CreditCard,
    title: 'Subscriptions & Billing',
    description: 'Manage subscription plans, credits, and Razorpay payments.',
    href: '/api/subscriptions/get',
  },
  {
    icon: Building2,
    title: 'Business Intelligence',
    description: 'Store and manage business profiles, competitors, and audiences.',
    href: '/api/business/overview',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Scraping',
    description: 'Fetch business data using multiple AI providers.',
    href: '/api/ai-scraper/scan',
  },
  {
    icon: Shield,
    title: 'Admin APIs',
    description: 'Comprehensive admin endpoints for platform management.',
    href: '/api/admin/overview',
  },
  {
    icon: Code2,
    title: 'Workspace Builder',
    description: 'Create and manage landing pages and website content.',
    href: '/api/workspace/get',
  },
];

const quickLinks = [
  { title: 'Quick Start Guide', href: '/docs/quickstart', icon: Zap },
  { title: 'API Reference', href: '/api', icon: Code2 },
  { title: 'Authentication', href: '/docs/authentication', icon: Key },
  { title: 'Error Codes', href: '/errors', icon: BookOpen },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        <div className="relative max-w-6xl mx-auto px-6 py-20">
          <div className="flex items-center gap-2 text-sm text-blue-400 mb-4">
            <Zap className="w-4 h-4" />
            <span>Jasper Marketing Automation Platform</span>
          </div>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            API Documentation
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mb-8">
            Build powerful marketing automation workflows with our comprehensive REST API.
            Integrate AI-powered content generation, business intelligence, and multi-channel publishing.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/docs/quickstart"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/api"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors"
            >
              <Code2 className="w-4 h-4" />
              API Reference
            </Link>
          </div>
        </div>
      </section>

      {/* Base URL */}
      <section className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <Terminal className="w-5 h-5 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm text-slate-400 mb-1">Base URL</p>
              <code className="text-lg font-mono text-blue-400">http://localhost:3002/api/v1</code>
            </div>
            <button className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
              Copy
            </button>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="text-2xl font-bold mb-6">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-4 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-800 hover:border-slate-700 rounded-lg transition-all group"
                >
                  <Icon className="w-5 h-5 text-blue-400" />
                  <span className="font-medium group-hover:text-blue-400 transition-colors">
                    {link.title}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-auto text-slate-600 group-hover:text-blue-400 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-2">API Modules</h2>
          <p className="text-slate-400 mb-8">Explore the full capabilities of the Jasper API.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className="group p-6 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-800 hover:border-slate-700 rounded-xl transition-all"
                >
                  <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400">{feature.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-2">Quick Example</h2>
          <p className="text-slate-400 mb-8">Get started with a simple authentication request.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
              <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">Request</span>
                <span className="text-xs text-slate-500">cURL</span>
              </div>
              <pre className="p-4 text-sm overflow-x-auto">
                <code className="text-slate-300">{`curl -X POST http://localhost:3002/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'`}</code>
              </pre>
            </div>
            <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
              <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">Response</span>
                <span className="text-xs text-emerald-400">200 OK</span>
              </div>
              <pre className="p-4 text-sm overflow-x-auto">
                <code className="text-slate-300">{`{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "7f736123-07e8-4746...",
  "expiresIn": 900,
  "user": {
    "id": "8401e8c7-5caa-4ed5...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  }
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold">Jasper</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <Link href="/docs/introduction" className="hover:text-white transition-colors">Documentation</Link>
              <Link href="/api" className="hover:text-white transition-colors">API Reference</Link>
              <Link href="/errors" className="hover:text-white transition-colors">Error Codes</Link>
              <a href="http://localhost:3002/api/docs" target="_blank" className="hover:text-white transition-colors">Swagger UI</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Jasper Marketing Automation. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
