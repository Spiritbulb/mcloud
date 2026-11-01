import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    output: 'standalone',
    transpilePackages: ['@mcloud/db', '@mcloud/ui', '@mcloud/themes', '@mcloud/auth', '@mcloud/merchant', '@mcloud/mail'],
    turbopack: {},
    agentRules: false,
    allowedDevOrigins: ['http://localhost:3001', 'http://localhost:3000'],
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: '*.supabase.co' },
        ],
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    // Only this app may frame us: the Editor lives here and frames its
                    // own preview. Nobody else may, which also stops clickjacking.
                    { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
                ],
            },
        ]
    },
}

export default nextConfig
