import '@/app/store/[slug]/storefront.css'
import { createClient } from '@mcloud/db/server'
import { notFound } from 'next/navigation'
import { resolveTheme } from '@mcloud/themes/resolver'
import type { ServiceItem } from '@mcloud/themes/types'
import ServiceDetailClient from './service-detail-client'

interface Props {
    params: Promise<{ slug: string; itemSlug: string }>
}

export default async function ServiceDetailPage({ params }: Props) {
    const { slug, itemSlug } = await params
    const supabase = await createClient()

    const { data: rawStore } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
    if (!rawStore) notFound()

    const { data: raw } = await (supabase as any)
        .from('services')
        .select('id, name, slug, description, price, is_active, sku, metadata')
        .eq('store_id', rawStore.id)
        .eq('slug', itemSlug)
        .eq('is_active', true)
        .single()
    if (!raw) notFound()

    const service: ServiceItem = {
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
        media: raw.metadata?.media ?? [],
        availability: raw.metadata?.availability ?? 'available',
        packages: raw.metadata?.packages ?? [],
        metadata: {
            serviceType: raw.metadata?.serviceType ?? null,
            quantityUnit: raw.metadata?.quantityUnit ?? '',
            booking: raw.metadata?.booking ?? 'instant',
            tags: raw.metadata?.tags ?? [],
            rating: raw.metadata?.rating ?? null,
            reviews: raw.metadata?.reviews ?? null,
            features: raw.metadata?.features ?? [],
            descriptionHtml: raw.metadata?.descriptionHtml ?? null,
            durationMinutes: raw.metadata?.durationMinutes ?? null,
            durationHours: raw.metadata?.durationHours ?? null,
            durationDay: raw.metadata?.durationDay ?? null,
            minQuantity: raw.metadata?.minQuantity ?? null,
            maxQuantity: raw.metadata?.maxQuantity ?? null,
            quantityStep: raw.metadata?.quantityStep ?? null,
            deliveryDays: raw.metadata?.deliveryDays ?? null,
            location: raw.metadata?.location ?? null,
            requiresDeposit: raw.metadata?.requiresDeposit ?? false,
            depositPercent: raw.metadata?.depositPercent ?? null,
            packages: raw.metadata?.packages ?? [],
            media: raw.metadata?.media ?? [],
            availability: raw.metadata?.availability ?? 'available',
        },
    }

    const themeId = (rawStore.settings as any)?.themeId ?? 'classic'
    const { ServiceDetailPage: ServiceDetailPageComponent } = await resolveTheme(themeId)

    return (
        <ServiceDetailClient
            storeSlug={slug}
            service={service}
            ServiceDetailPage={ServiceDetailPageComponent}
        />
    )
}
