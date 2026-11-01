import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    output: 'standalone',
    transpilePackages: ['@mcloud/db', '@mcloud/ui', '@mcloud/auth', '@mcloud/themes', '@mcloud/merchant', '@mcloud/mail'],
    turbopack: {},
    agentRules: false,
    allowedDevOrigins: ['http://localhost:3000', '192.168.1.*', '192.168.0.*', '10.0.0.*'],
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: '*.supabase.co' },
            // Stickers on app/not-found.tsx; without this the 404 page itself throws.
            { protocol: 'https', hostname: 'img.icons8.com', pathname: '/3d-fluency/**' },
        ],
    },
    // /auth/login only ever redirects to the spiritb handoff. As a rule it costs no function,
    // where a page would run one per hit (and per hop of a redirect loop). `handoff=failed`
    // is excluded so the page can show the error. The page still does this in development,
    // where it goes to /dev-login, and for anything these rules don't match.
    // `to` is forwarded as-is: the handoff mint sanitizes it (api/_handoff/tickets.ts).
    async redirects() {
        if (process.env.NODE_ENV !== 'production') return []
        const notFailed = [{ type: 'query' as const, key: 'handoff' }]
        const go = 'https://spiritb.uk/go/mcloud'
        return [
            ...(['returnTo', 'next'] as const).map((key) => ({
                source: '/auth/login',
                has: [{ type: 'query' as const, key, value: '(?<to>.+)' }],
                missing: notFailed,
                destination: `${go}?to=:to`,
                permanent: false,
            })),
            {
                source: '/auth/login',
                missing: [
                    ...notFailed,
                    { type: 'query' as const, key: 'returnTo' },
                    { type: 'query' as const, key: 'next' },
                ],
                destination: `${go}?to=%2Forg`,
                permanent: false,
            },
        ]
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.ignoreWarnings = [
                ...(config.ignoreWarnings ?? []),
                {
                    module: /dpopUtils/,
                    message: /Critical dependency/,
                },
            ]
        }
        return config
    },
}

export default nextConfig
