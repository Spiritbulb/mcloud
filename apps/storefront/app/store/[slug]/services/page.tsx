'use client'
import '@/app/store/[slug]/storefront.css'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'
import { createClient } from '@mcloud/db/client'

import ClassicServiceDetailPage from '@mcloud/themes/classic/ServiceDetailsPage'

import type {
    ServiceItem,
    ServicePackage,
    ServiceDetailsPageProps,
} from '@mcloud/themes/types'

const THEME_COMPONENTS: Record<string, React.ComponentType<ServiceDetailsPageProps>> = {
    classic: ClassicServiceDetailPage,
}

export default function ServiceDetailContainer() {
    const { storeSlug } = useCart()
    const params = useParams<{ serviceSlug: string }>()
    const serviceSlug = params?.serviceSlug
    const supabase = createClient()

    const [service, setService] = useState<ServiceItem | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [themeId, setThemeId] = useState<string>('classic')

    const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null)
    const [quantity, setQuantity] = useState(1)
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
    const [isBooking, setIsBooking] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            setError(null)
            setLoading(true)

            if (!storeSlug) throw new Error('Store slug not available')
            if (!serviceSlug) throw new Error('Service slug not available')

            // 1. Resolve store + theme
            const { data: store, error: storeError } = await supabase
                .from('stores')
                .select('id, settings, theme:store_themes(theme_id)')
                .eq('slug', storeSlug)
                .eq('is_active', true)
                .single()

            if (storeError || !store) throw new Error('Store not found')

            const resolvedTheme =
                (store as any).theme?.theme_id ??
                (store.settings as any)?.themeId ??
                'classic'
            setThemeId(resolvedTheme)

            // 2. Fetch from services table ✅
            const { data: serviceData, error: serviceError } = await (supabase as any)
                .from('services')
                .select('id, name, slug, description, price, is_active, sku, metadata')
                .eq('store_id', store.id)
                .eq('slug', serviceSlug)
                .eq('is_active', true)
                .single()

            if (serviceError || !serviceData) throw new Error('Service not found')

            // 3. Map DB row → ServiceItem shape
            const raw = serviceData as any
            const mapped: ServiceItem = {
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

            setService(mapped)

            // 4. Auto-select featured package
            const featured = (raw.metadata?.packages ?? []).find(
                (p: ServicePackage) => p.is_featured
            ) ?? null
            setSelectedPackage(featured)

        } catch (err: any) {
            console.error('Error fetching service:', err)
            setError(err.message || 'Failed to load service.')
        } finally {
            setLoading(false)
        }
    }, [storeSlug, serviceSlug])

    useEffect(() => { fetchData() }, [fetchData])

    const handlePackageChange = useCallback(
        (packageId: string) => {
            const pkg = (service?.metadata?.packages ?? []).find(
                (p: ServicePackage) => p.id === packageId
            ) ?? null
            setSelectedPackage(pkg)
        },
        [service]
    )

    const handleBookService = useCallback(async () => {
        if (!service || !storeSlug) return
        setIsBooking(true)
        try {
            console.log('Book service:', {
                serviceId: service.id,
                packageId: selectedPackage?.id ?? null,
                quantity,
            })
        } finally {
            setIsBooking(false)
        }
    }, [service, selectedPackage, quantity, storeSlug])

    const PageComponent = THEME_COMPONENTS[themeId] ?? ClassicServiceDetailPage

    if (loading) return null
    if (error || !service) return null

    return (
        <PageComponent
            storeSlug={storeSlug ?? ''}
            service={service}
            selectedPackage={selectedPackage}
            quantity={quantity}
            currentMediaIndex={currentMediaIndex}
            onPackageChange={handlePackageChange}
            onQuantityChange={setQuantity}
            onMediaChange={setCurrentMediaIndex}
            onBookService={handleBookService}
            isBooking={isBooking}
            metadata={{ quantityUnit: service.metadata?.quantityUnit ?? '' }}
        />
    )
}