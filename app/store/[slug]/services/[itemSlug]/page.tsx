'use client'

import '@/app/store/[slug]/storefront.css'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/client'
import { useCart } from '@/contexts/CartContext'
import ClassicServiceDetailPage from '@/src/themes/classic/ServiceDetailsPage'

import type { ServiceItem, ServicePackage, ServiceDetailsPageProps } from '@/src/themes/types'

const THEME_COMPONENTS: Record<string, React.ComponentType<ServiceDetailsPageProps>> = {
    classic: ClassicServiceDetailPage,
}

export default function ServiceSlugPage() {
    const params = useParams()
    const itemSlug = params?.['itemSlug'] as string
    const { storeSlug, addToCart, itemLoadingStates } = useCart()
    const supabase = createClient()

    const [service, setService] = useState<ServiceItem | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null)
    const [quantity, setQuantity] = useState(1)
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
    const [isBooking, setIsBooking] = useState(false)
    const [themeId, setThemeId] = useState('classic')

    const fetchService = useCallback(async () => {
        try {
            setError(null)
            setLoading(true)
            if (!storeSlug || !itemSlug) throw new Error('Store or service not available')

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

            const { data: serviceData, error: serviceError } = await (supabase as any)
                .from('services')
                .select('id, name, slug, description, price, is_active, sku, metadata')
                .eq('store_id', store.id)
                .eq('slug', itemSlug)
                .eq('is_active', true)
                .single()

            if (serviceError || !serviceData) {
                setError('Service not found')
                return
            }

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

            const featured = (raw.metadata?.packages ?? []).find(
                (p: ServicePackage) => p.is_featured
            ) ?? null
            setSelectedPackage(featured)

        } catch (err: any) {
            console.error('Error fetching service:', err)
            setError(err.message || 'Failed to fetch service')
        } finally {
            setLoading(false)
        }
    }, [storeSlug, itemSlug])

    useEffect(() => {
        if (itemSlug) fetchService()
    }, [fetchService])

    const handlePackageChange = useCallback((packageId: string) => {
        const pkg = (service?.metadata?.packages ?? []).find(
            (p: ServicePackage) => p.id === packageId
        ) ?? null
        setSelectedPackage(pkg)
    }, [service])

    // ✅ mirrors handleAddToCart 
    const handleBookService = useCallback(async () => {
        if (!service || !storeSlug) return
        setIsBooking(true)
        try {

            const price = selectedPackage
                ? parseFloat(String(selectedPackage.price))
                : service.price

            const name = selectedPackage
                ? `${service.name} — ${selectedPackage.name}`
                : service.name

            const image =
                service.media?.find((m) => m.type === 'image')?.url ??
                service.metadata?.media?.find((m) => m.type === 'image')?.url ??
                ''

            // Use package id as variantId if selected, else service id
            const variantId = selectedPackage?.id ?? service.id

            await addToCart({
                variantId,
                productId: service.id,
                name,
                price,
                image,
                quantity,
            })
        } finally {
            setIsBooking(false)
        }
    }, [service, selectedPackage, quantity, storeSlug, addToCart])

    // Loading state for the book button — mirrors variantLoading in product page
    const bookingLoading = selectedPackage?.id
        ? itemLoadingStates[selectedPackage.id]
        : itemLoadingStates[service?.id ?? '']

    if (loading) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center">
                <div className="text-center space-y-3">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: 'var(--sf-foreground)', opacity: 0.5 }} />
                    <p className="text-sm font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        Loading service details...
                    </p>
                </div>
            </div>
        )
    }

    if (error || !service) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center">
                <div className="sf-card max-w-md w-full p-6 border space-y-3" style={{ borderColor: 'var(--sf-border-strong)' }}>
                    <p className="sf-heading font-semibold" style={{ color: 'var(--sf-foreground)' }}>
                        Service Not Found
                    </p>
                    <p className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        {error || "The service you're looking for doesn't exist."}
                    </p>
                    <Link href="/services" className="sf-pill sf-pill-inactive border inline-flex items-center gap-2 px-4 py-2 text-sm mt-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Services
                    </Link>
                </div>
            </div>
        )
    }

    const PageComponent = THEME_COMPONENTS[themeId] ?? ClassicServiceDetailPage

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
            isBooking={isBooking || (bookingLoading ?? false)}
            metadata={{ quantityUnit: service.metadata?.quantityUnit ?? '' }}
        />
    )
}