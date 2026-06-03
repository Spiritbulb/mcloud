'use client'

import { useState } from 'react'
import type { ServiceItem, ServicePackage } from '@/src/themes/types'
import type { ThemeComponents } from '@/src/themes/resolver'

interface Props {
    storeSlug: string
    service: ServiceItem
    ServiceDetailPage: ThemeComponents['ServiceDetailPage']
}

export default function ServiceDetailClient({ storeSlug, service, ServiceDetailPage }: Props) {
    const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(
        service.packages?.find(p => p.is_featured) ?? service.packages?.[0] ?? null
    )
    const [quantity, setQuantity] = useState(1)
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
    const [isBooking, setIsBooking] = useState(false)

    const handleBookService = async () => {
        setIsBooking(true)
        // Booking logic will be wired here
        setIsBooking(false)
    }

    return (
        <ServiceDetailPage
            storeSlug={storeSlug}
            service={service}
            selectedPackage={selectedPackage}
            quantity={quantity}
            currentMediaIndex={currentMediaIndex}
            onPackageChange={id => setSelectedPackage(service.packages?.find(p => p.id === id) ?? null)}
            onQuantityChange={setQuantity}
            onMediaChange={setCurrentMediaIndex}
            onBookService={handleBookService}
            isBooking={isBooking}
            metadata={{ quantityUnit: service.metadata?.quantityUnit ?? '' }}
        />
    )
}
