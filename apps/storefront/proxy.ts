import { type NextRequest, NextResponse } from 'next/server'


// ─── Bypass / host helpers ────────────────────────────────────────────────────

const BYPASS_PREFIXES = ['/_next/', '/api/', '/.well-known/'] as const

function isPlatformHost(host: string): boolean {
  return (
    host === 'menengai.cloud' ||
    host.endsWith('.menengai.cloud') ||
    host.includes('localhost') ||
    host.includes('192.168.1.') ||
    host.includes('127.0.0.1')
  )
}

async function getSupabaseClient() {
  const { createClient } = await import('@mcloud/db/server')
  return createClient()
}

/** Rewrite to the canonical /store/{slug}{path} route, tagging the resolved slug. */
function rewriteToStore(request: NextRequest, slug: string, path: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = `/store/${slug}${path === '/' ? '' : path}`
  return NextResponse.rewrite(url, {
    request: { headers: withStoreSlug(request, slug) },
  })
}

function withStoreSlug(request: NextRequest, slug: string): Headers {
  const headers = new Headers(request.headers)
  headers.set('x-store-slug', slug)
  return headers
}


// ─── Proxy Entry Point ────────────────────────────────────────────────────────

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl
  const host = request.headers.get('host') ?? ''

  // ── 1. Bypass framework / API / static ──────────────────────────────────────
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── 2. Custom domain → resolve host to slug ──────────────────────────────────
  if (!isPlatformHost(host)) {
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

    // A custom domain should never carry a /store/{anySlug} prefix. Strip one if
    // present (e.g. someone shared https://locdessence.shop/store/locd26/cart) so
    // it resolves to the bare storefront path.
    const path = pathname.replace(/^\/store\/[^/]+/, '') || '/'

    return rewriteToStore(request, slug, `${path}${search}`)
  }

  // ── 3. Platform host → bare slug rewrite ─────────────────────────────────────
  const firstSeg = pathname.split('/')[1] ?? ''

  // Already canonical, or the root — render as-is.
  if (firstSeg === '' || firstSeg === 'store') {
    return NextResponse.next()
  }

  const supabase = await getSupabaseClient()
  const { data: store } = await supabase
    .from('stores')
    .select('slug')
    .eq('slug', firstSeg)
    .single()

  if (store?.slug) {
    const rest = pathname.slice(`/${firstSeg}`.length) || '/'
    return rewriteToStore(request, store.slug, `${rest}${search}`)
  }

  // Unknown first segment — fall through; downstream renders 404.
  return NextResponse.next()
}


// ─── Matcher Config ───────────────────────────────────────────────────────────

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
