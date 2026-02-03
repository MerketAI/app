import { ApiEndpoint } from '@/components/docs/ApiEndpoint';
import { CodeBlock } from '@/components/docs/CodeBlock';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function LoginApiPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link href="/api" className="hover:text-white">API Reference</Link>
        <span>/</span>
        <Link href="/api/auth/login" className="hover:text-white">Authentication</Link>
        <span>/</span>
        <span className="text-white">Login</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Login</h1>
        <p className="text-lg text-slate-400">
          Authenticate a user with email/phone and password to receive access and refresh tokens.
        </p>
      </div>

      {/* Main Endpoint */}
      <ApiEndpoint
        method="POST"
        path="/api/v1/auth/login"
        title="User Login"
        description="Authenticates a user and returns JWT tokens for API access. The access token expires in 15 minutes, while the refresh token is valid for 7 days."
        authenticated={false}
        parameters={{
          body: [
            {
              name: 'email',
              type: 'string',
              required: false,
              description: 'User email address (required if phone not provided)',
              example: 'user@example.com',
            },
            {
              name: 'phone',
              type: 'string',
              required: false,
              description: 'User phone number with country code (required if email not provided)',
              example: '+1234567890',
            },
            {
              name: 'password',
              type: 'string',
              required: true,
              description: 'User password (minimum 8 characters)',
              example: 'SecurePassword123!',
            },
            {
              name: 'mfaCode',
              type: 'string',
              required: false,
              description: '6-digit MFA code (if MFA is enabled on the account)',
              example: '123456',
            },
          ],
        }}
        requestExample={`{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}`}
        responses={[
          {
            status: 200,
            description: 'Login successful',
            example: `{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NDAxZThjNy01Y2FhLTRlZDUtYmEwZi0wMDkyOGZmYmI5NmQiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiVVNFUiIsImlhdCI6MTcwOTkwMDAwMCwiZXhwIjoxNzA5OTAwOTAwfQ.signature",
  "refreshToken": "7f736123-07e8-4746-976f-0914edf391fc",
  "expiresIn": 900,
  "user": {
    "id": "8401e8c7-5caa-4ed5-ba0f-00928ffbb96d",
    "email": "user@example.com",
    "phone": null,
    "name": "John Doe",
    "role": "USER"
  }
}`,
          },
          {
            status: 200,
            description: 'MFA required (when MFA is enabled)',
            example: `{
  "requiresMfa": true
}`,
          },
          {
            status: 400,
            description: 'Validation error',
            example: `{
  "statusCode": 400,
  "message": "Either email or phone is required",
  "error": "Bad Request"
}`,
          },
          {
            status: 401,
            description: 'Invalid credentials',
            example: `{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}`,
          },
          {
            status: 401,
            description: 'Account not verified',
            example: `{
  "statusCode": 401,
  "message": "Please verify your account first",
  "error": "Unauthorized"
}`,
          },
          {
            status: 401,
            description: 'Account suspended',
            example: `{
  "statusCode": 401,
  "message": "Account is suspended",
  "error": "Unauthorized"
}`,
          },
        ]}
      />

      {/* Code Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Code Examples</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">cURL</h3>
            <CodeBlock
              language="bash"
              code={`curl -X POST http://localhost:3002/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'`}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">JavaScript (fetch)</h3>
            <CodeBlock
              language="javascript"
              code={`const response = await fetch('http://localhost:3002/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
  }),
});

const data = await response.json();

if (response.ok) {
  // Store tokens
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  console.log('Logged in as:', data.user.name);
} else {
  console.error('Login failed:', data.message);
}`}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Python (requests)</h3>
            <CodeBlock
              language="python"
              code={`import requests

response = requests.post(
    'http://localhost:3002/api/v1/auth/login',
    json={
        'email': 'user@example.com',
        'password': 'SecurePassword123!'
    }
)

if response.status_code == 200:
    data = response.json()
    access_token = data['accessToken']
    refresh_token = data['refreshToken']
    print(f"Logged in as: {data['user']['name']}")
else:
    print(f"Login failed: {response.json()['message']}")`}
            />
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Notes</h2>
        <div className="space-y-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h3 className="font-medium text-blue-400 mb-2">Token Storage</h3>
            <p className="text-sm text-slate-400">
              For web applications, store the access token in memory and the refresh token in an HTTP-only cookie
              for better security. Avoid storing tokens in localStorage for sensitive applications.
            </p>
          </div>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <h3 className="font-medium text-amber-400 mb-2">Rate Limiting</h3>
            <p className="text-sm text-slate-400">
              Login attempts are rate-limited to prevent brute force attacks. After multiple failed attempts,
              you may need to wait before trying again.
            </p>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-8 border-t border-slate-800">
        <Link
          href="/api/auth/register"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Register
        </Link>
        <Link
          href="/api/auth/refresh"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          Refresh Token
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
