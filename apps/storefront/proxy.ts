import { type NextRequest, NextResponse } from 'next/server'
import { prepareMiddleware } from '@mcloud/auth/server'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import { isPlatformHost, isLocalHost, webAppOrigin } from '@/lib/host'


// ─── Bypass / host helpers ────────────────────────────────────────────────────

const BYPASS_PREFIXES = ['/_next/', '/api/', '/.well-known/'] as const

/**
 * Merchant area (store settings). Served on the platform host only, behind auth.
 * Skips tenant resolution entirely: `org` is never a store slug.
 */
const MERCHANT_PREFIX = '/org'

function isMerchantPath(pathname: string): boolean {
  return pathname === MERCHANT_PREFIX || pathname.startsWith(`${MERCHANT_PREFIX}/`)
}

// ─── Lookup cache ─────────────────────────────────────────────────────────────
// Every storefront request used to hit Supabase from the proxy (host → slug, or
// slug → custom domain), including bot probes. Cache per instance, negatives too.

const LOOKUP_TTL_MS = 60_000
const LOOKUP_MAX = 2000
type Entry<T> = { value: T; expires: number }

async function cached<T>(
  cache: Map<string, Entry<T>>,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.value
  const value = await load()
  if (cache.size >= LOOKUP_MAX) cache.clear()
  cache.set(key, { value, expires: Date.now() + LOOKUP_TTL_MS })
  return value
}

type DomainRow = { slug: string } | null
type SlugRow = { slug: string; custom_domain: string | null } | null
const domainCache = new Map<string, Entry<DomainRow>>()
const slugCache = new Map<string, Entry<SlugRow>>()

/** Store slugs are lowercase alphanumeric + hyphens (3+ chars). Anything else (robots.txt, wp-login.php) cannot be one. */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,}[a-z0-9]$/

async function getSupabaseClient() {
  const { createClient } = await import('@mcloud/db/server')
  return createClient()
}

/**
 * Rewrite to the canonical /store/{slug}{path} route, tagging the resolved slug.
 * Only `pathname` is rewritten; the cloned URL keeps its original query string.
 */
function rewriteToStore(request: NextRequest, slug: string, pathname: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = `/store/${slug}${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url, {
    request: { headers: withStoreSlug(request, slug) },
  })
}

function withStoreSlug(request: NextRequest, slug: string): Headers {
  const headers = new Headers(request.headers)
  headers.set('x-store-slug', slug)
  return headers
}


// ─── Merchant area ────────────────────────────────────────────────────────────

/**
 * /org/* is for signed-in merchants on the platform host. On a custom domain it
 * does not exist (404, never a redirect: the merchant's domain must not reveal or
 * serve the admin surface). The session cookie is shared with the web app via
 * WORKOS_COOKIE_DOMAIN; login itself still happens on the web app, so an
 * unauthenticated visitor is sent there with an app-relative returnTo, which web
 * sends back here once authenticated.
 */
async function handleMerchant(request: NextRequest, host: string): Promise<NextResponse> {
  if (!isPlatformHost(host)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const { session, requestHeaders, finalize } = await prepareMiddleware(request)

  if (!session?.user) {
    const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`
    const login = new URL(loginUrlWithReturn(returnTo), webAppOrigin())
    return finalize(NextResponse.redirect(login, 302))
  }

  return finalize(
    requestHeaders
      ? NextResponse.next({ request: { headers: requestHeaders } })
      : NextResponse.next(),
  )
}


// ─── Proxy Entry Point ────────────────────────────────────────────────────────

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl
  const host = request.headers.get('host') ?? ''

  // ── 0. Merchant area (/org/*) ───────────────────────────────────────────────
  if (isMerchantPath(pathname)) {
    return handleMerchant(request, host)
  }

  // ── 1. Bypass framework / API / static ──────────────────────────────────────
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── 2. Custom domain → resolve host to slug ──────────────────────────────────
  if (!isPlatformHost(host)) {
    const store = await cached(domainCache, host, async () => {
      const supabase = await getSupabaseClient()
      const { data } = await supabase
        .from('stores')
        .select('slug')
        .eq('custom_domain', host)
        .single()
      return data ?? null
    })

    if (!store?.slug) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const { slug } = store

    // White-label: the merchant's internal slug must never appear in a URL on
    // their own domain. If the request carries a /store/{anySlug} prefix, redirect
    // (permanently) to the clean path so the slug is purged from address bars,
    // caches, and search indexes — never silently serve the slug-bearing URL.
    if (/^\/store\/[^/]+/.test(pathname)) {
      const cleanPath = pathname.replace(/^\/store\/[^/]+/, '') || '/'
      const url = request.nextUrl.clone()
      url.pathname = cleanPath
      return NextResponse.redirect(url, 308)
    }

    // Clean path → rewrite internally onto the /store/{slug} route tree. The slug
    // stays server-side; the visible URL remains the bare custom-domain path.
    return rewriteToStore(request, slug, pathname)
  }

  // ── 3. Platform host (shop.mcloud.co.ke, localhost) ────────────────────────
  // Resolve the candidate slug from either /store/{slug}/... (canonical) or the
  // bare /{slug}/... form, then decide: canonicalize to the store's custom domain
  // if it has one, otherwise serve under the platform host.
  const segments = pathname.split('/').filter(Boolean)

  // Root → render as-is.
  if (segments.length === 0) {
    return NextResponse.next()
  }

  const isCanonical = segments[0] === 'store'
  const candidateSlug = isCanonical ? segments[1] : segments[0]
  const rest = isCanonical
    ? '/' + segments.slice(2).join('/')
    : '/' + segments.slice(1).join('/')

  // /store with no slug — nothing to resolve.
  if (!candidateSlug) {
    return NextResponse.next()
  }

  // Not a possible slug (a file probe, a typo): skip the DB round trip entirely.
  if (!SLUG_RE.test(candidateSlug)) {
    return NextResponse.next()
  }

  const store = await cached(slugCache, candidateSlug, async () => {
    const supabase = await getSupabaseClient()
    const { data } = await supabase
      .from('stores')
      .select('slug, custom_domain')
      .eq('slug', candidateSlug)
      .single()
    return data ?? null
  })

  // Unknown slug — fall through; downstream renders 404.
  if (!store?.slug) {
    return NextResponse.next()
  }

  // White-label: a store with a custom domain is only ever served there. Redirect
  // the platform-host URL (canonical or bare) to the clean custom-domain path so
  // the internal slug never appears off-brand. Skipped on localhost/LAN, where no
  // real custom domain is reachable and you need to preview the store in place.
  if (store.custom_domain && !isLocalHost(host)) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    return NextResponse.redirect(
      new URL(`${proto}://${store.custom_domain}${rest}${search}`),
      308,
    )
  }

  // No custom domain. Bare slug → rewrite onto the route tree (hides /store from
  // the URL). Canonical /store/{slug} → already correct, render as-is.
  if (!isCanonical) {
    return rewriteToStore(request, store.slug, rest)
  }
  return NextResponse.next()
}


// ─── Matcher Config ───────────────────────────────────────────────────────────

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
