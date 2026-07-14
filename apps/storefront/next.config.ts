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

        // frame-ancestors matches by ORIGIN — scheme, host AND port. So
        // "http://mcloud.co.ke" does NOT permit an admin served from
        // "https://mcloud.co.ke", and the preview iframe is silently blocked with
        // nothing in the UI to explain why. A missing "s" in an env var should not
        // be able to kill the feature, so allow both schemes for a real host.
        //
        // This gives nothing away: the admin 308-redirects http -> https, so an
        // http origin can never actually do the framing. Localhost keeps its single
        // literal value, where http IS the real scheme.
        const origins = /^https?:\/\/localhost(:\d+)?$/.test(admin)
            ? [admin]
            : [admin.replace(/^http:\/\//, 'https://'), admin.replace(/^https:\/\//, 'http://')]

        return [
            {
                source: '/:path*',
                headers: [
                    // The Editor frames us. Nobody else may. The storefront set no
                    // framing headers before preview existed, so it could be
                    // clickjacked: making framing load-bearing is the moment to fix it.
                    {
                        key: 'Content-Security-Policy',
                        value: `frame-ancestors 'self' ${[...new Set(origins)].join(' ')}`,
                    },
                ],
            },
        ]
    },
}

export default nextConfig
