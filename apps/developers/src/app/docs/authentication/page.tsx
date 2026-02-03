import { CodeBlock } from '@/components/docs/CodeBlock';
import { Lock, Key, RefreshCw, Shield, AlertTriangle } from 'lucide-react';

export default function AuthenticationPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="text-sm text-blue-400 mb-2">Getting Started</p>
        <h1 className="text-4xl font-bold mb-4">Authentication</h1>
        <p className="text-lg text-slate-400">
          Learn how to authenticate with the Jasper API using JWT tokens.
        </p>
      </div>

      {/* Overview */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Overview</h2>
        <p className="text-slate-400 mb-6">
          The Jasper API uses JWT (JSON Web Tokens) for authentication. After logging in,
          you receive an access token and a refresh token. The access token is used to
          authenticate API requests, while the refresh token is used to obtain new access tokens.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <Key className="w-5 h-5 text-blue-400" />
              <h3 className="font-medium">Access Token</h3>
            </div>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>Expires in 15 minutes</li>
              <li>Used in Authorization header</li>
              <li>Contains user info in payload</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <RefreshCw className="w-5 h-5 text-purple-400" />
              <h3 className="font-medium">Refresh Token</h3>
            </div>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>Expires in 7 days</li>
              <li>Used to get new access tokens</li>
              <li>Stored in database</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Authentication Flow */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Authentication Flow</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold shrink-0">1</div>
            <div>
              <h3 className="font-medium mb-1">User Registration</h3>
              <p className="text-sm text-slate-400">
                New users register with email/phone and password. A verification code is sent.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold shrink-0">2</div>
            <div>
              <h3 className="font-medium mb-1">Email/Phone Verification</h3>
              <p className="text-sm text-slate-400">
                User verifies their account using the 6-digit code sent to their email/phone.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold shrink-0">3</div>
            <div>
              <h3 className="font-medium mb-1">Login</h3>
              <p className="text-sm text-slate-400">
                User logs in with credentials and receives access + refresh tokens.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold shrink-0">4</div>
            <div>
              <h3 className="font-medium mb-1">API Requests</h3>
              <p className="text-sm text-slate-400">
                Include the access token in the Authorization header for all protected requests.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold shrink-0">5</div>
            <div>
              <h3 className="font-medium mb-1">Token Refresh</h3>
              <p className="text-sm text-slate-400">
                When access token expires, use refresh token to get a new pair of tokens.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Using the Authorization Header */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Using the Authorization Header</h2>
        <p className="text-slate-400 mb-4">
          Include your access token in the <code className="text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded">Authorization</code> header
          using the Bearer scheme:
        </p>
        <CodeBlock
          title="Authorization Header Format"
          language="http"
          code={`GET /api/v1/auth/me HTTP/1.1
Host: localhost:3002
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NDAxZThjNy01Y2FhLTRlZDUtYmEwZi0wMDkyOGZmYmI5NmQiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiVVNFUiIsImlhdCI6MTcwOTkwMDAwMCwiZXhwIjoxNzA5OTAwOTAwfQ.signature
Content-Type: application/json`}
        />
      </section>

      {/* JWT Token Structure */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">JWT Token Structure</h2>
        <p className="text-slate-400 mb-4">
          The access token is a JWT containing the following payload:
        </p>
        <CodeBlock
          title="Token Payload"
          language="json"
          code={`{
  "sub": "8401e8c7-5caa-4ed5-ba0f-00928ffbb96d",  // User ID
  "email": "user@example.com",
  "phone": null,
  "role": "USER",                                  // USER or ADMIN
  "iat": 1709900000,                              // Issued at
  "exp": 1709900900                               // Expires at
}`}
        />
      </section>

      {/* OAuth Authentication */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">OAuth Authentication</h2>
        <p className="text-slate-400 mb-4">
          Jasper supports OAuth 2.0 authentication with Google. Users can sign in using their Google account.
        </p>

        <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-800 mb-6">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google OAuth
          </h3>
          <p className="text-sm text-slate-400 mb-3">
            Initiate Google OAuth flow by redirecting users to:
          </p>
          <code className="block p-2 bg-slate-900 rounded text-sm text-blue-400">
            GET /api/v1/auth/google
          </code>
        </div>
      </section>

      {/* Role-Based Access */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Role-Based Access Control</h2>
        <p className="text-slate-400 mb-4">
          The API uses role-based access control (RBAC). There are two main roles:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Role</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Description</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Access</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800">
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">USER</span>
                </td>
                <td className="py-3 px-4 text-slate-300">Regular user account</td>
                <td className="py-3 px-4 text-slate-400">User dashboard, profile, subscriptions, workspace</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">ADMIN</span>
                </td>
                <td className="py-3 px-4 text-slate-300">Administrator account</td>
                <td className="py-3 px-4 text-slate-400">Full access including admin panel, user management, system settings</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Security Best Practices */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-400" />
          Security Best Practices
        </h2>
        <div className="space-y-4">
          <div className="flex gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-800">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Never expose tokens in client-side code</h3>
              <p className="text-sm text-slate-400">
                Store tokens securely and never include them in URLs or logs.
              </p>
            </div>
          </div>
          <div className="flex gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-800">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Use HTTPS in production</h3>
              <p className="text-sm text-slate-400">
                Always use HTTPS to encrypt tokens in transit.
              </p>
            </div>
          </div>
          <div className="flex gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-800">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Implement token refresh logic</h3>
              <p className="text-sm text-slate-400">
                Handle 401 errors by automatically refreshing tokens before retrying.
              </p>
            </div>
          </div>
          <div className="flex gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-800">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Logout when done</h3>
              <p className="text-sm text-slate-400">
                Call the logout endpoint to invalidate refresh tokens when users sign out.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
