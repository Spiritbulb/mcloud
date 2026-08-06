// app/api/store/[slug]/gallery/route.ts
// Google-Photos-backed gallery. Hardcoded to one connected Google account/album
// per store for now (TBS launch) — generalize to per-store OAuth later.
//
// Flow:
// 1. A refresh_token for the connected Google account lives in `store_integrations`
//    (one row per store, provider='google_photos'), set once via a manual
//    connect step (Picker API session, done outside this route).
// 2. On each GET, we exchange the refresh_token for a fresh access_token,
//    then call mediaItems.search (Library API, album-scoped — still valid for
//    app-created/picked albums) or mediaItems.batchGet with stored media item
//    ids to get fresh baseUrls (they expire ~60 min, never cache them).
// 3. Response is normalized to the shape DriftWall/gallery components expect.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { getActiveStoreId } from '@/lib/customer-auth'

const noStore = { 'Cache-Control': 'no-store' }

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const PHOTOS_MEDIAITEMS_URL = 'https://photoslibrary.googleapis.com/v1/mediaItems'

type GalleryItem = {
    image: string
    title: string
    href?: string
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_PHOTOS_CLIENT_ID!,
            client_secret: process.env.GOOGLE_PHOTOS_CLIENT_SECRET!,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
        cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.access_token ?? null
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
        refresh_token?: string
        media_item_ids?: string[]
    }

    if (!config.refresh_token) {
        // Not connected yet — empty gallery, not an error, so the UI degrades
        // the same as "no photos added" rather than crashing.
        return NextResponse.json({ items: [] as GalleryItem[] }, { headers: noStore })
    }

    const accessToken = await refreshAccessToken(config.refresh_token)
    if (!accessToken) {
        return NextResponse.json({ items: [] as GalleryItem[] }, { headers: noStore })
    }

    // Stored media item ids (captured once via the Picker API session at
    // connect-time) — batchGet returns fresh baseUrls for exactly those items,
    // no re-picking needed, no drift if the client adds unrelated photos later.
    const ids: string[] = config.media_item_ids ?? []
    if (ids.length === 0) {
        return NextResponse.json({ items: [] as GalleryItem[] }, { headers: noStore })
    }

    const qs = new URLSearchParams()
    ids.forEach((id) => qs.append('mediaItemIds', id))

    const res = await fetch(`${PHOTOS_MEDIAITEMS_URL}:batchGet?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
    })

    if (!res.ok) {
        return NextResponse.json({ items: [] as GalleryItem[] }, { headers: noStore })
    }

    const data = await res.json()
    const items: GalleryItem[] = (data.mediaItemResults ?? [])
        .filter((r: any) => r.mediaItem?.baseUrl)
        .map((r: any) => ({
            // =w1200-h800 caps request size, keeps the batch call light against
            // the media-bytes quota rather than pulling full resolution.
            image: `${r.mediaItem.baseUrl}=w1200-h800`,
            title: r.mediaItem.filename ?? '',
        }))

    return NextResponse.json({ items }, { headers: noStore })
}