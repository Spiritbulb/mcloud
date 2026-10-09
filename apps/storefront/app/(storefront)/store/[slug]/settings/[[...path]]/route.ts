// app/(storefront)/store/[slug]/settings/[[...path]]/route.ts
// Store-settings shim — redirect /store/{slug}/settings/* into the org-scoped
// settings (or the org hub if the store has no org yet). Route Handler (clean
// HTTP redirect) so there's no layout-hydration race.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { isPlatformHost, platformOrigin, webUrl } from '@/lib/host'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; path?: string[] }> },
) {
    const { slug, path } = await params
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('slug, org:orgs(slug)')
        .eq('slug', slug)
        .single()

    const orgSlug = store ? (store.org as { slug?: string } | null)?.slug : null
    const rest = path?.length ? `/${path.join('/')}` : ''
    const host = request.headers.get('host') ?? ''

    // No org yet: the org hub (still on the web app) sorts it out.
    if (!orgSlug) return NextResponse.redirect(webUrl('/org'))

    // Settings are served here, on the platform host. On the platform host that is a
    // same-origin redirect; from a merchant's custom domain (where /org/* is 404)
    // it must go to the platform origin.
    const dest = `/org/${orgSlug}/${slug}/settings${rest}${request.nextUrl.search}`
    const base = isPlatformHost(host) ? request.url : platformOrigin()
    return NextResponse.redirect(new URL(dest, base))
}
