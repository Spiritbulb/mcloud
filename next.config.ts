import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    turbopack: {},
    allowedDevOrigins: ['http://localhost:3000'],
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: '*.supabase.co' },
            { protocol: 'https', hostname: '**' },
        ],
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
