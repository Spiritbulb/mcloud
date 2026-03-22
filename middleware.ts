import { auth0 } from '@/lib/auth0'
import { type NextRequest, NextResponse } from 'next/server'

const PROTECTED_SUBPATHS = ['/settings', '/orders', '/products/new']
const BYPASS_PREFIXES = ['/auth/', '/api/', '/_next/']
const BANNER_EXCLUDED_PREFIXES = [
  '/settings', '/dashboard', '/orders', '/products/new',
  '/auth/', '/api/', '/onboarding',
]

function getTenantSlug(host: string): string | null {
  if (host.endsWith('.menengai.cloud')) {
    const sub = host.replace('.menengai.cloud', '')
    if (!sub || sub === 'www') return null
    return sub
  }
  return null
}

function toSubdomainUrl(request: NextRequest, slug: string, path: string): URL {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return new URL(`${proto}://${slug}.menengai.cloud${path || '/'}`)
}

function toCustomDomainUrl(request: NextRequest, domain: string, path: string): URL {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return new URL(`${proto}://${domain}${path || '/'}`)
}

function isProduction(host: string): boolean {
  return host.endsWith('.menengai.cloud') || host === 'menengai.cloud'
}

function buildBannerScript(dashboardUrl: string, pageType: 'homepage' | 'storefront' | 'other'): string {
  return `<script data-dashboard="${dashboardUrl}" data-page="${pageType}">(function(){var STORAGE_KEY='mng_banner_dismissed';var DELAY_PAGES=['homepage','storefront'];var script=document.currentScript;var dashboardUrl=script&&script.dataset.dashboard||'/settings';var pageType=script&&script.dataset.page||'other';if(sessionStorage.getItem(STORAGE_KEY))return;if(window.location.pathname.includes('/settings'))return;var delay=DELAY_PAGES.includes(pageType)?2000+Math.random()*3000:800;function inject(){var banner=document.createElement('div');banner.id='mng-owner-banner';banner.innerHTML='<style>#mng-owner-banner{position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;height:36px;background:#1c2228;color:#f5f0eb;font-family:ui-monospace,monospace;font-size:12px;letter-spacing:.01em;transform:translateY(-100%);transition:transform .25s cubic-bezier(.16,1,.3,1);box-shadow:0 1px 0 rgba(255,255,255,.06)}#mng-owner-banner.mng-visible{transform:translateY(0)}#mng-owner-banner a{color:#c9a96e;text-decoration:none;font-weight:500;white-space:nowrap;flex-shrink:0}#mng-owner-banner a:hover{text-decoration:underline;text-underline-offset:3px}#mng-owner-banner .mng-label{opacity:.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#mng-owner-banner button{background:none;border:none;color:#f5f0eb;opacity:.4;cursor:pointer;padding:4px;font-size:14px;line-height:1;flex-shrink:0;transition:opacity .15s}#mng-owner-banner button:hover{opacity:.8}</style><span class="mng-label">You\'re viewing your store</span><a href="'+dashboardUrl+'">Edit your store \u2192</a><button aria-label="Dismiss">\u2715</button>';document.body.prepend(banner);requestAnimationFrame(function(){requestAnimationFrame(function(){banner.classList.add('mng-visible')})});banner.querySelector('button').addEventListener('click',function(){banner.style.transform='translateY(-100%)';sessionStorage.setItem(STORAGE_KEY,'1');setTimeout(function(){banner.remove()},300)})}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){setTimeout(inject,delay)})}else{setTimeout(inject,delay)}})()</script>`
}

function injectBanner(response: NextResponse, dashboardUrl: string, pageType: 'homepage' | 'storefront' | 'other'): NextResponse {
  response.headers.set('x-inject-owner-banner', Buffer.from(buildBannerScript(dashboardUrl, pageType)).toString('base64'))
  return response
}

async function getOwnerSession(request: NextRequest): Promise<{ sub: string } | null> {
  try {
    const session = await auth0.getSession(request)
    if (!session?.user?.sub) return null
    return { sub: session.user.sub }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'

  // Always let auth/api/_next through first
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return auth0.middleware(request)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 1. CUSTOM DOMAIN
  // ══════════════════════════════════════════════════════════════════════════
  if (
    !host.endsWith('.menengai.cloud') &&
    host !== 'menengai.cloud' &&
    !host.includes('localhost') &&
    !host.includes('192.168.1.')
  ) {
    const { createClient } = await import('@/lib/server')
    const supabase = await createClient()
    const { data: store } = await supabase
      .from('stores').select('slug').eq('custom_domain', host).single()

    if (!store?.slug) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const slug = store.slug

    // Strip accidental /store/slug prefix
    const storePrefix = `/store/${slug}`
    if (pathname.startsWith(storePrefix)) {
      const cleanPath = pathname.slice(storePrefix.length) || '/'
      return NextResponse.redirect(toCustomDomainUrl(request, host, `${cleanPath}${request.nextUrl.search}`), 308)
    }

    // Owner routes on custom domain → redirect to subdomain
    if (PROTECTED_SUBPATHS.some((sub) => pathname.startsWith(sub))) {
      return NextResponse.redirect(toSubdomainUrl(request, slug, `${pathname}${request.nextUrl.search}`), 308)
    }

    // Public storefront rewrite
    const url = request.nextUrl.clone()
    url.pathname = `/store/${slug}${pathname === '/' ? '' : pathname}`
    const rewrite = NextResponse.rewrite(url)

    if (!BANNER_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) {
      const owner = await getOwnerSession(request)
      if (owner) injectBanner(rewrite, toSubdomainUrl(request, slug, '/settings').toString(), 'storefront')
    }

    return rewrite
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. SUBDOMAIN  (slug.menengai.cloud)
  // ══════════════════════════════════════════════════════════════════════════
  const devTenant = searchParams.get('_tenant')
  const tenantSlug = getTenantSlug(host) ?? devTenant ?? null

  if (tenantSlug) {
    // In production, non-owner routes on subdomain → redirect to custom domain if set
    if (!devTenant && isProduction(host)) {
      const isOwnerRoute = PROTECTED_SUBPATHS.some((sub) => pathname.startsWith(sub))
      if (!isOwnerRoute) {
        const { createClient } = await import('@/lib/server')
        const supabase = await createClient()
        const { data: store } = await supabase
          .from('stores').select('custom_domain').eq('slug', tenantSlug).single()

        if (store?.custom_domain) {
          const storePrefix = `/store/${tenantSlug}`
          const cleanPath = pathname.startsWith(storePrefix) ? pathname.slice(storePrefix.length) || '/' : pathname
          return NextResponse.redirect(toCustomDomainUrl(request, store.custom_domain, `${cleanPath}${request.nextUrl.search}`), 308)
        }
      }
    }

    // Strip accidental /store/slug prefix
    const storePrefix = `/store/${tenantSlug}`
    if (pathname.startsWith(storePrefix)) {
      const cleanPath = pathname.slice(storePrefix.length) || '/'
      return NextResponse.redirect(new URL(`${proto}://${tenantSlug}.menengai.cloud${cleanPath}${request.nextUrl.search}`), 308)
    }

    // Protected owner routes — gate with login, no loop possible
    if (PROTECTED_SUBPATHS.some((sub) => pathname.startsWith(sub))) {
      const session = await auth0.getSession(request)
      if (!session?.user) {
        // Send to login, Auth0 will handle the callback
        return NextResponse.redirect(new URL(`${proto}://www.menengai.cloud/auth/login`, request.url), 302)
      }

      const url = request.nextUrl.clone()
      url.pathname = `/store/${tenantSlug}${pathname}`
      return NextResponse.rewrite(url)
    }

    // Public storefront rewrite
    const url = request.nextUrl.clone()
    url.pathname = `/store/${tenantSlug}${pathname === '/' ? '' : pathname}`
    const rewrite = NextResponse.rewrite(url)

    if (!BANNER_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) {
      const owner = await getOwnerSession(request)
      if (owner) injectBanner(rewrite, `${proto}://${tenantSlug}.menengai.cloud/settings`, 'storefront')
    }

    return rewrite
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. MAIN PLATFORM  (menengai.cloud / localhost)
  // ══════════════════════════════════════════════════════════════════════════

  // /store/slug/products/productSlug → redirect to subdomain or custom domain
  const productsMatch = pathname.match(/^\/store\/([^/]+)\/products\/([^/]+)(\/.*)?$/)
  if (productsMatch && isProduction(host)) {
    const [, slug, productSlug, rest = ''] = productsMatch
    const { createClient } = await import('@/lib/server')
    const supabase = await createClient()
    const { data: store } = await supabase.from('stores').select('custom_domain').eq('slug', slug).single()
    return NextResponse.redirect(
      store?.custom_domain
        ? toCustomDomainUrl(request, store.custom_domain, `/products/${productSlug}${rest}`)
        : toSubdomainUrl(request, slug, `/products/${productSlug}${rest}`),
      308,
    )
  }

  // /store/slug → redirect to subdomain or custom domain
  const storeMatch = pathname.match(/^\/store\/([^/]+)(\/.*)?$/)
  if (storeMatch) {
    if (isProduction(host)) {
      const [, slug, rest = '/'] = storeMatch
      const { createClient } = await import('@/lib/server')
      const supabase = await createClient()
      const { data: store } = await supabase.from('stores').select('custom_domain').eq('slug', slug).single()
      return NextResponse.redirect(
        store?.custom_domain
          ? toCustomDomainUrl(request, store.custom_domain, rest)
          : toSubdomainUrl(request, slug, rest),
        308,
      )
    }
    return NextResponse.next()
  }

  // Homepage — public, just serve it
  // No auto-redirects. Let the page render a "Go to your store" button if logged in.
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webpo)$).*)',
  ],
}
