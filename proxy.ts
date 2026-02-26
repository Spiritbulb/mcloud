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
  // Dev fallback: check for ?_tenant=slug query param
  // Prod: extract from subdomain
  const isProd = host.endsWith('.menengai.cloud')
  if (isProd) {
    const subdomain = host.replace('.menengai.cloud', '')
    // Ignore www and app (main platform domain)
    if (subdomain === 'www' || subdomain === 'app' || !subdomain) return null
    return subdomain
  }
  return null
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get('host') ?? ''

  // ── Dev tenant simulation via ?_tenant=slug ──────────────────────────────
  const devTenant = searchParams.get('_tenant')

  // ── Resolve tenant slug ───────────────────────────────────────────────────
  const tenantSlug = getTenantSlug(host) ?? devTenant ?? null


  // The rewrite target is now /store/[slug] to avoid confusion with platform routes
  if (tenantSlug) {
    const url = request.nextUrl.clone()
    if (!pathname.startsWith('/store/')) {
      url.pathname = `/store/${tenantSlug}${pathname}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }


  // ── Main platform domain — apply auth session ─────────────────────────────
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
