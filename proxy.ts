import { updateSession } from '@/lib/middleware'
import { NextRequest, NextResponse } from 'next/server'


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


// ─── Paths/prefixes that must never be redirected to a custom domain ──────────
// (internals that need to stay on the subdomain/platform origin)
const BYPASS_CUSTOM_DOMAIN_REDIRECT = [
  '/auth/',
  '/api/',
  '/_next/',
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


// ─── Extract subdomain slug from host ────────────────────────────────────────
function getTenantSlug(host: string): string | null {
  if (host.endsWith('.menengai.cloud')) {
    const subdomain = host.replace('.menengai.cloud', '')
    if (!subdomain || subdomain === 'www') return null
    return subdomain
  }
  return null
}


// ─── Build a URL on the subdomain ────────────────────────────────────────────
function toSubdomainUrl(request: NextRequest, slug: string, remainingPath: string): URL {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return new URL(`${proto}://${slug}.menengai.cloud${remainingPath || '/'}`)
}


// ─── Build a URL on a custom domain ──────────────────────────────────────────
function toCustomDomainUrl(request: NextRequest, customDomain: string, remainingPath: string): URL {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return new URL(`${proto}://${customDomain}${remainingPath || '/'}`)
}


// ─── Check if running in production ──────────────────────────────────────────
function isProduction(host: string): boolean {
  return host.endsWith('.menengai.cloud') || host === 'menengai.cloud'
}


// ─── Shared: enforce auth on a protected path, redirect to platform login ────
async function enforceAuth(
  request: NextRequest,
  proto: string,
  redirectBackUrl: string,
): Promise<NextResponse> {
  const sessionResponse = await updateSession(request)

  if (!sessionResponse) {
    throw new Error('updateSession returned undefined')
  }

  if ([302, 307, 308].includes(sessionResponse.status)) {
    const redirectBack = encodeURIComponent(redirectBackUrl)
    return NextResponse.redirect(
      `${proto}://menengai.cloud/auth/login?redirect=${redirectBack}`,
      302,
    )
  }

  // Rewrite response to serve the internal /store/[slug]/... route
  // while keeping the custom domain URL visible in the browser
  return NextResponse.rewrite(request.nextUrl, {
    headers: sessionResponse.headers, // preserve Set-Cookie / session headers
  })
}


// ─── Shared: rewrite a request to /store/[slug][path] ────────────────────────
function rewriteToStore(request: NextRequest, slug: string, path: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = `/store/${slug}${path === '/' ? '' : path}`
  return NextResponse.rewrite(url)
}


export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'


  // ════════════════════════════════════════════════════════════════════════════
  // 1. CUSTOM DOMAIN HIT
  //    Any host that is not *.menengai.cloud, not the root, and not localhost
  // ════════════════════════════════════════════════════════════════════════════
  if (!host.endsWith('.menengai.cloud') && host !== 'menengai.cloud' && !host.includes('localhost')) {
    const { createClient } = await import('@/lib/server')
    const supabase = await createClient()
    const { data: store } = await supabase
      .from('stores')
      .select('slug')
      .eq('custom_domain', host)
      .single()

    if (!store?.slug) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const slug = store.slug

    // Pass through internals untouched — cookies/session still flow normally
    if (BYPASS_CUSTOM_DOMAIN_REDIRECT.some((p) => pathname.startsWith(p))) {
      return NextResponse.next()
    }

    // Strip any accidental /store/[slug] prefix if someone lands here with it
    // e.g. shop.example.com/store/myshop/products → shop.example.com/products
    const storePrefix = `/store/${slug}`
    if (pathname.startsWith(storePrefix)) {
      const cleanPath = pathname.slice(storePrefix.length) || '/'
      return NextResponse.redirect(
        toCustomDomainUrl(request, host, `${cleanPath}${request.nextUrl.search}`),
        308,
      )
    }

    // Enforce auth on owner/admin subpaths — rewrite first so updateSession
    // operates on a valid /store/[slug]/settings route, not a bare /settings
    if (PROTECTED_STORE_SUBPATHS.some((sub) => pathname.startsWith(sub))) {
      const rewritten = request.nextUrl.clone()
      rewritten.pathname = `/store/${slug}${pathname}`
      const rewrittenRequest = new NextRequest(rewritten, request)
      return enforceAuth(rewrittenRequest, proto, `${proto}://${host}${pathname}`)
    }


    // Public storefront page → rewrite internally to /store/[slug][path]
    return rewriteToStore(request, slug, pathname)
  }


  // ════════════════════════════════════════════════════════════════════════════
  // 2. SUBDOMAIN HIT  (slug.menengai.cloud)
  //    Subdomain is a temporary address. If the store has a custom domain,
  //    redirect there. Otherwise serve normally.
  // ════════════════════════════════════════════════════════════════════════════

  // Dev tenant simulation via ?_tenant=slug
  const devTenant = searchParams.get('_tenant')
  const tenantSlug = getTenantSlug(host) ?? devTenant ?? null

  if (tenantSlug) {
    const url = request.nextUrl.clone()

    // Pass through internals untouched
    if (
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/')
    ) {
      return NextResponse.next()
    }

    // ── Check if this store has a custom domain → redirect there ─────────────
    // Skip the DB call for dev ?_tenant simulation to keep local DX fast
    if (!devTenant && isProduction(host)) {
      const { createClient } = await import('@/lib/server')
      const supabase = await createClient()
      const { data: store } = await supabase
        .from('stores')
        .select('custom_domain')
        .eq('slug', tenantSlug)
        .single()

      if (store?.custom_domain) {
        // Strip /store/[slug] prefix if present before redirecting
        const storePrefix = `/store/${tenantSlug}`
        const cleanPath = pathname.startsWith(storePrefix)
          ? pathname.slice(storePrefix.length) || '/'
          : pathname

        return NextResponse.redirect(
          toCustomDomainUrl(request, store.custom_domain, `${cleanPath}${url.search}`),
          308,
        )
      }
    }

    // ── No custom domain — serve the store on the subdomain ──────────────────

    // Strip double /store/[slug] prefix (e.g. slug.menengai.cloud/store/slug/...)
    const storePrefix = `/store/${tenantSlug}`
    if (pathname.startsWith(storePrefix)) {
      const cleanPath = pathname.slice(storePrefix.length) || '/'
      return NextResponse.redirect(
        new URL(`${proto}://${tenantSlug}.menengai.cloud${cleanPath}${url.search}`),
        308,
      )
    }

    // Rewrite non-store paths to internal /store/[slug][path]
    if (!pathname.startsWith('/store/')) {
      url.pathname = `/store/${tenantSlug}${pathname}`
      return NextResponse.rewrite(url)
    }

    // Enforce auth on owner routes still at /store/[slug]/...
    const afterSlug = pathname.replace(/^\/store\/[^/]+/, '')
    if (PROTECTED_STORE_SUBPATHS.some((sub) => afterSlug.startsWith(sub))) {
      return enforceAuth(
        request,
        proto,
        `${proto}://${tenantSlug}.menengai.cloud${pathname}`,
      )
    }

    return NextResponse.next()
  }


  // ════════════════════════════════════════════════════════════════════════════
  // 3. MAIN PLATFORM  (menengai.cloud or localhost)
  // ════════════════════════════════════════════════════════════════════════════

  // /store/[slug]/products/[productSlug] must be matched BEFORE the generic
  // /store/[slug] rule or the latter swallows it on production redirects.
  const productsMatch = pathname.match(/^\/store\/([^/]+)\/products\/([^/]+)(\/.*)?$/)
  if (productsMatch) {
    const [, slug, productSlug, rest = ''] = productsMatch
    if (isProduction(host)) {
      // Prefer custom domain if one exists
      const { createClient } = await import('@/lib/server')
      const supabase = await createClient()
      const { data: store } = await supabase
        .from('stores')
        .select('custom_domain')
        .eq('slug', slug)
        .single()

      if (store?.custom_domain) {
        return NextResponse.redirect(
          toCustomDomainUrl(request, store.custom_domain, `/products/${productSlug}${rest}`),
          308,
        )
      }

      return NextResponse.redirect(
        toSubdomainUrl(request, slug, `/products/${productSlug}${rest}`),
        308,
      )
    }
    // Local dev: fall through and render normally
  }

  // /store/[slug] → prefer custom domain, else subdomain
  const storeMatch = pathname.match(/^\/store\/([^/]+)(\/.*)?$/)
  if (storeMatch) {
    const [, slug, rest = '/'] = storeMatch
    if (isProduction(host)) {
      const { createClient } = await import('@/lib/server')
      const supabase = await createClient()
      const { data: store } = await supabase
        .from('stores')
        .select('custom_domain')
        .eq('slug', slug)
        .single()

      if (store?.custom_domain) {
        return NextResponse.redirect(
          toCustomDomainUrl(request, store.custom_domain, rest),
          308,
        )
      }

      return NextResponse.redirect(toSubdomainUrl(request, slug, rest), 308)
    }
    // Local dev: render normally
    return NextResponse.next()
  }

  // Auth guard for all other platform routes
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
