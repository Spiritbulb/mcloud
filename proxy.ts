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


// ─── Paths that bypass all routing logic ─────────────────────────────────────
const BYPASS_PREFIXES = [
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


function getTenantSlug(host: string): string | null {
  if (host.endsWith('.menengai.cloud')) {
    const subdomain = host.replace('.menengai.cloud', '')
    if (!subdomain || subdomain === 'www') return null
    return subdomain
  }
  return null
}


function toSubdomainUrl(request: NextRequest, slug: string, remainingPath: string): URL {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return new URL(`${proto}://${slug}.menengai.cloud${remainingPath || '/'}`)
}


function toCustomDomainUrl(request: NextRequest, customDomain: string, remainingPath: string): URL {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return new URL(`${proto}://${customDomain}${remainingPath || '/'}`)
}


function isProduction(host: string): boolean {
  return host.endsWith('.menengai.cloud') || host === 'menengai.cloud'
}


export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'


  // ════════════════════════════════════════════════════════════════════════════
  // 1. CUSTOM DOMAIN HIT
  // ════════════════════════════════════════════════════════════════════════════
  if (
    !host.endsWith('.menengai.cloud') &&
    host !== 'menengai.cloud' &&
    !host.includes('localhost')
  ) {
    // Always pass through internals first — before any DB call
    if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.next()
    }

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

    // Strip accidental /store/[slug] prefix someone may have bookmarked
    const storePrefix = `/store/${slug}`
    if (pathname.startsWith(storePrefix)) {
      const cleanPath = pathname.slice(storePrefix.length) || '/'
      return NextResponse.redirect(
        toCustomDomainUrl(request, host, `${cleanPath}${request.nextUrl.search}`),
        308,
      )
    }

    // ── Rewrite request URL to internal /store/[slug][path] ──────────────────
    // This must happen BEFORE updateSession so the session refresh and any
    // downstream rendering operate on a valid Next.js route.
    // We mutate nextUrl directly — this is the standard Vercel platforms pattern.
    const isProtected = PROTECTED_STORE_SUBPATHS.some((sub) => pathname.startsWith(sub))

    request.nextUrl.pathname = `/store/${slug}${pathname}`

    if (isProtected) {
      // updateSession now sees the rewritten URL and valid cookies
      const sessionResponse = await updateSession(request)

      if (!sessionResponse) {
        throw new Error('updateSession returned undefined')
      }

      // Redirect any auth bounces to platform login, not the custom domain
      if ([302, 307, 308].includes(sessionResponse.status)) {
        const redirectBack = encodeURIComponent(`${proto}://${host}${pathname}`)
        return NextResponse.redirect(
          `${proto}://menengai.cloud/auth/login?redirect=${redirectBack}`,
          302,
        )
      }

      return sessionResponse
    }

    // Public storefront page — just rewrite
    return NextResponse.rewrite(request.nextUrl)
  }


  // ════════════════════════════════════════════════════════════════════════════
  // 2. SUBDOMAIN HIT  (slug.menengai.cloud)
  // ════════════════════════════════════════════════════════════════════════════
  const devTenant = searchParams.get('_tenant')
  const tenantSlug = getTenantSlug(host) ?? devTenant ?? null

  if (tenantSlug) {
    const url = request.nextUrl.clone()

    // Pass through internals
    if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.next()
    }

    // If this store has a custom domain → redirect there permanently
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

    // Rewrite to internal route
    if (!pathname.startsWith('/store/')) {
      url.pathname = `/store/${tenantSlug}${pathname}`
      return NextResponse.rewrite(url)
    }

    // Enforce auth on owner routes
    const afterSlug = pathname.replace(/^\/store\/[^/]+/, '')
    if (PROTECTED_STORE_SUBPATHS.some((sub) => afterSlug.startsWith(sub))) {
      const sessionResponse = await updateSession(request)

      if (!sessionResponse) {
        throw new Error('updateSession returned undefined')
      }

      if ([302, 307, 308].includes(sessionResponse.status)) {
        const redirectBack = encodeURIComponent(`${proto}://${tenantSlug}.menengai.cloud${pathname}`)
        return NextResponse.redirect(
          `${proto}://menengai.cloud/auth/login?redirect=${redirectBack}`,
          302,
        )
      }

      return sessionResponse
    }

    return NextResponse.next()
  }


  // ════════════════════════════════════════════════════════════════════════════
  // 3. MAIN PLATFORM  (menengai.cloud or localhost)
  // ════════════════════════════════════════════════════════════════════════════

  // Products match must come before generic store match
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

      return NextResponse.redirect(
        store?.custom_domain
          ? toCustomDomainUrl(request, store.custom_domain, `/products/${productSlug}${rest}`)
          : toSubdomainUrl(request, slug, `/products/${productSlug}${rest}`),
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

      return NextResponse.redirect(
        store?.custom_domain
          ? toCustomDomainUrl(request, store.custom_domain, rest)
          : toSubdomainUrl(request, slug, rest),
        308,
      )
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
