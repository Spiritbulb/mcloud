import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    output: 'standalone',
    transpilePackages: ['@mcloud/db', '@mcloud/ui', '@mcloud/themes', '@mcloud/auth', '@mcloud/merchant', '@mcloud/mail'],
    turbopack: {},
    agentRules: false,
    experimental: { agentUpgrade: 'security' },
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
                // Everything but /api/media, which needs a stricter policy of its own (below).
                source: '/((?!api/media/).*)',
                headers: [
                    // Only this app may frame us: the Editor lives here and frames its
                    // own preview. Nobody else may, which also stops clickjacking.
                    { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
                ],
            },
            {
                // Uploaded images served from this origin (app/api/media): nothing in a response
                // may run, even if a file is not really the image it claims to be.
                source: '/api/media/:path*',
                headers: [
                    { key: 'Content-Security-Policy', value: "default-src 'none'; sandbox; frame-ancestors 'self'" },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                ],
            },
        ]
    },
}

export default nextConfig
