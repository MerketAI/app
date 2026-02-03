import Link from 'next/link';
import { ArrowRight, CheckCircle, Zap, Shield, Sparkles, Globe } from 'lucide-react';

export default function IntroductionPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="text-sm text-blue-400 mb-2">Getting Started</p>
        <h1 className="text-4xl font-bold mb-4">Introduction</h1>
        <p className="text-lg text-slate-400">
          Welcome to the Jasper API documentation. Learn how to integrate powerful marketing automation
          capabilities into your applications.
        </p>
      </div>

      {/* What is Jasper */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">What is Jasper?</h2>
        <p className="text-slate-400 mb-6">
          Jasper is an intelligent marketing automation platform that helps businesses create, manage,
          and optimize their marketing efforts using AI-powered tools. Our API provides programmatic
          access to all platform features.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: Sparkles, title: 'AI-Powered Content', desc: 'Generate marketing content using multiple AI providers' },
            { icon: Shield, title: 'Secure Authentication', desc: 'JWT-based auth with OAuth support' },
            { icon: Globe, title: 'Multi-Channel Publishing', desc: 'Publish to social media and web platforms' },
            { icon: Zap, title: 'Business Intelligence', desc: 'Analyze competitors and target audiences' },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-800">
              <item.icon className="w-6 h-6 text-blue-400 shrink-0" />
              <div>
                <h3 className="font-medium mb-1">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Base URL */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Base URL</h2>
        <p className="text-slate-400 mb-4">
          All API requests should be made to the following base URL:
        </p>
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 font-mono">
          <code className="text-blue-400">https://api.jasper.app/api/v1</code>
        </div>
        <p className="text-sm text-slate-500 mt-2">
          For local development, use: <code className="text-slate-400">http://localhost:3002/api/v1</code>
        </p>
      </section>

      {/* API Versioning */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">API Versioning</h2>
        <p className="text-slate-400 mb-4">
          The Jasper API uses URI versioning. The current version is <code className="text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded">v1</code>.
          The version is included in the URL path:
        </p>
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 font-mono text-sm">
          <code className="text-slate-300">/api/v1/auth/login</code>
        </div>
      </section>

      {/* Request Format */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Request Format</h2>
        <p className="text-slate-400 mb-4">
          The API accepts JSON-encoded request bodies and returns JSON-encoded responses.
          Always include the following headers:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Header</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Value</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Required</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800">
                <td className="py-3 px-4"><code className="text-blue-400">Content-Type</code></td>
                <td className="py-3 px-4 text-slate-300">application/json</td>
                <td className="py-3 px-4 text-amber-400">Yes</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-3 px-4"><code className="text-blue-400">Authorization</code></td>
                <td className="py-3 px-4 text-slate-300">Bearer &lt;access_token&gt;</td>
                <td className="py-3 px-4 text-slate-500">For protected routes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Response Format */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Response Format</h2>
        <p className="text-slate-400 mb-4">
          All responses are returned in JSON format. Successful responses include the requested data,
          while error responses follow a consistent structure:
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
            <div className="px-4 py-2 bg-slate-800 border-b border-slate-700">
              <span className="text-sm font-medium text-emerald-400">Success Response</span>
            </div>
            <pre className="p-4 text-sm overflow-x-auto">
              <code className="text-slate-300">{`{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-15T10:30:00Z"
}`}</code>
            </pre>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
            <div className="px-4 py-2 bg-slate-800 border-b border-slate-700">
              <span className="text-sm font-medium text-red-400">Error Response</span>
            </div>
            <pre className="p-4 text-sm overflow-x-auto">
              <code className="text-slate-300">{`{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Next Steps</h2>
        <div className="space-y-3">
          {[
            { title: 'Quick Start Guide', href: '/docs/quickstart', desc: 'Get up and running in 5 minutes' },
            { title: 'Authentication', href: '/docs/authentication', desc: 'Learn how to authenticate API requests' },
            { title: 'API Reference', href: '/api', desc: 'Explore all available endpoints' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 p-4 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-800 hover:border-slate-700 rounded-lg transition-all group"
            >
              <CheckCircle className="w-5 h-5 text-blue-400" />
              <div className="flex-1">
                <h3 className="font-medium group-hover:text-blue-400 transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
