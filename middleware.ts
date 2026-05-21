import { auth0 } from '@/lib/auth0'
import { type NextRequest, NextResponse } from 'next/server'


// ─── Route Classification Constants ───────────────────────────────────────────

/**
 * Owner-only subpaths — require auth, served via admin.menengai.cloud.
 * Hitting these on a storefront subdomain/custom domain redirects to admin.
 */
const PROTECTED_SUBPATHS = ['/settings', '/orders', '/products/new'] as const

/**
 * Prefixes that bypass all tenant/proxy logic entirely.
 * /api/ routes are served directly by Next.js — no tenant rewriting needed.
 */
const BYPASS_PREFIXES = ['/auth/', '/_next/', '/api/'] as const

const BANNER_EXCLUDED_PREFIXES = [
  '/settings', '/dashboard', '/orders', '/products/new',
  '/auth/', '/api/', '/onboarding', '/org/pick',
] as const

/**
 * Reserved subdomains that are NOT tenant slugs.
 * 'admin' is handled separately before this check.
 */
const SYSTEM_SUBDOMAINS = new Set(['status', 'mail', 'www', 'auth'])

/**
 * Paths that belong to the admin app itself and must never be
 * rewritten to a store path, even when a valid activeSlug cookie exists.
 */
const ADMIN_NATIVE_PATHS = ['/org/pick', '/onboarding', '/org/'] as const


// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTenantSlug(host: string): string | null {
  if (!host.endsWith('.menengai.cloud')) return null
  const sub = host.slice(0, -'.menengai.cloud'.length)
  return sub && !SYSTEM_SUBDOMAINS.has(sub) ? sub : null
}

function toSubdomainUrl(request: NextRequest, slug: string, path: string): URL {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return new URL(`${proto}://${slug}.menengai.cloud${path || '/'}`)
}

function toCustomDomainUrl(request: NextRequest, domain: string, path: string): URL {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return new URL(`${proto}://${domain}${path || '/'}`)
}

function toAdminUrl(proto: string, path: string, search = ''): URL {
  return new URL(`${proto}://admin.menengai.cloud${path}${search}`)
}

function isProduction(host: string): boolean {
  return host === 'menengai.cloud' || host.endsWith('.menengai.cloud')
}


// ─── Owner Banner ─────────────────────────────────────────────────────────────

function buildBannerScript(
  dashboardUrl: string,
  pageType: 'homepage' | 'storefront' | 'other',
): string {
  return `<script data-dashboard="${dashboardUrl}" data-page="${pageType}">(function(){var STORAGE_KEY='mng_banner_dismissed';var DELAY_PAGES=['homepage','storefront'];var script=document.currentScript;var dashboardUrl=script&&script.dataset.dashboard||'/settings';var pageType=script&&script.dataset.page||'other';if(sessionStorage.getItem(STORAGE_KEY))return;if(window.location.pathname.includes('/settings'))return;var delay=DELAY_PAGES.includes(pageType)?2000+Math.random()*3000:800;function inject(){var banner=document.createElement('div');banner.id='mng-owner-banner';banner.innerHTML='<style>#mng-owner-banner{position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;height:36px;background:#1c2228;color:#f5f0eb;font-family:ui-monospace,monospace;font-size:12px;letter-spacing:.01em;transform:translateY(-100%);transition:transform .25s cubic-bezier(.16,1,.3,1);box-shadow:0 1px 0 rgba(255,255,255,.06)}#mng-owner-banner.mng-visible{transform:translateY(0)}#mng-owner-banner a{color:#c9a96e;text-decoration:none;font-weight:500;white-space:nowrap;flex-shrink:0}#mng-owner-banner a:hover{text-decoration:underline;text-underline-offset:3px}#mng-owner-banner .mng-label{opacity:.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#mng-owner-banner button{background:none;border:none;color:#f5f0eb;opacity:.4;cursor:pointer;padding:4px;font-size:14px;line-height:1;flex-shrink:0;transition:opacity .15s}#mng-owner-banner button:hover{opacity:.8}</style><span class="mng-label">You\'re viewing your store</span><a href="'+dashboardUrl+'">Edit your store \u2192</a><button aria-label="Dismiss">\u2715</button>';document.body.prepend(banner);requestAnimationFrame(function(){requestAnimationFrame(function(){banner.classList.add('mng-visible')})});banner.querySelector('button').addEventListener('click',function(){banner.style.transform='translateY(-100%)';sessionStorage.setItem(STORAGE_KEY,'1');setTimeout(function(){banner.remove()},300)})}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){setTimeout(inject,delay)})}else{setTimeout(inject,delay)}})()</script>`
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

async function getOwnerSession(request: NextRequest): Promise<{ sub: string } | null> {
  try {
    const session = await auth0.getSession(request)
    return session?.user?.sub ? { sub: session.user.sub } : null
  } catch {
    return null
  }
}

async function getSupabaseClient() {
  const { createClient } = await import('@/lib/server')
  return createClient()
}


// ─── Proxy Entry Point ────────────────────────────────────────────────────────

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const search = request.nextUrl.search


  // ── 0. System Subdomains ──────────────────────────────────────────────────
  // Checked first so admin.menengai.cloud falls through to 0a (not in the set).
  const subdomain = host.endsWith('.menengai.cloud')
    ? host.slice(0, -'.menengai.cloud'.length)
    : null

  if (subdomain && SYSTEM_SUBDOMAINS.has(subdomain)) {
    return NextResponse.next()
  }


  // ── 0a. Admin Subdomain (admin.menengai.cloud) ────────────────────────────
  if (host === 'admin.menengai.cloud') {
    // Auth callbacks must pass through before any session check
    if (pathname.startsWith('/auth/')) return auth0.middleware(request)

    // Admin-native pages (picker, onboarding) render themselves — never rewrite
    if (ADMIN_NATIVE_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next()
    }

    const session = await auth0.getSession(request)
    if (!session?.user) {
      return NextResponse.redirect(
        new URL(`${proto}://menengai.cloud/auth/login`, request.url),
        302,
      )
    }

    const activeSlug = request.cookies.get('mng_active_store')?.value

    if (!activeSlug) {
      // No active store — send to picker, preserving intended destination
      const url = request.nextUrl.clone()
      url.pathname = '/org/pick'
      if (pathname !== '/' && pathname !== '/org/pick') {
        url.searchParams.set('next', pathname)
      }
      return NextResponse.rewrite(url)
    }

    // Rewrite cleanly — slug never appears in the URL bar
    const url = request.nextUrl.clone()
    url.pathname = `/store/${activeSlug}${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }


  // ── 0b. TWA Mobile Subdomain (m.menengai.cloud) ───────────────────────────
  // TWA does not support wildcard subdomains in assetlinks.json, so stores
  // are served via /store/{slug} paths on this fixed subdomain instead.
  if (host === 'm.menengai.cloud') {
    if (pathname.startsWith('/auth/')) return auth0.middleware(request)

    if (PROTECTED_SUBPATHS.some((sub) => pathname.startsWith('/store/') && pathname.includes(sub))) {
      const session = await auth0.getSession(request)
      if (!session?.user) {
        return NextResponse.redirect(
          new URL(`${proto}://menengai.cloud/auth/login`, request.url),
          302,
        )
      }
    }

    return NextResponse.next()
  }


  // ── 1. Auth / API / _next Bypass ─────────────────────────────────────────
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (pathname.startsWith('/auth/')) return auth0.middleware(request)

    let response = NextResponse.next()

    if (pathname.startsWith('/api/')) {
      const origin = request.headers.get('origin')
      if (request.method === 'OPTIONS') {
        response = new NextResponse(null, { status: 200 })
      }
      if (origin) {
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
      }
    }

    return response
  }


  // ── 2. Custom Domain ──────────────────────────────────────────────────────
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

    // Strip accidental /store/{slug} prefix if someone lands here with it
    const storePrefix = `/store/${slug}`
    if (pathname.startsWith(storePrefix)) {
      const cleanPath = pathname.slice(storePrefix.length) || '/'
      return NextResponse.redirect(
        toCustomDomainUrl(request, host, `${cleanPath}${search}`),
        308,
      )
    }

    // Owner routes → admin subdomain (admin handles its own auth)
    if (PROTECTED_SUBPATHS.some((sub) => pathname.startsWith(sub))) {
      return NextResponse.redirect(toAdminUrl(proto, pathname, search), 308)
    }

    // Rewrite to internal store path for rendering
    const url = request.nextUrl.clone()
    url.pathname = `/store/${slug}${pathname === '/' ? '' : pathname}`
    const rewrite = NextResponse.rewrite(url)

    if (!BANNER_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) {
      const owner = await getOwnerSession(request)
      if (owner) {
        injectBanner(rewrite, `${proto}://admin.menengai.cloud/settings`, 'storefront')
      }
    }

    return rewrite
  }


  // ── 3. Subdomain Tenant (slug.menengai.cloud) ─────────────────────────────
  const devTenant = searchParams.get('_tenant')
  const tenantSlug = getTenantSlug(host) ?? devTenant ?? null

  if (tenantSlug) {
    // In production, redirect storefront traffic to custom domain if one is set
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
          const storePrefix = `/store/${tenantSlug}`
          const cleanPath = pathname.startsWith(storePrefix)
            ? pathname.slice(storePrefix.length) || '/'
            : pathname
          return NextResponse.redirect(
            toCustomDomainUrl(request, store.custom_domain, `${cleanPath}${search}`),
            308,
          )
        }
      }
    }

    // Strip accidental /store/{slug} prefix
    const storePrefix = `/store/${tenantSlug}`
    if (pathname.startsWith(storePrefix)) {
      const cleanPath = pathname.slice(storePrefix.length) || '/'
      return NextResponse.redirect(
        new URL(`${proto}://${tenantSlug}.menengai.cloud${cleanPath}${search}`),
        308,
      )
    }

    // Owner routes → admin subdomain (admin handles its own auth)
    if (PROTECTED_SUBPATHS.some((sub) => pathname.startsWith(sub))) {
      return NextResponse.redirect(toAdminUrl(proto, pathname, search), 308)
    }

    // Rewrite to internal store path for rendering
    const url = request.nextUrl.clone()
    url.pathname = `/store/${tenantSlug}${pathname === '/' ? '' : pathname}`
    const rewrite = NextResponse.rewrite(url)

    if (!BANNER_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) {
      const owner = await getOwnerSession(request)
      if (owner) {
        injectBanner(rewrite, `${proto}://admin.menengai.cloud/settings`, 'storefront')
      }
    }

    return rewrite
  }


  // ── 4. Main Platform (menengai.cloud / localhost) ─────────────────────────

  // Redirect /store/{slug}/products/{productSlug} to the canonical domain
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

  // Redirect all /store/{slug} paths to their canonical domain
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
    return NextResponse.next()
  }

  return NextResponse.next()
}


// ─── Matcher Config ───────────────────────────────────────────────────────────

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}