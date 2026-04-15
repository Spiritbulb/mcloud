import { auth0 } from '@/lib/auth0'
import { type NextRequest, NextResponse } from 'next/server'

// ─── Route Classification Constants ───────────────────────────────────────────

/**
 * Paths that require an authenticated store owner session.
 * Requests to these on a subdomain are gated behind Auth0 login.
 */
const PROTECTED_SUBPATHS = ['/settings', '/orders', '/products/new'] as const

/**
 * Prefixes that bypass all tenant/proxy logic entirely.
 * Auth routes are handed to auth0.middleware; API and Next internals pass through.
 */
const BYPASS_PREFIXES = ['/auth/', '/api/', '/_next/'] as const

/**
 * Paths where the owner "Edit your store" banner should NOT be injected —
 * either because they are already in the dashboard, or are infra routes.
 */
const BANNER_EXCLUDED_PREFIXES = [
  '/settings', '/dashboard', '/orders', '/products/new',
  '/auth/', '/api/', '/onboarding',
] as const

/**
 * Reserved subdomains that are NOT tenant slugs.
 * Requests to these are handled by their own logic (CORS, pass-through, etc.).
 */
const SYSTEM_SUBDOMAINS = new Set(['status', 'api', 'admin', 'mail'])

/**
 * API paths that are publicly accessible on the `api` subdomain
 * without requiring an Auth0 session.
 */
const PUBLIC_API_PREFIXES = [
  '/store/',
  '/api/health',
  '/api/store/',
  '/api/categories',
] as const

// ─── CORS Headers ─────────────────────────────────────────────────────────────

/** Allowed CORS methods on the api subdomain */
const CORS_METHODS = 'GET, POST, PUT, DELETE, OPTIONS'
/** Allowed CORS request headers */
const CORS_HEADERS = 'Content-Type, Authorization'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts a tenant slug from a menengai.cloud subdomain host string.
 * Returns null for system subdomains (api, admin, etc.) or the root domain.
 *
 * @example getTenantSlug('acme.menengai.cloud') // → 'acme'
 * @example getTenantSlug('api.menengai.cloud')  // → null (system)
 */
function getTenantSlug(host: string): string | null {
  if (!host.endsWith('.menengai.cloud')) return null
  const sub = host.slice(0, -'.menengai.cloud'.length)
  return sub && !SYSTEM_SUBDOMAINS.has(sub) ? sub : null
}

/**
 * Builds a URL pointing to a slug's subdomain on menengai.cloud.
 * Preserves the original protocol (http in dev, https in prod).
 */
function toSubdomainUrl(request: NextRequest, slug: string, path: string): URL {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return new URL(`${proto}://${slug}.menengai.cloud${path || '/'}`)
}

/**
 * Builds a URL pointing to a store's custom domain.
 * Preserves the original protocol.
 */
function toCustomDomainUrl(request: NextRequest, domain: string, path: string): URL {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return new URL(`${proto}://${domain}${path || '/'}`)
}

/**
 * Returns true when the request originates from a production menengai.cloud host
 * (root or subdomain). Used to gate subdomain redirects that shouldn't fire
 * in localhost / LAN development.
 */
function isProduction(host: string): boolean {
  return host === 'menengai.cloud' || host.endsWith('.menengai.cloud')
}

/**
 * Returns true when the given origin is a first-party menengai.cloud origin.
 * Used to decide whether to echo back CORS headers.
 */
function isAllowedCorsOrigin(origin: string): boolean {
  return origin === 'https://menengai.cloud' || origin.endsWith('.menengai.cloud')
}

// ─── Owner Banner ─────────────────────────────────────────────────────────────

/**
 * Generates a self-contained inline <script> that injects the owner preview banner.
 * The banner appears after a short random delay and is dismissed per-session.
 * All logic is encoded in a single IIFE to avoid global namespace pollution.
 *
 * @param dashboardUrl - Absolute URL the "Edit your store →" CTA points to
 * @param pageType     - Affects delay timing (homepage/storefront get a longer delay)
 */
function buildBannerScript(
  dashboardUrl: string,
  pageType: 'homepage' | 'storefront' | 'other',
): string {
  // NOTE: This script is injected via a response header (x-inject-owner-banner)
  // and decoded + appended by a layout component — NOT eval'd directly.
  return `<script data-dashboard="${dashboardUrl}" data-page="${pageType}">(function(){var STORAGE_KEY='mng_banner_dismissed';var DELAY_PAGES=['homepage','storefront'];var script=document.currentScript;var dashboardUrl=script&&script.dataset.dashboard||'/settings';var pageType=script&&script.dataset.page||'other';if(sessionStorage.getItem(STORAGE_KEY))return;if(window.location.pathname.includes('/settings'))return;var delay=DELAY_PAGES.includes(pageType)?2000+Math.random()*3000:800;function inject(){var banner=document.createElement('div');banner.id='mng-owner-banner';banner.innerHTML='<style>#mng-owner-banner{position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;height:36px;background:#1c2228;color:#f5f0eb;font-family:ui-monospace,monospace;font-size:12px;letter-spacing:.01em;transform:translateY(-100%);transition:transform .25s cubic-bezier(.16,1,.3,1);box-shadow:0 1px 0 rgba(255,255,255,.06)}#mng-owner-banner.mng-visible{transform:translateY(0)}#mng-owner-banner a{color:#c9a96e;text-decoration:none;font-weight:500;white-space:nowrap;flex-shrink:0}#mng-owner-banner a:hover{text-decoration:underline;text-underline-offset:3px}#mng-owner-banner .mng-label{opacity:.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#mng-owner-banner button{background:none;border:none;color:#f5f0eb;opacity:.4;cursor:pointer;padding:4px;font-size:14px;line-height:1;flex-shrink:0;transition:opacity .15s}#mng-owner-banner button:hover{opacity:.8}</style><span class="mng-label">You\'re viewing your store</span><a href="'+dashboardUrl+'">Edit your store \u2192</a><button aria-label="Dismiss">\u2715</button>';document.body.prepend(banner);requestAnimationFrame(function(){requestAnimationFrame(function(){banner.classList.add('mng-visible')})});banner.querySelector('button').addEventListener('click',function(){banner.style.transform='translateY(-100%)';sessionStorage.setItem(STORAGE_KEY,'1');setTimeout(function(){banner.remove()},300)})}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){setTimeout(inject,delay)})}else{setTimeout(inject,delay)}})()</script>`
}

/**
 * Attaches the owner banner script to a rewrite response via a custom header.
 * The layout component reads `x-inject-owner-banner` and appends it to <body>.
 * Base64-encoding avoids header value escaping issues.
 */
function injectBanner(
  response: NextResponse,
  dashboardUrl: string,
  pageType: 'homepage' | 'storefront' | 'other',
): NextResponse {
  response.headers.set(
    'x-inject-owner-banner',
    Buffer.from(buildBannerScript(dashboardUrl, pageType)).toString('base64'),
  )
  return response
}

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

/**
 * Attempts to read the Auth0 session from the incoming request.
 * Returns only the `sub` claim — the minimal surface needed for owner checks.
 * Swallows errors gracefully so unauthenticated requests don't throw.
 */
async function getOwnerSession(request: NextRequest): Promise<{ sub: string } | null> {
  try {
    const session = await auth0.getSession(request)
    return session?.user?.sub ? { sub: session.user.sub } : null
  } catch {
    return null
  }
}

/**
 * Lazily initialises the Supabase server client.
 * Dynamic import keeps the client out of the edge bundle when it isn't needed,
 * reducing cold-start size on Cloudflare/Vercel Edge.
 */
async function getSupabaseClient() {
  const { createClient } = await import('@/lib/server')
  return createClient()
}

// ─── CORS Handler ─────────────────────────────────────────────────────────────

/**
 * Applies CORS logic for the reserved `api` subdomain.
 *
 * - OPTIONS (preflight): returns 204 with full CORS headers, no further processing.
 * - Public API paths: pass through without an auth check.
 * - All other paths: require a valid Auth0 session or return 401.
 *
 * CORS headers are echoed back only when the origin is a first-party
 * menengai.cloud origin, preventing open CORS on the API subdomain.
 */
async function handleApiSubdomain(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin') ?? ''
  const allowed = isAllowedCorsOrigin(origin)

  // Shared CORS headers builder — only set when origin is first-party
  const addCors = (res: NextResponse): NextResponse => {
    if (allowed) {
      res.headers.set('Access-Control-Allow-Origin', origin)
      res.headers.set('Access-Control-Allow-Credentials', 'true')
    }
    return res
  }

  // Handle preflight in one place for all routes on this subdomain
  if (request.method === 'OPTIONS') {
    return addCors(
      new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Methods': CORS_METHODS,
          'Access-Control-Allow-Headers': CORS_HEADERS,
        },
      }),
    )
  }

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))

  if (!isPublic) {
    // Protected API route — require a valid session
    const session = await auth0.getSession(request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return addCors(NextResponse.next())
}

// ─── Proxy Entry Point ────────────────────────────────────────────────────────

/**
 * Central proxy function called by middleware.ts for every non-static request.
 *
 * Decision tree (evaluated top-to-bottom, returns on first match):
 *
 *  1. System subdomains  → api gets CORS/auth handling; others pass through.
 *  2. Auth / API / _next → handed off to auth0.middleware unchanged.
 *  3. Custom domain      → Supabase lookup → storefront rewrite (+ optional banner).
 *  4. Subdomain tenant   → owner route gate or storefront rewrite (+ optional banner).
 *  5. Main platform      → /store/slug redirects; homepage falls through.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'

  // ── 0. System Subdomains ──────────────────────────────────────────────────
  // Identified before the tenant check so `api.menengai.cloud` is never
  // mistakenly treated as a tenant slug.
  const subdomain = host.endsWith('.menengai.cloud')
    ? host.slice(0, -'.menengai.cloud'.length)
    : null

  if (subdomain && SYSTEM_SUBDOMAINS.has(subdomain)) {
    if (subdomain === 'api') return handleApiSubdomain(request)
    // status, admin, mail — let their own route handlers deal with it
    return NextResponse.next()
  }

  // ── 1. Auth / API / _next Bypass ─────────────────────────────────────────
  // auth0.middleware handles session refresh and callback routing.
  // This must come before tenant logic to avoid redirecting /auth/callback.
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return auth0.middleware(request)
  }

  // ── 2. Custom Domain ──────────────────────────────────────────────────────
  // Requests arriving on a domain that is NOT menengai.cloud and NOT localhost/LAN
  // are resolved to a store via the `custom_domain` column in Supabase.
  const isCustomDomain =
    !host.endsWith('.menengai.cloud') &&
    host !== 'menengai.cloud' &&
    !host.includes('localhost') &&
    !host.includes('192.168.1.')

  if (isCustomDomain) {
    const supabase = await getSupabaseClient()
    const { data: store } = await supabase
      .from('stores')
      .select('slug')
      .eq('custom_domain', host)
      .single()

    if (!store?.slug) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const { slug } = store

    // Canonicalize: strip /store/<slug> prefix if the browser sent it
    const storePrefix = `/store/${slug}`
    if (pathname.startsWith(storePrefix)) {
      const cleanPath = pathname.slice(storePrefix.length) || '/'
      return NextResponse.redirect(
        toCustomDomainUrl(request, host, `${cleanPath}${request.nextUrl.search}`),
        308,
      )
    }

    // Owner dashboard routes on a custom domain → redirect to subdomain
    // (e.g. mystore.com/settings → mystore.menengai.cloud/settings)
    if (PROTECTED_SUBPATHS.some((sub) => pathname.startsWith(sub))) {
      return NextResponse.redirect(
        toSubdomainUrl(request, slug, `${pathname}${request.nextUrl.search}`),
        308,
      )
    }

    // Rewrite all public paths to the internal /store/<slug> route
    const url = request.nextUrl.clone()
    url.pathname = `/store/${slug}${pathname === '/' ? '' : pathname}`
    const rewrite = NextResponse.rewrite(url)

    // Inject the owner banner only on storefront pages, never on admin paths
    if (!BANNER_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) {
      const owner = await getOwnerSession(request)
      if (owner) {
        injectBanner(rewrite, toSubdomainUrl(request, slug, '/settings').toString(), 'storefront')
      }
    }

    return rewrite
  }

  // ── 3. Subdomain Tenant  (slug.menengai.cloud) ────────────────────────────
  // Also supports `?_tenant=slug` in development for easy local testing.
  const devTenant = searchParams.get('_tenant')
  const tenantSlug = getTenantSlug(host) ?? devTenant ?? null

  if (tenantSlug) {
    // In production, non-owner (public storefront) traffic on the subdomain
    // is redirected to the store's custom domain when one is configured.
    // Owner routes are exempt so dashboard links always work.
    if (!devTenant && isProduction(host)) {
      const isOwnerRoute = PROTECTED_SUBPATHS.some((sub) => pathname.startsWith(sub))
      if (!isOwnerRoute) {
        const supabase = await getSupabaseClient()
        const { data: store } = await supabase
          .from('stores')
          .select('custom_domain')
          .eq('slug', tenantSlug)
          .single()

        if (store?.custom_domain) {
          // Clean up an accidental /store/<slug> prefix before redirecting
          const storePrefix = `/store/${tenantSlug}`
          const cleanPath = pathname.startsWith(storePrefix)
            ? pathname.slice(storePrefix.length) || '/'
            : pathname
          return NextResponse.redirect(
            toCustomDomainUrl(request, store.custom_domain, `${cleanPath}${request.nextUrl.search}`),
            308,
          )
        }
      }
    }

    // Canonicalize: strip /store/<slug> prefix on the subdomain itself
    const storePrefix = `/store/${tenantSlug}`
    if (pathname.startsWith(storePrefix)) {
      const cleanPath = pathname.slice(storePrefix.length) || '/'
      return NextResponse.redirect(
        new URL(`${proto}://${tenantSlug}.menengai.cloud${cleanPath}${request.nextUrl.search}`),
        308,
      )
    }

    // Protected owner routes — require Auth0 session.
    // On failure, redirect to the main-domain login page; Auth0 handles the
    // post-login callback and returns the user to the original URL.
    if (PROTECTED_SUBPATHS.some((sub) => pathname.startsWith(sub))) {
      const session = await auth0.getSession(request)
      if (!session?.user) {
        return NextResponse.redirect(
          new URL(`${proto}://www.menengai.cloud/auth/login`, request.url),
          302,
        )
      }

      // Rewrite owner path → internal /store/<slug>/settings etc.
      const url = request.nextUrl.clone()
      url.pathname = `/store/${tenantSlug}${pathname}`
      return NextResponse.rewrite(url)
    }

    // Public storefront rewrite for subdomain visitors
    const url = request.nextUrl.clone()
    url.pathname = `/store/${tenantSlug}${pathname === '/' ? '' : pathname}`
    const rewrite = NextResponse.rewrite(url)

    if (!BANNER_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) {
      const owner = await getOwnerSession(request)
      if (owner) {
        injectBanner(rewrite, `${proto}://${tenantSlug}.menengai.cloud/settings`, 'storefront')
      }
    }

    return rewrite
  }

  // ── 4. Main Platform  (menengai.cloud / localhost) ────────────────────────

  // /store/<slug>/products/<productSlug> → redirect to subdomain or custom domain
  // This handles deep links that land on the main domain in production.
  const productsMatch = pathname.match(/^\/store\/([^/]+)\/products\/([^/]+)(\/.*)?$/)
  if (productsMatch && isProduction(host)) {
    const [, slug, productSlug, rest = ''] = productsMatch
    const supabase = await getSupabaseClient()
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

  // /store/<slug>[/...] → redirect to subdomain or custom domain
  const storeMatch = pathname.match(/^\/store\/([^/]+)(\/.*)?$/)
  if (storeMatch) {
    if (isProduction(host)) {
      const [, slug, rest = '/'] = storeMatch
      const supabase = await getSupabaseClient()
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
    // In development, /store/<slug> is served directly without redirect
    return NextResponse.next()
  }

  // Homepage — public, no tenant context.
  // The page itself renders a "Go to your store" CTA if the user is logged in.
  return NextResponse.next()
}

// ─── Matcher Config ───────────────────────────────────────────────────────────

/**
 * Excludes static assets and image optimization paths from middleware.
 * Everything else (pages, API routes, rewrites) passes through `proxy`.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}