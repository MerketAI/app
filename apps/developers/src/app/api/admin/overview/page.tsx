import { ApiEndpoint } from '@/components/docs/ApiEndpoint';
import Link from 'next/link';
import { Shield, AlertTriangle, Users, CreditCard, Key, LayoutDashboard, Wallet } from 'lucide-react';

export default function AdminApiOverviewPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link href="/api" className="hover:text-white">API Reference</Link>
        <span>/</span>
        <span className="text-white">Admin APIs</span>
      </nav>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-4xl font-bold">Admin APIs</h1>
          <span className="px-3 py-1 text-sm bg-purple-500/20 text-purple-400 rounded-full">
            Admin Only
          </span>
        </div>
        <p className="text-lg text-slate-400">
          Administrative endpoints for platform management. These endpoints require admin privileges.
        </p>
      </div>

      {/* Admin Warning */}
      <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-4">
        <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
        <div>
          <h3 className="font-medium text-amber-400 mb-1">Admin Access Required</h3>
          <p className="text-sm text-slate-400">
            All endpoints in this section require authentication with an account that has the <code className="text-purple-400">ADMIN</code> role.
            Regular users will receive a 403 Forbidden error.
          </p>
        </div>
      </div>

      {/* Admin Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {[
          { icon: LayoutDashboard, title: 'Dashboard Stats', desc: 'Platform statistics and metrics', href: '/api/admin/stats' },
          { icon: Users, title: 'User Management', desc: 'List, update, and manage users', href: '/api/admin/users' },
          { icon: Key, title: 'Credentials', desc: 'API keys and system credentials', href: '/api/admin/credentials' },
          { icon: CreditCard, title: 'Plans', desc: 'Subscription plan management', href: '/api/admin/plans' },
          { icon: Wallet, title: 'Payments', desc: 'Payment history and analytics', href: '/api/admin/payments' },
          { icon: Shield, title: 'Workspaces', desc: 'Manage user workspaces', href: '/api/admin/workspaces' },
        ].map((item, i) => (
          <Link
            key={i}
            href={item.href}
            className="flex items-start gap-4 p-4 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-800 hover:border-slate-700 rounded-lg transition-all"
          >
            <item.icon className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium">{item.title}</h3>
              <p className="text-sm text-slate-400">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Dashboard Stats Endpoint */}
      <ApiEndpoint
        method="GET"
        path="/api/v1/admin/stats"
        title="Get Dashboard Statistics"
        description="Returns platform-wide statistics including user counts, revenue metrics, and subscription analytics."
        authenticated={true}
        adminOnly={true}
        responses={[
          {
            status: 200,
            description: 'Statistics retrieved successfully',
            example: `{
  "users": {
    "total": 1250,
    "active": 1100,
    "pending": 100,
    "suspended": 50,
    "newThisMonth": 85
  },
  "subscriptions": {
    "total": 1100,
    "byTier": {
      "STARTER": 650,
      "PROFESSIONAL": 350,
      "BUSINESS": 100
    },
    "monthlyRecurring": 45000
  },
  "credits": {
    "totalIssued": 500000,
    "totalUsed": 325000,
    "averageUsagePerUser": 295
  },
  "workspaces": {
    "total": 890,
    "published": 650,
    "draft": 240
  }
}`,
          },
          {
            status: 401,
            description: 'Not authenticated',
            example: `{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}`,
          },
          {
            status: 403,
            description: 'Not an admin',
            example: `{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}`,
          },
        ]}
      />

      {/* Get Users Endpoint */}
      <ApiEndpoint
        method="GET"
        path="/api/v1/admin/users"
        title="List Users"
        description="Retrieves a paginated list of all users with optional filtering and search."
        authenticated={true}
        adminOnly={true}
        parameters={{
          query: [
            {
              name: 'page',
              type: 'number',
              required: false,
              description: 'Page number (default: 1)',
              example: '1',
            },
            {
              name: 'limit',
              type: 'number',
              required: false,
              description: 'Items per page (default: 20, max: 100)',
              example: '20',
            },
            {
              name: 'search',
              type: 'string',
              required: false,
              description: 'Search by name or email',
              example: 'john',
            },
            {
              name: 'status',
              type: 'string',
              required: false,
              description: 'Filter by status (ACTIVE, PENDING, SUSPENDED)',
              example: 'ACTIVE',
            },
            {
              name: 'role',
              type: 'string',
              required: false,
              description: 'Filter by role (USER, ADMIN)',
              example: 'USER',
            },
          ],
        }}
        responses={[
          {
            status: 200,
            description: 'Users retrieved successfully',
            example: `{
  "data": [
    {
      "id": "8401e8c7-5caa-4ed5-ba0f-00928ffbb96d",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER",
      "status": "ACTIVE",
      "emailVerified": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "lastLoginAt": "2024-02-01T08:00:00Z",
      "subscription": {
        "tier": "PROFESSIONAL",
        "creditsRemaining": 450
      }
    }
  ],
  "meta": {
    "total": 1250,
    "page": 1,
    "limit": 20,
    "totalPages": 63
  }
}`,
          },
        ]}
      />

      {/* Update User Endpoint */}
      <ApiEndpoint
        method="PUT"
        path="/api/v1/admin/users/:id"
        title="Update User"
        description="Update a user's status or role. Admins can activate, suspend, or promote users."
        authenticated={true}
        adminOnly={true}
        parameters={{
          path: [
            {
              name: 'id',
              type: 'string',
              required: true,
              description: 'User ID (UUID)',
              example: '8401e8c7-5caa-4ed5-ba0f-00928ffbb96d',
            },
          ],
          body: [
            {
              name: 'status',
              type: 'string',
              required: false,
              description: 'New status (ACTIVE, PENDING, SUSPENDED)',
              example: 'SUSPENDED',
            },
            {
              name: 'role',
              type: 'string',
              required: false,
              description: 'New role (USER, ADMIN)',
              example: 'ADMIN',
            },
          ],
        }}
        requestExample={`{
  "status": "SUSPENDED"
}`}
        responses={[
          {
            status: 200,
            description: 'User updated successfully',
            example: `{
  "id": "8401e8c7-5caa-4ed5-ba0f-00928ffbb96d",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "USER",
  "status": "SUSPENDED",
  "updatedAt": "2024-02-01T12:00:00Z"
}`,
          },
          {
            status: 404,
            description: 'User not found',
            example: `{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}`,
          },
        ]}
      />

      {/* Credentials Endpoint */}
      <ApiEndpoint
        method="GET"
        path="/api/v1/admin/credentials"
        title="Get System Credentials"
        description="Retrieves all configured API keys and system credentials with masked values."
        authenticated={true}
        adminOnly={true}
        responses={[
          {
            status: 200,
            description: 'Credentials retrieved successfully',
            example: `{
  "credentials": [
    {
      "key": "ANTHROPIC_API_KEY",
      "category": "AI_PROVIDERS",
      "description": "Claude API key",
      "isActive": true,
      "lastUpdated": "2024-01-20T10:00:00Z",
      "maskedValue": "sk-ant-...****"
    },
    {
      "key": "RAZORPAY_KEY_ID",
      "category": "PAYMENT",
      "description": "Razorpay API key",
      "isActive": true,
      "lastUpdated": "2024-01-15T08:00:00Z",
      "maskedValue": "rzp_test_****"
    }
  ]
}`,
          },
        ]}
      />

      {/* Create Credential Endpoint */}
      <ApiEndpoint
        method="POST"
        path="/api/v1/admin/credentials"
        title="Create/Update Credential"
        description="Creates a new credential or updates an existing one. Values are stored encrypted."
        authenticated={true}
        adminOnly={true}
        parameters={{
          body: [
            {
              name: 'key',
              type: 'string',
              required: true,
              description: 'Credential key name',
              example: 'PERPLEXITY_API_KEY',
            },
            {
              name: 'value',
              type: 'string',
              required: true,
              description: 'Credential value (will be encrypted)',
              example: 'pplx-...',
            },
            {
              name: 'description',
              type: 'string',
              required: false,
              description: 'Description of the credential',
              example: 'Perplexity AI API key for web search',
            },
            {
              name: 'category',
              type: 'string',
              required: false,
              description: 'Category (AI_PROVIDERS, PAYMENT, SOCIAL, OTHER)',
              example: 'AI_PROVIDERS',
            },
          ],
        }}
        requestExample={`{
  "key": "PERPLEXITY_API_KEY",
  "value": "pplx-abc123...",
  "description": "Perplexity AI API key",
  "category": "AI_PROVIDERS"
}`}
        responses={[
          {
            status: 201,
            description: 'Credential created successfully',
            example: `{
  "key": "PERPLEXITY_API_KEY",
  "category": "AI_PROVIDERS",
  "description": "Perplexity AI API key",
  "isActive": true,
  "createdAt": "2024-02-01T12:00:00Z"
}`,
          },
        ]}
      />
    </div>
  );
}
