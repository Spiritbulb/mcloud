'use client'

import { useState } from 'react'
import {
    Star,
    Clock,
    MapPin,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CalendarCheck,
    Loader2,
    Package,
    ArrowLeft,
    Zap,
    Minus,
    Plus,

    RefreshCw,
    ShieldCheck,
    BadgePercent,
    Play,
    Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ServiceDetailsPageProps, ServicePackage } from '../types'

// ─── Availability badge ───────────────────────────────────────────────────────
function AvailabilityBadge({ status }: { status: 'available' | 'busy' | 'unavailable' }) {
    const map = {
        available: { dot: 'sf-dot-instock', label: 'Available' },
        busy: { dot: 'sf-dot-busy', label: 'Currently Busy' },
        unavailable: { dot: 'sf-dot-outofstock', label: 'Unavailable' },
    }
    const { dot, label } = map[status]
    return (
        <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
            <span className={cn('h-2 w-2 rounded-full', dot)} />
            {label}
        </span>
    )
}

// ─── Media gallery ────────────────────────────────────────────────────────────
function MediaGallery({
    media,
    currentIndex,
    onMediaChange,
    serviceName,
}: {
    media: ServiceDetailsPageProps['service']['media']
    currentIndex: number
    onMediaChange: (i: number) => void
    serviceName: string
}) {
    const current = media[currentIndex]
    const hasMultiple = media.length > 1

    return (
        <div className="space-y-3">
            {/* Main viewer */}
            <div className="relative overflow-hidden rounded-lg aspect-4/3 sf-bg-muted group">
                {current?.type === 'video' ? (
                    <div className="relative w-full h-full">
                        <video
                            src={current.url}
                            className="w-full h-full object-cover"
                            controls
                            poster={media.find((m) => m.type === 'image')?.url}
                        />
                    </div>
                ) : (
                    <img
                        src={current?.url ?? '/api/placeholder/800/600'}
                        alt={current?.alt ?? serviceName}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                )}

                {/* Navigation arrows */}
                {hasMultiple && (
                    <>
                        <button
                            onClick={() => onMediaChange((currentIndex - 1 + media.length) % media.length)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full sf-bg-base/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            style={{ color: 'var(--sf-foreground)' }}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => onMediaChange((currentIndex + 1) % media.length)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full sf-bg-base/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            style={{ color: 'var(--sf-foreground)' }}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {media.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => onMediaChange(i)}
                                    className={cn(
                                        'h-1.5 rounded-full transition-all duration-200',
                                        i === currentIndex ? 'w-5 sf-bg-accent' : 'w-1.5 bg-white/50'
                                    )}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Thumbnails */}
            {hasMultiple && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {media.map((item, i) => (
                        <button
                            key={item.id}
                            onClick={() => onMediaChange(i)}
                            className={cn(
                                'relative shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all duration-150',
                                i === currentIndex
                                    ? 'border-(--sf-accent)'
                                    : 'border-transparent opacity-60 hover:opacity-100'
                            )}
                        >
                            {item.type === 'video' ? (
                                <div className="w-full h-full sf-bg-muted flex items-center justify-center">
                                    <Play className="w-4 h-4" style={{ color: 'var(--sf-foreground-subtle)' }} />
                                </div>
                            ) : (
                                <img src={item.url} alt={item.alt ?? ''} className="w-full h-full object-cover" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Package card ─────────────────────────────────────────────────────────────
function PackageCard({
    pkg,
    isSelected,
    onSelect,
}: {
    pkg: ServicePackage
    isSelected: boolean
    onSelect: () => void
}) {
    return (
        <button
            onClick={onSelect}
            className={cn(
                'w-full text-left rounded-lg p-4 border transition-all duration-200 relative',
                isSelected
                    ? 'border-(--sf-accent) shadow-md'
                    : 'sf-card hover:shadow-sm'
            )}
            style={
                isSelected
                    ? { borderColor: 'var(--sf-accent)', background: 'var(--sf-accent-subtle, var(--sf-bg-muted))' }
                    : {}
            }
        >
            {pkg.is_featured && (
                <span className="sf-badge-sale absolute -top-2.5 right-3 text-xs px-2 py-0.5 shadow">
                    Popular
                </span>
            )}

            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--sf-foreground)' }}>
                        {pkg.name}
                    </p>
                    {pkg.description && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--sf-foreground-subtle)' }}>
                            {pkg.description}
                        </p>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <p className="text-lg font-light" style={{ color: 'var(--sf-foreground)' }}>
                        KSh {pkg.price.toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="space-y-1.5">
                {pkg.deliverables.map((d, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 sf-text-accent" />
                        {d}
                    </div>
                ))}
            </div>

            <div
                className="flex items-center gap-4 mt-3 pt-3 text-xs"
                style={{ borderTop: '1px solid var(--sf-border)', color: 'var(--sf-foreground-subtle)' }}
            >
                <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {pkg.delivery_days}d delivery
                </span>
                {pkg.revisions != null && (
                    <span className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        {pkg.revisions === 0 ? 'No' : pkg.revisions} revision{pkg.revisions !== 1 ? 's' : ''}
                    </span>
                )}
            </div>
        </button>
    )
}

export default function ClassicServicesPage({
    storeSlug,
    service,
    selectedPackage,
    quantity,
    currentMediaIndex,
    onPackageChange,
    onQuantityChange,
    onMediaChange,
    onBookService,
    isBooking,
}: ServiceDetailsPageProps) {
    const formatPrice = (price: number) =>
        new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(price)

    const currentMedia = service.media?.[currentMediaIndex]
    const isAvailable = service.availability === 'available'
    const isBusy = service.availability === 'busy'

    // ✅ read packages from metadata
    const packages = service.metadata?.packages ?? []
    const displayPrice = selectedPackage
        ? parseFloat(String(selectedPackage.price))
        : service.price
    const hasDiscount = service.compare_at_price && service.compare_at_price > displayPrice

    const tags = service.metadata?.tags ?? []
    const rating = service.metadata?.rating ?? null
    const reviews = service.metadata?.reviews ?? null
    const features = service.metadata?.features ?? []
    const deliveryDays = selectedPackage?.delivery_days ?? service.metadata?.deliveryDays
    const location = service.metadata?.location

    const nextMedia = () =>
        (service.media?.length ?? 0) > 1 &&
        onMediaChange(
            currentMediaIndex === (service.media.length - 1) ? 0 : currentMediaIndex + 1
        )

    const prevMedia = () =>
        (service.media?.length ?? 0) > 1 &&
        onMediaChange(
            currentMediaIndex === 0 ? service.media.length - 1 : currentMediaIndex - 1
        )

    const availabilityText = isAvailable
        ? 'Available for booking'
        : isBusy
            ? 'Currently busy — check back soon'
            : 'Unavailable'

    return (
        <div className="min-h-screen pt-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
            <a
                href="/services"
                className="sf-pill sf-pill-inactive border inline-flex items-center gap-2 px-3 py-1.5 text-sm mb-8"
                >
                <ArrowLeft className="h-4 w-4" />
                Back to Services
            </a>

            <div className="grid lg:grid-cols-2 gap-10 xl:gap-16">
                {/* ── Media ── */}
                <div className="space-y-3">
                    <Card className="sf-card overflow-hidden py-0">
                        <div className="relative aspect-square sf-bg-muted">
                            {currentMedia ? (
                                currentMedia.type === 'video' ? (
                                    <video
                                        src={currentMedia.url}
                                        className="object-cover w-full h-full"
                                        controls
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <img
                                        src={currentMedia.url}
                                        alt={currentMedia.alt ?? service.name}
                                        className="object-cover w-full h-full"
                                    />
                                )
                            ) : (
                                // ✅ placeholder when no media
                                <div className="w-full h-full flex items-center justify-center">
                                    <CalendarCheck
                                        className="w-16 h-16"
                                        style={{ color: 'var(--sf-foreground)', opacity: 0.1 }}
                                    />
                                </div>
                            )}
                            {(service.media?.length ?? 0) > 1 && (
                                <>
                                    <button
                                        onClick={prevMedia}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center"
                                        style={{
                                            backgroundColor: 'var(--sf-background)',
                                            color: 'var(--sf-foreground)',
                                            border: '1px solid var(--sf-border-strong)',
                                        }}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={nextMedia}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center"
                                        style={{
                                            backgroundColor: 'var(--sf-background)',
                                            color: 'var(--sf-foreground)',
                                            border: '1px solid var(--sf-border-strong)',
                                        }}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                        {service.media.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => onMediaChange(index)}
                                                className={cn(
                                                    'h-1 rounded-full transition-all',
                                                    index === currentMediaIndex
                                                        ? 'sf-dot-active w-6'
                                                        : 'sf-dot-inactive w-1.5'
                                                )}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>

                    {(service.media?.length ?? 0) > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {service.media.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => onMediaChange(index)}
                                    className={cn(
                                        'shrink-0 w-20 h-20 overflow-hidden border-2 transition-all',
                                        index === currentMediaIndex
                                            ? 'sf-thumb-active'
                                            : 'sf-thumb-inactive'
                                    )}
                                >
                                    {item.type === 'video' ? (
                                        <div className="w-full h-full sf-bg-muted flex items-center justify-center">
                                            <span className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>▶</span>
                                        </div>
                                    ) : (
                                        <img
                                            src={item.url}
                                            alt={item.alt ?? `${service.name} ${index + 1}`}
                                            width={80}
                                            height={80}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Service info ── */}
                <div className="space-y-6 lg:max-w-lg">
                    <div className="space-y-2">
                        {service.metadata?.serviceType && (
                            <span className="sf-badge-outline inline-flex items-center border px-2.5 py-0.5 text-xs">
                                {service.metadata.serviceType}
                            </span>
                        )}
                        <h1 className="sf-heading text-3xl lg:text-4xl font-light tracking-tight">
                            {service.name}
                        </h1>
                    </div>

                    {/* Rating */}
                    {rating != null && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={cn(
                                            'h-4 w-4',
                                            i < Math.floor(rating) ? 'sf-star-filled' : 'sf-star-empty'
                                        )}
                                    />
                                ))}
                            </div>
                            <span className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                {rating.toFixed(1)}{reviews != null && ` · ${reviews} reviews`}
                            </span>
                        </div>
                    )}

                    {/* Price */}
                    <div className="flex items-baseline gap-3">
                        <div>
                            <div
                                className="text-xs uppercase tracking-wider mb-1"
                                style={{ color: 'var(--sf-foreground-subtle)' }}
                            >
                                {selectedPackage ? selectedPackage.name : 'Starting from'}
                            </div>
                            <span className="text-3xl font-light" style={{ color: 'var(--sf-foreground)' }}>
                                {formatPrice(displayPrice)}
                            </span>
                        </div>
                        {hasDiscount && (
                            <span className="text-lg line-through" style={{ color: 'var(--sf-foreground)', opacity: 0.38 }}>
                                {formatPrice(service.compare_at_price!)}
                            </span>
                        )}
                    </div>

                    <div style={{ height: '1px', backgroundColor: 'var(--sf-border)' }} />

                    {/* Description */}
                    <div
                        className="sf-prose text-sm leading-relaxed font-light"
                        style={{ color: 'var(--sf-foreground-subtle)' }}
                    >
                        {service.metadata?.descriptionHtml ? (
                            <div
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: service.metadata.descriptionHtml }}
                            />
                        ) : (
                            <p>{service.description || 'No description available for this service.'}</p>
                        )}
                    </div>

                    <div style={{ height: '1px', backgroundColor: 'var(--sf-border)' }} />

                    {/* Availability */}
                    <div className="flex items-center gap-2">
                        <div
                            className={cn(
                                'h-2 w-2 rounded-full shrink-0',
                                isAvailable ? 'sf-dot-instock' : isBusy ? 'sf-dot-busy' : 'sf-dot-outofstock'
                            )}
                        />
                        <span
                            className={cn('text-sm', isAvailable ? 'sf-text-instock' : 'sf-text-outofstock')}
                        >
                            {availabilityText}
                        </span>
                    </div>

                    {/* Package selector ✅ now reads from metadata.packages */}
                    {packages.length > 0 && (
                        <div className="space-y-3">
                            <label
                                className="text-xs uppercase tracking-wider block"
                                style={{ color: 'var(--sf-foreground-subtle)' }}
                            >
                                Select Package
                            </label>
                            <div className="grid gap-3">
                                {packages.map((pkg) => (
                                    <button
                                        key={pkg.id}
                                        onClick={() => onPackageChange(pkg.id)}
                                        className={cn(
                                            'w-full text-left p-4 border transition-all space-y-2',
                                            selectedPackage?.id === pkg.id
                                                ? 'sf-pill-active border-2'
                                                : 'sf-pill-inactive'
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{pkg.name}</span>
                                                {pkg.is_featured && (
                                                    <span className="sf-badge-sale text-xs px-2 py-0.5">Popular</span>
                                                )}
                                            </div>
                                            <span className="font-light text-sm">
                                                {formatPrice(parseFloat(String(pkg.price)))}
                                            </span>
                                        </div>
                                        {pkg.description && (
                                            <p className="text-xs leading-relaxed" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                                {pkg.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {pkg.delivery_days}d delivery
                                            </span>
                                            {pkg.revisions !== null && (
                                                <span className="flex items-center gap-1">
                                                    <RefreshCw className="w-3 h-3" />
                                                    {pkg.revisions === 0
                                                        ? 'No revisions'
                                                        : `${pkg.revisions} revision${pkg.revisions !== 1 ? 's' : ''}`}
                                                </span>
                                            )}
                                        </div>
                                        {/* ✅ deliverables is string[] in DB */}
                                        {Array.isArray(pkg.deliverables) && pkg.deliverables.length > 0 && (
                                            <ul className="space-y-1 mt-1">
                                                {pkg.deliverables.map((d, i) => (
                                                    <li
                                                        key={i}
                                                        className="flex items-center gap-1.5 text-xs"
                                                        style={{ color: 'var(--sf-foreground-subtle)' }}
                                                    >
                                                        <CheckCircle2 className="w-3 h-3 sf-text-instock shrink-0" />
                                                        {d}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quantity */}
                    {isAvailable && (
                        <div className="flex items-center gap-4">
                            <label
                                className="text-xs uppercase tracking-wider"
                                style={{ color: 'var(--sf-foreground-subtle)' }}
                            >
                                {service.metadata?.quantityUnit || 'Sessions'}
                            </label>
                            <div className="inline-flex items-center" style={{ border: '1px solid var(--sf-border-strong)' }}>
                                <button
                                    className="w-10 h-10 flex items-center justify-center disabled:opacity-30"
                                    style={{ color: 'var(--sf-foreground)' }}
                                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1}
                                >
                                    <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span
                                    className="px-4 text-sm min-w-12 text-center tabular-nums"
                                    style={{ color: 'var(--sf-foreground)' }}
                                >
                                    {quantity}
                                </span>
                                <button
                                    className="w-10 h-10 flex items-center justify-center"
                                    style={{ color: 'var(--sf-foreground)' }}
                                    onClick={() => onQuantityChange(quantity + 1)}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* CTA */}
                    <Button
                        onClick={onBookService}
                        disabled={!isAvailable || isBooking}
                        className="w-full sf-btn-primary justify-center"
                        size="lg"
                    >
                        {isBooking ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Booking...</>
                        ) : (
                            <><CalendarCheck className="mr-2 h-4 w-4" />
                                {isAvailable ? 'Add to cart' : isBusy ? 'Currently Busy' : 'Unavailable'}
                            </>
                        )}
                    </Button>

                    {/* Trust badges */}
                    <div className="grid grid-cols-3 gap-3 pt-2" style={{ borderTop: '1px solid var(--sf-border)' }}>
                        {[
                            { icon: Clock, label: deliveryDays ? `${deliveryDays}-Day Delivery` : 'Fast Delivery' },
                            { icon: ShieldCheck, label: 'Secure Payment' },
                            { icon: RefreshCw, label: 'Satisfaction Guarantee' },
                        ].map(({ icon: Icon, label }) => (
                            <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                                <Icon className="h-4 w-4" style={{ color: 'var(--sf-foreground)', opacity: 0.45 }} />
                                <span className="text-xs leading-tight" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Location */}
                    {location && (
                        <div className="flex items-center gap-2 text-sm pt-1" style={{ color: 'var(--sf-foreground-subtle)' }}>
                            <MapPin className="w-4 h-4 shrink-0" />
                            <span className="capitalize">{location}</span>
                        </div>
                    )}

                    {/* Features */}
                    {features.length > 0 && (
                        <div style={{ borderTop: '1px solid var(--sf-border)', paddingTop: '1rem' }}>
                            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                What's included
                            </p>
                            <ul className="space-y-2">
                                {features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                        <CheckCircle2 className="w-4 h-4 sf-text-instock shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Deposit notice */}
                    {service.metadata?.requiresDeposit && (
                        <div
                            className="flex items-start gap-2 text-xs p-3"
                            style={{
                                backgroundColor: 'var(--sf-bg-muted)',
                                border: '1px solid var(--sf-border)',
                                color: 'var(--sf-foreground-subtle)',
                            }}
                        >
                            <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>
                                A {service.metadata.depositPercent ?? 50}% deposit is required to confirm your booking.
                            </span>
                        </div>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div style={{ borderTop: '1px solid var(--sf-border)', paddingTop: '1rem' }}>
                            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                Tags
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <span key={tag} className="sf-badge-outline inline-flex items-center border px-2.5 py-0.5 text-xs">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </div >
    )
}