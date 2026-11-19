import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@mcloud/auth', '@mcloud/ui', '@mcloud/mail'],
  turbopack: {},
  agentRules: false,
  experimental: { agentUpgrade: 'security' },
}

export default nextConfig
