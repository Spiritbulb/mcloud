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
  '/api',
  '/auth/',
]


// ─── Store subpaths that require auth (owner/admin routes) ────────────────────
const PROTECTED_STORE_SUBPATHS = [
  '/settings',
  '/orders',
  '/products/new',
  '/dashboard',
]


function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true

  // /store/ paths are public UNLESS they hit a protected owner subpath
  if (pathname.startsWith('/store/')) {
    const afterSlug = pathname.replace(/^\/store\/[^/]+/, '')
    if (PROTECTED_STORE_SUBPATHS.some((sub) => afterSlug.startsWith(sub))) {
      return false
    }
    return true
  }

  return false
}


// ─── Extract subdomain from host ──────────────────────────────────────────────
function getTenantSlug(host: string): string | null {
  if (host.endsWith('.menengai.cloud')) {
    const subdomain = host.replace('.menengai.cloud', '')
    if (!subdomain || subdomain === 'www') return null
    return subdomain
  }
  return null
}


// ─── Build subdomain redirect URL ─────────────────────────────────────────────
function toSubdomainUrl(request: NextRequest, slug: string, remainingPath: string): URL {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return new URL(`${proto}://${slug}.menengai.cloud${remainingPath || '/'}`)
}


// ─── Check if running in production ───────────────────────────────────────────
function isProduction(host: string): boolean {
  return host.endsWith('.menengai.cloud') || host === 'menengai.cloud'
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

    // For subdomain hits already at /store/[slug]/...,
    // still enforce auth on owner routes
    const afterSlug = pathname.replace(/^\/store\/[^/]+/, '')
    if (PROTECTED_STORE_SUBPATHS.some((sub) => afterSlug.startsWith(sub))) {
      const sessionResponse = await updateSession(request)

      if (!sessionResponse) {
        throw new Error('updateSession returned undefined')
      }

      // Intercept any auth redirect and send to root domain login
      if ([302, 307, 308].includes(sessionResponse.status)) {
        const proto = request.headers.get('x-forwarded-proto') ?? 'https'
        const redirectBack = encodeURIComponent(`https://${tenantSlug}.menengai.cloud${pathname}`)
        return NextResponse.redirect(
          `${proto}://menengai.cloud/auth/login?redirect=${redirectBack}`,
          302
        )
      }

      return sessionResponse
    }

    return NextResponse.next()
  }


  // ── Main platform (menengai.cloud or localhost) ───────────────────────────

  // Redirect /store/[slug] → https://[slug].menengai.cloud/
  const storeMatch = pathname.match(/^\/store\/([^/]+)(\/.*)?$/)
  if (storeMatch) {
    const [, slug, rest = '/'] = storeMatch
    if (isProduction(host)) {
      return NextResponse.redirect(toSubdomainUrl(request, slug, rest), 308)
    }
    // In local dev, allow /store/[slug] to render normally
    return NextResponse.next()
  }


  // Redirect /store/[slug]/products/[productSlug] → subdomain
  const productsMatch = pathname.match(/^\/store\/([^/]+)\/products\/([^/]+)(\/.*)?$/)
  if (productsMatch) {
    const [, slug, productSlug, rest = ''] = productsMatch
    if (isProduction(host)) {
      return NextResponse.redirect(
        toSubdomainUrl(request, slug, `/products/${productSlug}${rest}`),
        308
      )
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
