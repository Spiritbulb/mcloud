// app/(storefront)/store/[slug]/settings/[[...path]]/route.ts
// Store-settings shim — redirect /store/{slug}/settings/* into the org-scoped
// settings (or the org hub if the store has no org yet). Route Handler (clean
// HTTP redirect) so there's no layout-hydration race.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { webAppOrigin } from '@/lib/host'

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
    // Merchant settings live on the web-app origin, not the storefront/custom
    // domain. Resolve against webAppOrigin() so the redirect crosses domains.
    const dest = orgSlug ? `/org/${orgSlug}/${slug}/settings${rest}` : '/org'
    return NextResponse.redirect(new URL(dest, webAppOrigin()))
}
