import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    output: 'standalone',
    transpilePackages: ['@mcloud/db', '@mcloud/ui', '@mcloud/themes'],
    turbopack: {},
    allowedDevOrigins: ['http://localhost:3001', 'http://localhost:3000'],
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: '*.supabase.co' },
            { protocol: 'https', hostname: '**' },
        ],
    },
    async headers() {
        const admin = process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? 'http://localhost:3000'
        return [
            {
                source: '/:path*',
                headers: [
                    // The Editor frames us. Nobody else may. The storefront set no
                    // framing headers before preview existed, so it could be
                    // clickjacked: making framing load-bearing is the moment to fix it.
                    { key: 'Content-Security-Policy', value: `frame-ancestors 'self' ${admin}` },
                ],
            },
        ]
    },
}

export default nextConfig
