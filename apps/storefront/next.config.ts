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

        // frame-ancestors matches by ORIGIN — scheme, host AND port — exactly. Two
        // near-misses have each silently blocked the preview with nothing in the UI
        // to explain why, and both trace to the admin's REAL origin differing from
        // the configured one by a detail:
        //   - scheme: admin is https, env said http (it 308s http -> https)
        //   - host:   admin serves from www.mcloud.co.ke, env said mcloud.co.ke
        //             (mcloud.co.ke 308s -> www.)
        // A one-token config difference should not be able to kill the feature, so
        // for a real host we trust both schemes AND the www/apex pair. It gives
        // nothing away: whichever variant is not the canonical one only ever
        // redirects to the one that is, so it can never actually do the framing.
        // Localhost keeps its single literal value, where http is the real scheme.
        const origins = /^https?:\/\/localhost(:\d+)?$/.test(admin)
            ? [admin]
            : expandOrigins(admin)

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

/**
 * Every scheme (http/https) × host (www./apex) variant of an origin, deduped.
 * So `http://mcloud.co.ke` yields all four of {http,https}://{,www.}mcloud.co.ke,
 * which means the CSP matches the admin however Vercel ends up canonicalising it.
 */
function expandOrigins(origin: string): string[] {
    const m = /^(https?):\/\/(.+)$/.exec(origin)
    if (!m) return [origin]
    const host = m[2].replace(/^www\./, '')
    const hosts = [host, `www.${host}`]
    const out: string[] = []
    for (const scheme of ['https', 'http']) {
        for (const h of hosts) out.push(`${scheme}://${h}`)
    }
    return [...new Set(out)]
}

export default nextConfig
