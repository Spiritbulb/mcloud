import { updateSession } from '@/lib/middleware'
import { type NextRequest, NextResponse } from 'next/server'

// ─── Routes that don't require authentication ─────────────────────────────────
const PUBLIC_PATHS = [
  '/',
  '/auth/login',
  '/auth/sign-up',
  '/auth/sign-up-success',
  '/auth/forgot-password',
  '/auth/callback',
  '/auth/confirm',
]

// ─── Path prefixes that are always public ─────────────────────────────────────
const PUBLIC_PREFIXES = [
  '/auth/',
  '/store/',
]

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true
  return false
}

// ─── Extract subdomain from host ──────────────────────────────────────────────
function getTenantSlug(host: string): string | null {
  const isProd = host.endsWith('.menengai.cloud')
  if (isProd) {
    const subdomain = host.replace('.menengai.cloud', '')
    if (subdomain === 'www' || subdomain === 'app' || !subdomain) return null
    return subdomain
  }
  return null
}

// ─── Build subdomain redirect URL ────────────────────────────────────────────
function toSubdomainUrl(request: NextRequest, slug: string, remainingPath: string): URL {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  // remainingPath is the path after stripping /store/[slug] or /[slug]
  const destination = new URL(`${proto}://${slug}.menengai.cloud${remainingPath || '/'}`)
  return destination
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get('host') ?? ''

  // ── Dev tenant simulation via ?_tenant=slug ──────────────────────────────
  const devTenant = searchParams.get('_tenant')

  // ── Resolve tenant slug (incoming subdomain request) ─────────────────────
  const tenantSlug = getTenantSlug(host) ?? devTenant ?? null

  // ── Subdomain hit → rewrite internally to /store/[slug]/... ──────────────
  if (tenantSlug) {
    const url = request.nextUrl.clone()
    if (!pathname.startsWith('/store/')) {
      url.pathname = `/store/${tenantSlug}${pathname}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  // ── Main platform (app.menengai.cloud or localhost) ───────────────────────

  // Redirect /store/[slug] → https://[slug].menengai.cloud/
  const storeMatch = pathname.match(/^\/store\/([^/]+)(\/.*)?$/)
  if (storeMatch) {
    const [, slug, rest = '/'] = storeMatch
    // Only redirect in production (skip on localhost dev)
    if (host.endsWith('.menengai.cloud') || host.startsWith('app.')) {
      return NextResponse.redirect(toSubdomainUrl(request, slug, rest), 308)
    }
    // In local dev, allow the /store/[slug] page to render normally
    return NextResponse.next()
  }

  // Redirect /[slug]/settings → https://[slug].menengai.cloud/settings
  // Uses a heuristic: single dynamic segment followed by /settings (or deeper)
  // Adjust the regex if you have other top-level routes that look like /[slug]/...
  const slugSettingsMatch = pathname.match(/^\/([^/]+)(\/settings(?:\/.*)?|\/settings)$/)
  if (slugSettingsMatch) {
    const [, slug, rest] = slugSettingsMatch
    // Guard against known platform-level paths
    const PLATFORM_SEGMENTS = new Set(['auth', 'store', 'api', 'dashboard', '_next'])
    if (!PLATFORM_SEGMENTS.has(slug)) {
      if (host.endsWith('.menengai.cloud') || host.startsWith('app.')) {
        return NextResponse.redirect(toSubdomainUrl(request, slug, rest), 308)
      }
    }
  }

  // ── Auth guard for all other platform routes ──────────────────────────────
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
