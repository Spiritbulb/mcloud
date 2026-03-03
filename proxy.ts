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


// ─── Paths that must never be redirected to a custom domain ───────────────────
const BYPASS_CUSTOM_DOMAIN_REDIRECT = [
  '/auth/',
  '/api/',
  '/_next/',
]


function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true

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
  internalPathname?: string,
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

  // If an internal pathname is provided, rewrite to it while preserving session cookies
  if (internalPathname) {
    const internalUrl = request.nextUrl.clone()
    internalUrl.pathname = internalPathname
    const rewriteResponse = NextResponse.rewrite(internalUrl)
    sessionResponse.headers.forEach((value, key) => {
      rewriteResponse.headers.set(key, value)
    })
    return rewriteResponse
  }

  return sessionResponse
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
  // ════════════════════════════════════════════════════════════════════════════
  if (!host.endsWith('.menengai.cloud') && host !== 'menengai.cloud' && !host.includes('localhost')) {
    try {
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

      // Pass through internals untouched
      if (BYPASS_CUSTOM_DOMAIN_REDIRECT.some((p) => pathname.startsWith(p))) {
        return NextResponse.next()
      }

      // Strip accidental /store/[slug] prefix
      const storePrefix = `/store/${slug}`
      if (pathname.startsWith(storePrefix)) {
        const cleanPath = pathname.slice(storePrefix.length) || '/'
        return NextResponse.redirect(
          toCustomDomainUrl(request, host, `${cleanPath}${request.nextUrl.search}`),
          308,
        )
      }

      // ── Enforce auth on owner/admin subpaths ──────────────────────────────
      if (PROTECTED_STORE_SUBPATHS.some((sub) => pathname.startsWith(sub))) {
        const sessionResponse = await updateSession(request)

        if (!sessionResponse) {
          throw new Error('updateSession returned undefined')
        }

        if ([302, 307, 308].includes(sessionResponse.status)) {
          const redirectBack = encodeURIComponent(`${proto}://${host}${pathname}`)
          return NextResponse.redirect(
            `${proto}://menengai.cloud/auth/login?redirect=${redirectBack}`,
            302,
          )
        }

        // Authenticated → rewrite to internal route, preserve session cookies
        const internalUrl = request.nextUrl.clone()
        internalUrl.pathname = `/store/${slug}${pathname}`
        const rewriteResponse = NextResponse.rewrite(internalUrl)
        sessionResponse.headers.forEach((value, key) => {
          rewriteResponse.headers.set(key, value)
        })
        return rewriteResponse
      }

      // Public storefront page → rewrite to internal /store/[slug][path]
      return rewriteToStore(request, slug, pathname)

    } catch (err) {
      console.error('[custom-domain] middleware error:', err)
      return NextResponse.json(
        { error: 'Middleware error', detail: String(err) },
        { status: 500 },
      )
    }
  }


  // ════════════════════════════════════════════════════════════════════════════
  // 2. SUBDOMAIN HIT  (slug.menengai.cloud)
  // ════════════════════════════════════════════════════════════════════════════
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

    // Check if this store has a custom domain → redirect there
    if (!devTenant && isProduction(host)) {
      const { createClient } = await import('@/lib/server')
      const supabase = await createClient()
      const { data: store } = await supabase
        .from('stores')
        .select('custom_domain')
        .eq('slug', tenantSlug)
        .single()

      if (store?.custom_domain) {
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

    // Strip double /store/[slug] prefix
    const storePrefix = `/store/${tenantSlug}`
    if (pathname.startsWith(storePrefix)) {
      const cleanPath = pathname.slice(storePrefix.length) || '/'
      return NextResponse.redirect(
        new URL(`${proto}://${tenantSlug}.menengai.cloud${cleanPath}${url.search}`),
        308,
      )
    }

    // Rewrite to internal /store/[slug][path]
    if (!pathname.startsWith('/store/')) {
      url.pathname = `/store/${tenantSlug}${pathname}`
      return NextResponse.rewrite(url)
    }

    // Enforce auth on owner routes
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

  // Products match before generic store match
  const productsMatch = pathname.match(/^\/store\/([^/]+)\/products\/([^/]+)(\/.*)?$/)
  if (productsMatch) {
    const [, slug, productSlug, rest = ''] = productsMatch
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
          toCustomDomainUrl(request, store.custom_domain, `/products/${productSlug}${rest}`),
          308,
        )
      }

      return NextResponse.redirect(
        toSubdomainUrl(request, slug, `/products/${productSlug}${rest}`),
        308,
      )
    }
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
