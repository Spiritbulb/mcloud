import { auth0 } from '@/lib/auth0'
import { type NextRequest, NextResponse } from 'next/server'

const PROTECTED_STORE_SUBPATHS = [
  '/settings',
  '/orders',
  '/products/new',
]

const BYPASS_PREFIXES = [
  '/auth/',
  '/api/',
  '/_next/',
]

// Pages where banner should NOT appear even if authenticated
const BANNER_EXCLUDED_PREFIXES = [
  '/settings',
  '/dashboard',
  '/orders',
  '/products/new',
  '/auth/',
  '/api/',
  '/onboarding',
]

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

// Inline the banner script so we don't need a separate fetch.
// Keep it small — no external deps, no framework.
function buildBannerScript(dashboardUrl: string, pageType: 'homepage' | 'storefront' | 'other'): string {
  return `<script data-dashboard="${dashboardUrl}" data-page="${pageType}">(function(){var STORAGE_KEY='mng_banner_dismissed';var DELAY_PAGES=['homepage','storefront'];var script=document.currentScript;var dashboardUrl=script&&script.dataset.dashboard||'/settings';var pageType=script&&script.dataset.page||'other';if(sessionStorage.getItem(STORAGE_KEY))return;if(window.location.pathname.includes('/settings'))return;var delay=DELAY_PAGES.includes(pageType)?2000+Math.random()*3000:800;function inject(){var banner=document.createElement('div');banner.id='mng-owner-banner';banner.innerHTML='<style>#mng-owner-banner{position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;height:36px;background:#1c2228;color:#f5f0eb;font-family:ui-monospace,monospace;font-size:12px;letter-spacing:.01em;transform:translateY(-100%);transition:transform .25s cubic-bezier(.16,1,.3,1);box-shadow:0 1px 0 rgba(255,255,255,.06)}#mng-owner-banner.mng-visible{transform:translateY(0)}#mng-owner-banner a{color:#c9a96e;text-decoration:none;font-weight:500;white-space:nowrap;flex-shrink:0}#mng-owner-banner a:hover{text-decoration:underline;text-underline-offset:3px}#mng-owner-banner .mng-label{opacity:.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#mng-owner-banner button{background:none;border:none;color:#f5f0eb;opacity:.4;cursor:pointer;padding:4px;font-size:14px;line-height:1;flex-shrink:0;transition:opacity .15s}#mng-owner-banner button:hover{opacity:.8}</style><span class="mng-label">You\\'re viewing your store</span><a href="'+dashboardUrl+'">Edit your store \u2192</a><button aria-label="Dismiss">\u2715</button>';document.body.prepend(banner);requestAnimationFrame(function(){requestAnimationFrame(function(){banner.classList.add('mng-visible')})});banner.querySelector('button').addEventListener('click',function(){banner.style.transform='translateY(-100%)';sessionStorage.setItem(STORAGE_KEY,'1');setTimeout(function(){banner.remove()},300)})}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){setTimeout(inject,delay)})}else{setTimeout(inject,delay)}})()</script>`
}

// Inject banner script just before </body>
function injectBanner(response: NextResponse, dashboardUrl: string, pageType: 'homepage' | 'storefront' | 'other'): NextResponse {
  const script = buildBannerScript(dashboardUrl, pageType)
  response.headers.set('x-inject-owner-banner', Buffer.from(script).toString('base64'))
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

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'

  // ══════════════════════════════════════════════════════════════════════════
  // 1. CUSTOM DOMAIN HIT
  // ══════════════════════════════════════════════════════════════════════════
  if (
    !host.endsWith('.menengai.cloud') &&
    host !== 'menengai.cloud' &&
    !host.includes('localhost') &&
    !host.includes('192.168.1.')
  ) {
    if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
      return auth0.middleware(request)
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
    const storePrefix = `/store/${slug}`

    if (pathname.startsWith(storePrefix)) {
      const cleanPath = pathname.slice(storePrefix.length) || '/'
      return NextResponse.redirect(
        toCustomDomainUrl(request, host, `${cleanPath}${request.nextUrl.search}`),
        308,
      )
    }

    if (PROTECTED_STORE_SUBPATHS.some((sub) => pathname.startsWith(sub))) {
      return NextResponse.redirect(
        toSubdomainUrl(request, slug, `${pathname}${request.nextUrl.search}`),
        308,
      )
    }

    // Public storefront on custom domain — check for owner session
    const url = request.nextUrl.clone()
    url.pathname = `/store/${slug}${pathname === '/' ? '' : pathname}`
    const rewrite = NextResponse.rewrite(url)

    const shouldBanner = !BANNER_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))
    if (shouldBanner) {
      const owner = await getOwnerSession(request)
      if (owner) {
        const dashboardUrl = toSubdomainUrl(request, slug, '/settings').toString()
        injectBanner(rewrite, dashboardUrl, 'storefront')
      }
    }

    return rewrite
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. SUBDOMAIN HIT  (slug.menengai.cloud)
  // ══════════════════════════════════════════════════════════════════════════
  const devTenant = searchParams.get('_tenant')
  const tenantSlug = getTenantSlug(host) ?? devTenant ?? null

  if (tenantSlug) {
    if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
      return auth0.middleware(request)
    }

    if (!devTenant && isProduction(host)) {
      const isOwnerRoute = PROTECTED_STORE_SUBPATHS.some((sub) => pathname.startsWith(sub))

      if (!isOwnerRoute) {
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
            toCustomDomainUrl(request, store.custom_domain, `${cleanPath}${request.nextUrl.search}`),
            308,
          )
        }
      }
    }

    const storePrefix = `/store/${tenantSlug}`
    if (pathname.startsWith(storePrefix)) {
      const cleanPath = pathname.slice(storePrefix.length) || '/'
      return NextResponse.redirect(
        new URL(`${proto}://${tenantSlug}.menengai.cloud${cleanPath}${request.nextUrl.search}`),
        308,
      )
    }

    // Owner/admin routes → rewrite + enforce Auth0 session
    if (PROTECTED_STORE_SUBPATHS.some((sub) => pathname.startsWith(sub))) {
      const authResponse = await auth0.middleware(request)
      if (authResponse.status !== 200) return authResponse

      const url = request.nextUrl.clone()
      url.pathname = `/store/${tenantSlug}${pathname}`
      const rewriteResponse = NextResponse.rewrite(url)
      authResponse.headers.forEach((value, key) => {
        rewriteResponse.headers.set(key, value)
      })
      return rewriteResponse
    }

    // Public storefront on subdomain — check for owner session
    const url = request.nextUrl.clone()
    url.pathname = `/store/${tenantSlug}${pathname === '/' ? '' : pathname}`
    const rewrite = NextResponse.rewrite(url)

    const shouldBanner = !BANNER_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))
    if (shouldBanner) {
      const owner = await getOwnerSession(request)
      if (owner) {
        const dashboardUrl = `${proto}://${tenantSlug}.menengai.cloud/settings`
        injectBanner(rewrite, dashboardUrl, 'storefront')
      }
    }

    return rewrite
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. MAIN PLATFORM  (menengai.cloud or localhost)
  // ══════════════════════════════════════════════════════════════════════════

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

  // Homepage — check for owner session and inject banner
  if (pathname === '/') {
    const authResponse = await auth0.middleware(request)
    const owner = await getOwnerSession(request)

    if (owner) {
      const { createClient } = await import('@/lib/server')
      const supabase = await createClient()
      const { data: store } = await supabase
        .from('stores')
        .select('slug')
        .eq('owner_id', owner.sub)
        .single()

      if (store?.slug) {
        const dashboardUrl = isProduction(host)
          ? `${proto}://${store.slug}.menengai.cloud/store/${store.slug}/settings`
          : `/store/${store.slug}/settings`
        injectBanner(authResponse, dashboardUrl, 'homepage')
      }
    }

    return authResponse
  }

  // All other platform routes — let Auth0 handle session + protection
  return auth0.middleware(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}