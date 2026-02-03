import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

interface ErrorCode {
  code: number;
  name: string;
  description: string;
  commonCauses: string[];
  solution: string;
}

const httpErrors: ErrorCode[] = [
  {
    code: 400,
    name: 'Bad Request',
    description: 'The request was invalid or cannot be served. The exact error should be explained in the error payload.',
    commonCauses: [
      'Missing required field in request body',
      'Invalid field value or format',
      'Malformed JSON in request body',
      'Invalid query parameters',
    ],
    solution: 'Check the error message for specific details about which field or parameter caused the error.',
  },
  {
    code: 401,
    name: 'Unauthorized',
    description: 'The request requires authentication. The access token is missing, invalid, or expired.',
    commonCauses: [
      'Missing Authorization header',
      'Invalid or malformed Bearer token',
      'Access token has expired',
      'Invalid credentials during login',
    ],
    solution: 'Ensure you include a valid access token in the Authorization header. If expired, use the refresh token to get a new access token.',
  },
  {
    code: 403,
    name: 'Forbidden',
    description: 'The server understood the request but refuses to authorize it. The user does not have permission.',
    commonCauses: [
      'User trying to access admin-only endpoints',
      'User trying to modify another user\'s resources',
      'Account is suspended or inactive',
      'Insufficient subscription tier',
    ],
    solution: 'Check if the user has the required role or permissions for this action.',
  },
  {
    code: 404,
    name: 'Not Found',
    description: 'The requested resource could not be found.',
    commonCauses: [
      'Invalid resource ID',
      'Resource has been deleted',
      'Incorrect endpoint URL',
      'Resource belongs to another user',
    ],
    solution: 'Verify the resource ID and endpoint URL. Ensure the resource exists and is accessible to the user.',
  },
  {
    code: 409,
    name: 'Conflict',
    description: 'The request could not be completed due to a conflict with the current state of the resource.',
    commonCauses: [
      'Email already registered',
      'Duplicate entry',
      'Resource version conflict',
      'Concurrent modification conflict',
    ],
    solution: 'Check if the resource already exists. For registration, use a different email address.',
  },
  {
    code: 422,
    name: 'Unprocessable Entity',
    description: 'The request was well-formed but contains semantic errors.',
    commonCauses: [
      'Validation failed for one or more fields',
      'Business logic validation failed',
      'Invalid enum value',
      'Value out of allowed range',
    ],
    solution: 'Review the validation errors in the response and correct the input data.',
  },
  {
    code: 429,
    name: 'Too Many Requests',
    description: 'The user has sent too many requests in a given amount of time (rate limiting).',
    commonCauses: [
      'Exceeded API rate limit',
      'Too many failed login attempts',
      'Rapid repeated requests',
    ],
    solution: 'Implement exponential backoff and retry logic. Check the Retry-After header for when to retry.',
  },
  {
    code: 500,
    name: 'Internal Server Error',
    description: 'An unexpected error occurred on the server.',
    commonCauses: [
      'Unhandled server exception',
      'Database connection error',
      'External service failure',
      'Configuration error',
    ],
    solution: 'This is a server-side error. If it persists, contact support with the request details.',
  },
];

const applicationErrors = [
  {
    category: 'Authentication Errors',
    errors: [
      { message: 'Invalid credentials', description: 'Email/password combination is incorrect', code: 401 },
      { message: 'Please verify your account first', description: 'Account exists but email/phone is not verified', code: 401 },
      { message: 'Account is suspended', description: 'User account has been suspended by admin', code: 401 },
      { message: 'Invalid or expired refresh token', description: 'Refresh token is not valid or has expired', code: 401 },
      { message: 'Invalid or expired verification code', description: 'The verification code is incorrect or expired', code: 400 },
      { message: 'Access denied. Admin privileges required.', description: 'User is not an admin but tried to access admin panel', code: 403 },
    ],
  },
  {
    category: 'Registration Errors',
    errors: [
      { message: 'User with this email or phone already exists', description: 'Email or phone is already registered', code: 409 },
      { message: 'Either email or phone is required', description: 'Neither email nor phone was provided', code: 400 },
      { message: 'Password must be at least 8 characters', description: 'Password validation failed', code: 422 },
    ],
  },
  {
    category: 'Subscription Errors',
    errors: [
      { message: 'Subscription not found', description: 'User does not have an active subscription', code: 404 },
      { message: 'Insufficient credits', description: 'User does not have enough credits for the operation', code: 403 },
      { message: 'Payment verification failed', description: 'Razorpay payment could not be verified', code: 400 },
      { message: 'Invalid plan', description: 'The requested plan does not exist', code: 404 },
    ],
  },
  {
    category: 'Business Profile Errors',
    errors: [
      { message: 'Profile not found', description: 'User profile does not exist', code: 404 },
      { message: 'Business profile incomplete', description: 'Required business fields are missing', code: 400 },
    ],
  },
  {
    category: 'Workspace Errors',
    errors: [
      { message: 'Workspace not found', description: 'Workspace does not exist or user has no access', code: 404 },
      { message: 'Page not found', description: 'Workspace page does not exist', code: 404 },
      { message: 'Slug already exists', description: 'A page with this slug already exists', code: 409 },
    ],
  },
  {
    category: 'AI Scraper Errors',
    errors: [
      { message: 'No providers available', description: 'No AI providers are configured', code: 503 },
      { message: 'Provider not available', description: 'Selected provider API key is not configured', code: 503 },
      { message: 'Failed to fetch data', description: 'AI provider request failed', code: 500 },
      { message: 'Invalid URL', description: 'The provided URL is malformed or inaccessible', code: 400 },
    ],
  },
  {
    category: 'Admin Errors',
    errors: [
      { message: 'User not found', description: 'Admin tried to access non-existent user', code: 404 },
      { message: 'Cannot delete yourself', description: 'Admin tried to delete their own account', code: 400 },
      { message: 'Cannot modify system credentials', description: 'Some credentials cannot be modified', code: 403 },
    ],
  },
];

function getStatusIcon(code: number) {
  if (code >= 500) return <XCircle className="w-5 h-5 text-red-400" />;
  if (code >= 400) return <AlertCircle className="w-5 h-5 text-amber-400" />;
  if (code >= 200) return <CheckCircle className="w-5 h-5 text-emerald-400" />;
  return <Info className="w-5 h-5 text-blue-400" />;
}

function getStatusColor(code: number) {
  if (code >= 500) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (code >= 400) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (code >= 200) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
}

export default function ErrorsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="text-sm text-blue-400 mb-2">Reference</p>
        <h1 className="text-4xl font-bold mb-4">Error Codes</h1>
        <p className="text-lg text-slate-400">
          Complete reference of HTTP status codes and application-specific error messages.
        </p>
      </div>

      {/* Error Response Format */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Error Response Format</h2>
        <p className="text-slate-400 mb-4">
          All error responses follow a consistent JSON structure:
        </p>
        <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
          <div className="px-4 py-2 bg-slate-800 border-b border-slate-700">
            <span className="text-sm font-medium text-red-400">Error Response</span>
          </div>
          <pre className="p-4 text-sm overflow-x-auto">
            <code className="text-slate-300">{`{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized",
  "timestamp": "2024-02-01T12:00:00.000Z",
  "path": "/api/v1/auth/login"
}`}</code>
          </pre>
        </div>
      </section>

      {/* HTTP Status Codes */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">HTTP Status Codes</h2>
        <div className="space-y-6">
          {httpErrors.map((error) => (
            <div key={error.code} className="border border-slate-700 rounded-lg overflow-hidden">
              <div className="flex items-center gap-4 p-4 bg-slate-800/50">
                {getStatusIcon(error.code)}
                <span className={`px-2 py-0.5 text-sm font-mono rounded border ${getStatusColor(error.code)}`}>
                  {error.code}
                </span>
                <span className="font-semibold">{error.name}</span>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-slate-400">{error.description}</p>

                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Common Causes:</h4>
                  <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                    {error.commonCauses.map((cause, i) => (
                      <li key={i}>{cause}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-400 mb-1">Solution:</h4>
                  <p className="text-sm text-slate-400">{error.solution}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Application-Specific Errors */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Application-Specific Errors</h2>
        <p className="text-slate-400 mb-6">
          These are specific error messages you may encounter when using the API:
        </p>

        <div className="space-y-8">
          {applicationErrors.map((category) => (
            <div key={category.category}>
              <h3 className="text-lg font-semibold mb-4 text-slate-200">{category.category}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Code</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Message</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.errors.map((error, i) => (
                      <tr key={i} className="border-b border-slate-800">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-xs font-mono rounded ${getStatusColor(error.code)}`}>
                            {error.code}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-red-400 text-xs">{error.message}</code>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{error.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Error Handling Best Practices */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Error Handling Best Practices</h2>
        <div className="space-y-4">
          <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-800">
            <h3 className="font-medium mb-2">1. Always check the status code</h3>
            <p className="text-sm text-slate-400">
              Check the HTTP status code first to determine the type of error before parsing the body.
            </p>
          </div>
          <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-800">
            <h3 className="font-medium mb-2">2. Parse the error message</h3>
            <p className="text-sm text-slate-400">
              The <code className="text-blue-400">message</code> field contains human-readable error details.
            </p>
          </div>
          <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-800">
            <h3 className="font-medium mb-2">3. Implement retry logic for 5xx errors</h3>
            <p className="text-sm text-slate-400">
              Server errors may be transient. Implement exponential backoff for retries.
            </p>
          </div>
          <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-800">
            <h3 className="font-medium mb-2">4. Handle 401 errors gracefully</h3>
            <p className="text-sm text-slate-400">
              When you receive a 401, try refreshing the access token before showing login.
            </p>
          </div>
        </div>
      </section>

      {/* Example Error Handling Code */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Example: Error Handling in JavaScript</h2>
        <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
          <div className="px-4 py-2 bg-slate-800 border-b border-slate-700">
            <span className="text-sm font-medium text-slate-400">error-handler.ts</span>
          </div>
          <pre className="p-4 text-sm overflow-x-auto">
            <code className="text-slate-300">{`async function apiRequest(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();

      switch (response.status) {
        case 401:
          // Try to refresh token
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            return apiRequest(url, options); // Retry
          }
          // Redirect to login
          window.location.href = '/login';
          break;

        case 403:
          throw new Error('You do not have permission');

        case 404:
          throw new Error('Resource not found');

        case 422:
          throw new Error(error.message || 'Validation failed');

        case 429:
          // Rate limited - wait and retry
          const retryAfter = response.headers.get('Retry-After');
          await sleep(parseInt(retryAfter || '5') * 1000);
          return apiRequest(url, options);

        default:
          throw new Error(error.message || 'An error occurred');
      }
    }

    return response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}`}</code>
          </pre>
        </div>
      </section>
    </div>
  );
}
