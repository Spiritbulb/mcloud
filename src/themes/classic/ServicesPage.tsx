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
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
            <h1 className="sf-heading text-3xl font-light tracking-tight mb-8">Services</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => {
                    const isAvailable = service.availability === 'available'
                    return (
                        <Link
                            key={service.id}
                            href={`/store/${storeSlug}/services/${service.slug}`}
                            className="sf-card group block border overflow-hidden hover:shadow-md transition-shadow"
                        >
                            {/* Image */}
                            <div className="aspect-video sf-bg-muted overflow-hidden">
                                {service.images?.[0] ? (
                                    <img
                                        src={service.images[0]}
                                        alt={service.name}
                                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-2xl opacity-10">◈</span>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="p-4 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-sm leading-snug" style={{ color: 'var(--sf-foreground)' }}>
                                        {service.name}
                                    </p>
                                    <span
                                        className="shrink-0 h-2 w-2 rounded-full mt-1.5"
                                        style={{
                                            backgroundColor: isAvailable
                                                ? 'var(--sf-dot-instock, #22c55e)'
                                                : 'var(--sf-dot-outofstock, #ef4444)',
                                        }}
                                    />
                                </div>

                                {service.description && (
                                    <p
                                        className="text-xs leading-relaxed line-clamp-2"
                                        style={{ color: 'var(--sf-foreground-subtle)' }}
                                    >
                                        {service.description}
                                    </p>
                                )}

                                <p className="text-sm font-light pt-1" style={{ color: 'var(--sf-foreground)' }}>
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