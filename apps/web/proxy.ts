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

const BANNER_EXCLUDED_PREFIXES = [
  '/settings', '/dashboard', '/orders', '/products/new',
  '/auth/', '/api/', '/onboarding', '/org/',
] as const


// ─── Helpers ──────────────────────────────────────────────────────────────────

function toStorefrontUrl(request: NextRequest, slug: string, path: string): URL {
  const url = request.nextUrl.clone()
  url.pathname = `/s/${slug}${path === '/' ? '' : path}`
  return url
}

function toCustomDomainUrl(request: NextRequest, domain: string, path: string): URL {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return new URL(`${proto}://${domain}${path || '/'}`)
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

function isProduction(host: string): boolean {
  return isPlatformHost(host)
}


// ─── Owner Banner ─────────────────────────────────────────────────────────────

function buildBannerScript(
  dashboardUrl: string,
  pageType: 'homepage' | 'storefront' | 'other',
): string {
  return `<script data-dashboard="${dashboardUrl}" data-page="${pageType}">(function(){var STORAGE_KEY='mng_banner_dismissed';var DELAY_PAGES=['homepage','storefront'];var script=document.currentScript;var dashboardUrl=script&&script.dataset.dashboard||'/settings';var pageType=script&&script.dataset.page||'other';if(sessionStorage.getItem(STORAGE_KEY))return;if(window.location.pathname.includes('/settings'))return;var delay=DELAY_PAGES.includes(pageType)?2000+Math.random()*3000:800;function inject(){var banner=document.createElement('div');banner.id='mng-owner-banner';banner.innerHTML='<style>#mng-owner-banner{position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;height:36px;background:#1c2228;color:#f5f0eb;font-family:ui-monospace,monospace;font-size:12px;letter-spacing:.01em;transform:translateY(-100%);transition:transform .25s cubic-bezier(.16,1,.3,1);box-shadow:0 1px 0 rgba(255,255,255,.06)}#mng-owner-banner.mng-visible{transform:translateY(0)}#mng-owner-banner a{color:#c9a96e;text-decoration:none;font-weight:500;white-space:nowrap;flex-shrink:0}#mng-owner-banner a:hover{text-decoration:underline;text-underline-offset:3px}#mng-owner-banner .mng-label{opacity:.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#mng-owner-banner button{background:none;border:none;color:#f5f0eb;opacity:.4;cursor:pointer;padding:4px;font-size:14px;line-height:1;flex-shrink:0;transition:opacity .15s}#mng-owner-banner button:hover{opacity:.8}</style><span class="mng-label">You\'re viewing your store</span><a href="'+dashboardUrl+'">Edit your store →</a><button aria-label="Dismiss">✕</button>';document.body.prepend(banner);requestAnimationFrame(function(){requestAnimationFrame(function(){banner.classList.add('mng-visible')})});banner.querySelector('button').addEventListener('click',function(){banner.style.transform='translateY(-100%)';sessionStorage.setItem(STORAGE_KEY,'1');setTimeout(function(){banner.remove()},300)})}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){setTimeout(inject,delay)})}else{setTimeout(inject,delay)}})()</script>`
}

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

async function getSupabaseClient() {
  const { createClient } = await import('@mcloud/db/server')
  return createClient()
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


  // ── 2. Admin Path (/admin/*) ──────────────────────────────────────────────
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!session?.user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url, 302)
    }

    const subpath = pathname.slice('/admin'.length) || '/'

    // Store-contextual paths need the active store slug prepended
    if (PROTECTED_SUBPATHS.some((p) => subpath.startsWith(p))) {
      const activeSlug = request.cookies.get('mng_active_store')?.value
      if (!activeSlug) {
        const url = request.nextUrl.clone()
        url.pathname = '/org'
        url.searchParams.set('next', subpath)
        return rewriteResponse(url, authHeaders)
      }
      // /store/{slug}/settings/* is now in apps/storefront which redirects to the
      // merchant org settings — use /s/ so it routes through the storefront app.
      return NextResponse.redirect(toStorefrontUrl(request, activeSlug, subpath), 307)
    }

    // Everything else (org, onboarding, pick, etc.) — strip /admin prefix
    const url = request.nextUrl.clone()
    url.pathname = subpath
    return rewriteResponse(url, authHeaders)
  }


  // ── 3. Sudo Path (/sudo/*) ────────────────────────────────────────────────
  // Platform admin panel — rewrites to /admin/*. Role enforcement is
  // handled by the /admin layout (must have role=admin in users table).
  if (pathname === '/sudo' || pathname.startsWith('/sudo/')) {
    if (!session?.user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url, 302)
    }

    const subpath = pathname.slice('/sudo'.length) || '/'
    const url = request.nextUrl.clone()
    url.pathname = `/admin${subpath === '/' ? '' : subpath}`
    return rewriteResponse(url, authHeaders)
  }


  // ── 4. Custom Domain ──────────────────────────────────────────────────────
  const isCustomDomain =
    !isPlatformHost(host) &&
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

    // Strip accidental /store/{slug} prefix if someone lands here with it
    const storePrefix = `/store/${slug}`
    if (pathname.startsWith(storePrefix)) {
      const cleanPath = pathname.slice(storePrefix.length) || '/'
      return NextResponse.redirect(
        toCustomDomainUrl(request, host, `${cleanPath}${search}`),
        308,
      )
    }

    // Owner routes → /admin (handles its own auth)
    if (PROTECTED_SUBPATHS.some((sub) => pathname.startsWith(sub))) {
      const url = request.nextUrl.clone()
      url.pathname = `/admin${pathname}`
      url.search = search
      return NextResponse.redirect(url, 308)
    }

    // Redirect to the storefront app
    const storefrontOrigin = process.env.NEXT_PUBLIC_STOREFRONT_ORIGIN ?? 'http://localhost:3001'
    const storefrontPath = `/store/${slug}${pathname === '/' ? '' : pathname}${search}`
    return NextResponse.redirect(`${storefrontOrigin}${storefrontPath}`, 307)
  }


  // ── 5. Storefront Path (/s/{slug}/*) ─────────────────────────────────────
  const devTenant = searchParams.get('_tenant')
  const storefrontMatch = pathname.match(/^\/s\/([^/]+)(\/.*)?$/)
  const tenantSlug = storefrontMatch?.[1] ?? devTenant ?? null

  if (tenantSlug) {
    const subpath = storefrontMatch?.[2] ?? '/'

    // In production, redirect to custom domain if one is set
    if (isProduction(host)) {
      const isOwnerRoute = PROTECTED_SUBPATHS.some((sub) => subpath.startsWith(sub))
      if (!isOwnerRoute) {
        const supabase = await getSupabaseClient()
        const { data: store } = await supabase
          .from('stores')
          .select('custom_domain')
          .eq('slug', tenantSlug)
          .single()

        if (store?.custom_domain) {
          return NextResponse.redirect(
            toCustomDomainUrl(request, store.custom_domain, `${subpath}${search}`),
            308,
          )
        }
      }
    }

    // Owner routes → /admin
    if (PROTECTED_SUBPATHS.some((sub) => subpath.startsWith(sub))) {
      const url = request.nextUrl.clone()
      url.pathname = `/admin${subpath}`
      url.search = search
      return NextResponse.redirect(url, 308)
    }

    // Redirect to the storefront app
    const storefrontOrigin = process.env.NEXT_PUBLIC_STOREFRONT_ORIGIN ?? 'http://localhost:3001'
    const storefrontUrl = `${storefrontOrigin}/store/${tenantSlug}${subpath === '/' ? '' : subpath}${search}`
    return NextResponse.redirect(storefrontUrl, 307)
  }


  // ── 6. Main Platform (menengai.cloud / localhost) ─────────────────────────

  // Logged-in users skip the marketing homepage and go straight to their org.
  // Done here (not in the page) so it's a clean HTTP redirect, not a rendered-page
  // redirect that can fall back to a meta-refresh.
  if (pathname === '/' && session?.user) {
    const url = request.nextUrl.clone()
    url.pathname = '/org'
    return NextResponse.redirect(url, 307)
  }

  // Redirect /store/{slug}/products/{productSlug} to the canonical path
  const productsMatch = pathname.match(/^\/store\/([^/]+)\/products\/([^/]+)(\/.*)?$/)
  if (productsMatch) {
    const [, slug, productSlug, rest = ''] = productsMatch
    if (isProduction(host)) {
      const supabase = await getSupabaseClient()
      const { data: store } = await supabase
        .from('stores')
        .select('custom_domain')
        .eq('slug', slug)
        .single()

      return NextResponse.redirect(
        store?.custom_domain
          ? toCustomDomainUrl(request, store.custom_domain, `/products/${productSlug}${rest}`)
          : toStorefrontUrl(request, slug, `/products/${productSlug}${rest}`),
        308,
      )
    }
  }

  // Redirect all /store/{slug} paths to their canonical path
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
          : toStorefrontUrl(request, slug, rest),
        308,
      )
    }
    // In dev, redirect /store/{slug}/* directly to the storefront app
    const storefrontOrigin = process.env.NEXT_PUBLIC_STOREFRONT_ORIGIN ?? 'http://localhost:3001'
    return NextResponse.redirect(`${storefrontOrigin}/store/${storeMatch[1]}${storeMatch[2] ?? '/'}${search}`, 307)
  }

  return nextResponse(authHeaders)
}


// ─── Matcher Config ───────────────────────────────────────────────────────────

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
