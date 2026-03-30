import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: undefined,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'api\\.menengai\\.cloud' }],
          destination: '/api/:path*',
        },
      ],
      afterFiles: [],
      fallback: [],
    }
  },
};

export default nextConfig;