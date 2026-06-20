'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import type { ServicesPageProps } from '../types'

export default function ClassicServicesPage({
    storeSlug,
    services,
    loading,
    error,
    currency,
    onRetry,
}: ServicesPageProps) {
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--sf-foreground)', opacity: 0.4 }} />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-3">
                    <p className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>{error}</p>
                    {onRetry && (
                        <button onClick={onRetry} className="sf-pill sf-pill-inactive border px-4 py-2 text-sm">
                            Try again
                        </button>
                    )}
                </div>
            </div>
        )
    }

    if (!services.length) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>No services available.</p>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="sf-heading text-3xl md:text-4xl font-light tracking-tight mb-8">Services</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                {services.map((service) => {
                    const isAvailable = service.availability === 'available'
                    return (
                        <Link
                            key={service.id}
                            href={`/store/${storeSlug}/services/${service.slug}`}
                            className="sf-tile group block"
                        >
                            {/* Image */}
                            <div className="relative aspect-video sf-bg-muted overflow-hidden">
                                {service.images?.[0] ? (
                                    <img
                                        src={service.images[0]}
                                        alt={service.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-2xl opacity-10">◈</span>
                                    </div>
                                )}
                                <span
                                    className="absolute top-2 left-2 shrink-0 h-2 w-2 rounded-full"
                                    style={{
                                        backgroundColor: isAvailable
                                            ? 'var(--sf-dot-instock, #22c55e)'
                                            : 'var(--sf-dot-outofstock, #ef4444)',
                                    }}
                                />
                            </div>

                            {/* Info */}
                            <div className="pt-3 space-y-1">
                                <h3 className="sf-heading text-base font-normal leading-snug line-clamp-2 sf-tile-name">
                                    {service.name}
                                </h3>

                                {service.description && (
                                    <p
                                        className="text-xs leading-relaxed line-clamp-1"
                                        style={{ color: 'var(--sf-foreground-subtle)' }}
                                    >
                                        {service.description}
                                    </p>
                                )}

                                <p className="text-base font-light sf-text-accent pt-0.5">
                                    {new Intl.NumberFormat('en-KE', {
                                        style: 'currency',
                                        currency: currency || 'KES',
                                    }).format(service.price)}
                                </p>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}