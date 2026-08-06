// app/api/store/[slug]/gallery/route.ts
// Serves TBS's gallery from Supabase Storage — images were downloaded once
// via the connect-google-photos.mjs script and uploaded to the store-assets
// bucket, so this route never talks to Google at request time (Picker
// sessions and baseUrls aren't meant to be queried long after the original
// pick — see connect script comments).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { getActiveStoreId } from '@/lib/customer-auth'

const noStore = { 'Cache-Control': 'no-store' }

type GalleryItem = {
    image: string
    title: string
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params
    const storeId = await getActiveStoreId(slug)
    if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: noStore })

    const admin = await createClient()

    const { data: integration } = await admin
        .from('store_integrations')
        .select('config')
        .eq('store_id', storeId)
        .eq('provider', 'google_photos')
        .maybeSingle()

    const config = (integration?.config ?? {}) as {
        connected?: boolean
        items?: GalleryItem[]
    }

    // Not connected, or connected but empty — same shape either way, so the
    // UI degrades the same as "no photos added" rather than erroring.
    const items = config.connected ? (config.items ?? []) : []

    return NextResponse.json({ items }, { headers: noStore })
}