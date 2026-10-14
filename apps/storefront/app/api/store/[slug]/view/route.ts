// @route-kind: public — counts a visit to a public store home; no caller identity involved
// app/api/store/[slug]/view/route.ts
//
// The store home is served from the CDN, so the server never sees a visit render. The
// page sends this beacon once per browser session instead (see StoreViewBeacon).

import { createPublicClient } from '@mcloud/db/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params
    const supabase = createPublicClient()

    const { data: store } = await supabase
        .from('stores')
        .select('id, is_active')
        .eq('slug', slug)
        .maybeSingle()
    if (!store?.is_active) return NextResponse.json({ ok: true })

    const { error } = await supabase.rpc('increment_store_views', { store_id: store.id })
    if (error) console.error('[storefront] view count failed:', error.message)
    return NextResponse.json({ ok: true })
}
