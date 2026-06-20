// app/api/store/[slug]/services/[serviceSlug]/route.ts
// Public service-detail data. Replaces a client-side anon-key read of stores +
// services. Services are public catalog content, so no auth — service-role read,
// scoped to the active store + active service. Returns the mapped ServiceItem plus
// the resolved themeId so the client renders without touching the DB.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'

const noStore = { 'Cache-Control': 'no-store' }

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string; serviceSlug: string }> },
) {
    const { slug, serviceSlug } = await params
    const admin = await createClient()

    const { data: store } = await admin
        .from('stores')
        .select('id, settings, theme:store_themes(theme_id)')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: noStore })

    const themeId =
        (store as { theme?: { theme_id?: string } | null }).theme?.theme_id ??
        (store.settings as { themeId?: string } | null)?.themeId ??
        'classic'

    const { data: raw } = await admin
        .from('services')
        .select('id, name, slug, description, price, is_active, sku, metadata')
        .eq('store_id', store.id)
        .eq('slug', serviceSlug)
        .eq('is_active', true)
        .single()
    if (!raw) return NextResponse.json({ error: 'Service not found' }, { status: 404, headers: noStore })

    const meta = (raw.metadata ?? {}) as Record<string, any>
    const service = {
        id: raw.id,
        name: raw.name,
        slug: raw.slug,
        description: raw.description ?? null,
        price: raw.price,
        compare_at_price: null,
        images: [],
        is_active: raw.is_active,
        sku: raw.sku ?? null,
        item_type: 'service',
        media: meta.media ?? [],
        availability: meta.availability ?? 'available',
        packages: meta.packages ?? [],
        metadata: {
            serviceType: meta.serviceType ?? null,
            quantityUnit: meta.quantityUnit ?? '',
            booking: meta.booking ?? 'instant',
            tags: meta.tags ?? [],
            rating: meta.rating ?? null,
            reviews: meta.reviews ?? null,
            features: meta.features ?? [],
            descriptionHtml: meta.descriptionHtml ?? null,
            durationMinutes: meta.durationMinutes ?? null,
            durationHours: meta.durationHours ?? null,
            durationDay: meta.durationDay ?? null,
            minQuantity: meta.minQuantity ?? null,
            maxQuantity: meta.maxQuantity ?? null,
            quantityStep: meta.quantityStep ?? null,
            deliveryDays: meta.deliveryDays ?? null,
            location: meta.location ?? null,
            requiresDeposit: meta.requiresDeposit ?? false,
            depositPercent: meta.depositPercent ?? null,
            packages: meta.packages ?? [],
            media: meta.media ?? [],
            availability: meta.availability ?? 'available',
        },
    }

    return NextResponse.json({ service, themeId }, { headers: noStore })
}
