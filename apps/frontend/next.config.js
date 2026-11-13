/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The post renderer is a workspace package shipped as compiled CommonJS;
  // letting Next compile it keeps module interop out of the equation.
  transpilePackages: ['@jasper/post-renderer'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['localhost', 'graph.facebook.com', 'platform-lookaside.fbsbx.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
