import { authMiddleware, prepareMiddleware } from '@mcloud/auth/server'
import type { AuthSession } from '@mcloud/auth/types'
import { type NextRequest, NextResponse } from 'next/server'


// ─── Response builders ────────────────────────────────────────────────────────
// Forward the auth provider's request headers (if any) on responses that render
// downstream, so server-side session reads (e.g. WorkOS withAuth) see the session.

function nextResponse(authHeaders?: Headers): NextResponse {
  return authHeaders
    ? NextResponse.next({ request: { headers: authHeaders } })
    : NextResponse.next()
}

function rewriteResponse(url: URL, authHeaders?: Headers): NextResponse {
  return authHeaders
    ? NextResponse.rewrite(url, { request: { headers: authHeaders } })
    : NextResponse.rewrite(url)
}


// ─── Route Classification Constants ───────────────────────────────────────────

/**
 * Owner-only subpaths — require auth, served via /admin.
 * Hitting these on a storefront path/custom domain redirects to /admin.
 */
const PROTECTED_SUBPATHS = ['/settings', '/orders', '/products/new'] as const

/**
 * Prefixes that bypass all tenant/proxy logic entirely.
 */
const BYPASS_PREFIXES = ['/auth/', '/_next/', '/api/', '/callback', '/.well-known/'] as const


// ─── Helpers ──────────────────────────────────────────────────────────────────

function storefrontRedirect(slug: string, subpath: string, search: string): NextResponse {
  const storefrontOrigin = process.env.NEXT_PUBLIC_STOREFRONT_ORIGIN ?? 'http://localhost:3001'
  const path = subpath === '/' ? '' : subpath
  return NextResponse.redirect(`${storefrontOrigin}/store/${slug}${path}${search}`, 307)
}

/**
 * Platform apex domains. We're migrating from menengai.cloud → mcloud.co.ke; both
 * point at prod during the transition, so the app must recognise either as "the
 * platform host" (not a merchant custom domain). menengai.cloud will be dropped
 * once the migration completes — remove it here and the recognition logic follows.
 */
const PLATFORM_APEX_DOMAINS = ['mcloud.co.ke', 'menengai.cloud'] as const

/** True when `host` is a platform apex or any of its subdomains (incl. www). */
function isPlatformHost(host: string): boolean {
  return PLATFORM_APEX_DOMAINS.some(
    (apex) => host === apex || host.endsWith(`.${apex}`),
  )
}



// ─── Proxy Entry Point ────────────────────────────────────────────────────────

export async function proxy(request: NextRequest): Promise<NextResponse> {
  // Resolve auth once per request (provider-specific): session for gating below,
  // request headers to forward downstream, and a finalize step for response headers.
  const { session, requestHeaders, finalize } = await prepareMiddleware(request)
  return finalize(await handle(request, session, requestHeaders))
}

async function handle(
  request: NextRequest,
  session: AuthSession | null,
  authHeaders?: Headers,
): Promise<NextResponse> {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const search = request.nextUrl.search


  // ── 1. Auth / API / _next Bypass ─────────────────────────────────────────
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (pathname.startsWith('/auth/')) {
      const res = await authMiddleware(request)
      // /auth/* routes render in-app now (magic-code login posts to /api/auth/*); the
      // provider's authMiddleware no longer redirects them. It may still return a
      // redirect for other provider flows, so honor a location header if present;
      // otherwise render normally with the session request headers forwarded so
      // withAuth() works on the page.
      return res.headers.has('location') ? res : nextResponse(authHeaders)
    }

    let response = nextResponse(authHeaders)

    if (pathname.startsWith('/api/')) {
      const origin = request.headers.get('origin')
      if (request.method === 'OPTIONS') {
        response = new NextResponse(null, { status: 200 })
      }
      // The web auth routes set the session cookie — they must NOT be callable
      // cross-origin with credentials (CSRF). They're same-origin form posts, so
      // skip the reflective CORS headers for them. Mobile/data routes (bearer auth)
      // keep the reflection.
      const isWebAuthRoute = pathname.startsWith('/api/auth/')
      if (origin && !isWebAuthRoute) {
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
      }
    }

    return response
  }


  // ── 2. Merchant Subpaths (/settings, /orders, /products/new) ────────────────
  // These are store-contextual owner paths. When hit on the platform host they
  // need the active store slug to redirect to the storefront app's owner routes.
  if (PROTECTED_SUBPATHS.some((p) => pathname.startsWith(p))) {
    if (!session?.user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url, 302)
    }

    const activeSlug = request.cookies.get('mng_active_store')?.value
    if (!activeSlug) {
      const url = request.nextUrl.clone()
      url.pathname = '/org'
      url.searchParams.set('next', pathname)
      return rewriteResponse(url, authHeaders)
    }
    return storefrontRedirect(activeSlug, pathname, search)
  }


  // ── 3. Admin Console (/admin/*) ───────────────────────────────────────────
  // Platform admin panel. Role enforcement (role=admin) is in the /admin layout.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!session?.user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url, 302)
    }
    return nextResponse(authHeaders)
  }


  // ── 4. Storefront dispatch (/s/{slug} and /store/{slug}) ─────────────────
  // The web app (mcloud.co.ke) never serves storefront pages — those live on
  // shop.mcloud.co.ke/{slug} or the merchant's custom domain, both handled by
  // the storefront app. Any /s/ or /store/ path landing here gets forwarded.
  //
  // /s/{slug} is the TWA-safe shortlink: out-of-scope for the Android shell so
  // it opens in the real browser, which then lands on shop.mcloud.co.ke/{slug}.
  const slugMatch =
    pathname.match(/^\/s\/([^/]+)(\/.*)?$/) ??
    pathname.match(/^\/store\/([^/]+)(\/.*)?$/)

  if (slugMatch) {
    const [, slug, subpath = '/'] = slugMatch
    return storefrontRedirect(slug, subpath, search)
  }


  // ── 5. Platform ───────────────────────────────────────────────────────────

  // Logged-in users skip the marketing homepage and go straight to their org.
  if (pathname === '/' && session?.user) {
    const url = request.nextUrl.clone()
    url.pathname = '/org'
    return NextResponse.redirect(url, 307)
  }

  return nextResponse(authHeaders)
}


// ─── Matcher Config ───────────────────────────────────────────────────────────

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
