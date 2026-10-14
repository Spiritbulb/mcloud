// @route-kind: public — public storefront read
// app/api/store/[slug]/info/route.ts
// Minimal public store info for client components that previously read `stores` /
// `store_themes` directly with the anon key (e.g. the cart page resolving its
// theme). Service-role read, exposing only non-sensitive presentation fields.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params
    const admin = await createClient()
    const { data: store } = await admin
        .from('stores')
        .select('id, settings, theme:store_themes(theme_id)')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    }

    const themeId =
        (store as { theme?: { theme_id?: string } | null }).theme?.theme_id ??
        (store.settings as { themeId?: string } | null)?.themeId ??
        'classic'

    // The cart must not claim "Free" shipping for a store that has delivery zones.
    const { count: zoneCount } = await admin
        .from('delivery_zones')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)

    // The store's own public contact points (both are already shown on its site), for the
    // checkout's "don't see your area?" line.
    const settings = (store.settings && typeof store.settings === 'object' && !Array.isArray(store.settings)
        ? store.settings
        : {}) as { contact?: { email?: unknown }; socialLinks?: { whatsapp?: unknown } }
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

    return NextResponse.json(
        {
            themeId,
            hasDeliveryZones: (zoneCount ?? 0) > 0,
            contact: { email: str(settings.contact?.email), whatsapp: str(settings.socialLinks?.whatsapp) },
        },
        { headers: { 'Cache-Control': 'no-store' } },
    )
}
