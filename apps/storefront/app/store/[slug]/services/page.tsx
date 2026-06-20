'use client'
import '@/app/store/[slug]/storefront.css'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'

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

            // Server route maps the DB row → ServiceItem and resolves the theme.
            const res = await fetch(`/api/store/${storeSlug}/services/${serviceSlug}`)
            if (!res.ok) throw new Error('Service not found')
            const { service: mapped, themeId: resolvedTheme } = (await res.json()) as {
                service: ServiceItem
                themeId: string
            }

            setThemeId(resolvedTheme ?? 'classic')
            setService(mapped)

            // Auto-select featured package
            const featured = (mapped.metadata?.packages ?? []).find(
                (p: ServicePackage) => p.is_featured,
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