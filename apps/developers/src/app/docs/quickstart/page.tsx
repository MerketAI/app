import { CodeBlock } from '@/components/docs/CodeBlock';

export default function QuickStartPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="text-sm text-blue-400 mb-2">Getting Started</p>
        <h1 className="text-4xl font-bold mb-4">Quick Start</h1>
        <p className="text-lg text-slate-400">
          Get up and running with the Jasper API in under 5 minutes.
        </p>
      </div>

      {/* Step 1 */}
      <section className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">1</span>
          <h2 className="text-2xl font-semibold">Create an Account</h2>
        </div>
        <p className="text-slate-400 mb-4 ml-12">
          First, register for a Jasper account. You can do this through the web interface or via the API:
        </p>
        <div className="ml-12">
          <CodeBlock
            title="Register a new account"
            language="bash"
            code={`curl -X POST http://localhost:3002/api/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "developer@example.com",
    "password": "SecurePassword123!",
    "name": "Developer Name"
  }'`}
          />
        </div>
      </section>

      {/* Step 2 */}
      <section className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">2</span>
          <h2 className="text-2xl font-semibold">Get Your Access Token</h2>
        </div>
        <p className="text-slate-400 mb-4 ml-12">
          After verifying your email, log in to receive your access token:
        </p>
        <div className="ml-12 space-y-4">
          <CodeBlock
            title="Login request"
            language="bash"
            code={`curl -X POST http://localhost:3002/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "developer@example.com",
    "password": "SecurePassword123!"
  }'`}
          />
          <CodeBlock
            title="Response"
            language="json"
            code={`{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "7f736123-07e8-4746-976f-0914edf391fc",
  "expiresIn": 900,
  "user": {
    "id": "8401e8c7-5caa-4ed5-ba0f-00928ffbb96d",
    "email": "developer@example.com",
    "name": "Developer Name",
    "role": "USER"
  }
}`}
          />
        </div>
      </section>

      {/* Step 3 */}
      <section className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">3</span>
          <h2 className="text-2xl font-semibold">Make Authenticated Requests</h2>
        </div>
        <p className="text-slate-400 mb-4 ml-12">
          Use your access token in the Authorization header for all authenticated requests:
        </p>
        <div className="ml-12 space-y-4">
          <CodeBlock
            title="Get user profile"
            language="bash"
            code={`curl -X GET http://localhost:3002/api/v1/auth/me \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`}
          />
          <CodeBlock
            title="Get subscription details"
            language="bash"
            code={`curl -X GET http://localhost:3002/api/v1/subscriptions/me \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`}
          />
        </div>
      </section>

      {/* Step 4 */}
      <section className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">4</span>
          <h2 className="text-2xl font-semibold">Update Business Profile</h2>
        </div>
        <p className="text-slate-400 mb-4 ml-12">
          Set up your business profile to enable AI-powered features:
        </p>
        <div className="ml-12">
          <CodeBlock
            title="Update business profile"
            language="bash"
            code={`curl -X PUT http://localhost:3002/api/v1/users/business \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "businessName": "Acme Inc",
    "industry": "Technology",
    "description": "We build amazing software solutions",
    "targetAudience": "Small to medium businesses"
  }'`}
          />
        </div>
      </section>

      {/* SDK Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">SDK Examples</h2>
        <p className="text-slate-400 mb-6">
          Here are examples using popular programming languages:
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">JavaScript / TypeScript</h3>
            <CodeBlock
              language="typescript"
              code={`import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3002/api/v1',
  headers: { 'Content-Type': 'application/json' }
});

// Login
const { data } = await api.post('/auth/login', {
  email: 'developer@example.com',
  password: 'SecurePassword123!'
});

// Set token for subsequent requests
api.defaults.headers.common['Authorization'] = \`Bearer \${data.accessToken}\`;

// Get user profile
const profile = await api.get('/auth/me');
console.log(profile.data);`}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Python</h3>
            <CodeBlock
              language="python"
              code={`import requests

BASE_URL = 'http://localhost:3002/api/v1'

# Login
response = requests.post(f'{BASE_URL}/auth/login', json={
    'email': 'developer@example.com',
    'password': 'SecurePassword123!'
})
tokens = response.json()

# Set headers for authenticated requests
headers = {
    'Authorization': f'Bearer {tokens["accessToken"]}',
    'Content-Type': 'application/json'
}

# Get user profile
profile = requests.get(f'{BASE_URL}/auth/me', headers=headers)
print(profile.json())`}
            />
          </div>
        </div>
      </section>

      {/* Token Refresh */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Token Refresh</h2>
        <p className="text-slate-400 mb-4">
          Access tokens expire after 15 minutes. Use the refresh token to get a new access token:
        </p>
        <CodeBlock
          title="Refresh token"
          language="bash"
          code={`curl -X POST http://localhost:3002/api/v1/auth/refresh \\
  -H "Content-Type: application/json" \\
  -d '{
    "refreshToken": "7f736123-07e8-4746-976f-0914edf391fc"
  }'`}
        />
      </section>

      {/* Next Steps */}
      <section className="p-6 bg-slate-800/30 rounded-lg border border-slate-700">
        <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
        <ul className="space-y-2 text-slate-400">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <a href="/docs/authentication" className="hover:text-blue-400 transition-colors">
              Learn about authentication in depth
            </a>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <a href="/api" className="hover:text-blue-400 transition-colors">
              Explore the full API reference
            </a>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <a href="/errors" className="hover:text-blue-400 transition-colors">
              Understand error codes and handling
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
