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
    Zap,
    RefreshCw,
    ShieldCheck,
    BadgePercent,
    Play,
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function ServiceDetailPage({
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
    const {
        name,
        description,
        price,
        compare_at_price,
        media,
        availability,
        metadata,
        packages,
        sku,
    } = service

    const isAvailable = availability === 'available'
    const hasDiscount = compare_at_price && compare_at_price > price
    const discount = hasDiscount
        ? Math.round(((compare_at_price! - price) / compare_at_price!) * 100)
        : 0

    const activePrice = selectedPackage ? selectedPackage.price : price
    const activeDeliveryDays = selectedPackage?.delivery_days ?? metadata?.deliveryDays

    const depositAmount =
        metadata?.requiresDeposit && metadata?.depositPercent
            ? Math.round((activePrice * quantity * metadata.depositPercent) / 100)
            : null

    return (
        <div className="min-h-screen">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Breadcrumb / back */}
                <nav className="mb-6 text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                    <a href="/services" className="hover:underline">Services</a>
                    <span className="mx-2 opacity-40">/</span>
                    {metadata?.serviceType && (
                        <>
                            <span>{metadata.serviceType}</span>
                            <span className="mx-2 opacity-40">/</span>
                        </>
                    )}
                    <span style={{ color: 'var(--sf-foreground)' }}>{name}</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16">
                    {/* ── Left: media ── */}
                    <div>
                        <MediaGallery
                            media={media}
                            currentIndex={currentMediaIndex}
                            onMediaChange={onMediaChange}
                            serviceName={name}
                        />
                    </div>

                    {/* ── Right: details ── */}
                    <div className="space-y-6">
                        {/* Title block */}
                        <div className="space-y-2">
                            {metadata?.serviceType && (
                                <p className="text-xs uppercase tracking-widest sf-text-accent font-medium">
                                    {metadata.serviceType}
                                </p>
                            )}
                            <h1
                                className="sf-heading text-3xl md:text-4xl font-light leading-tight"
                                style={{ color: 'var(--sf-foreground)' }}
                            >
                                {name}
                            </h1>

                            {/* Rating + meta row */}
                            <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                {metadata?.rating != null && (
                                    <span className="flex items-center gap-1">
                                        <Star className="w-4 h-4 sf-star-filled" />
                                        <strong style={{ color: 'var(--sf-foreground)' }}>{metadata.rating.toFixed(1)}</strong>
                                        {metadata.reviews != null && (
                                            <span>({metadata.reviews} reviews)</span>
                                        )}
                                    </span>
                                )}
                                {activeDeliveryDays != null && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {activeDeliveryDays}d delivery
                                    </span>
                                )}
                                {metadata?.location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {metadata.location}
                                    </span>
                                )}
                                <AvailabilityBadge status={availability} />
                            </div>
                        </div>

                        {/* Price */}
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                {packages?.length ? 'Starting from' : 'Price'}
                            </p>
                            <div className="flex items-end gap-3">
                                <span className="text-3xl font-light" style={{ color: 'var(--sf-foreground)' }}>
                                    KSh {activePrice.toLocaleString()}
                                </span>
                                {hasDiscount && !selectedPackage && (
                                    <>
                                        <span
                                            className="text-lg line-through"
                                            style={{ color: 'var(--sf-foreground)', opacity: 0.38 }}
                                        >
                                            KSh {compare_at_price!.toLocaleString()}
                                        </span>
                                        <span className="sf-badge-sale px-2 py-0.5 text-xs">
                                            -{discount}%
                                        </span>
                                    </>
                                )}
                            </div>
                            {depositAmount != null && (
                                <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                    <BadgePercent className="w-4 h-4 sf-text-accent" />
                                    Deposit required: KSh {depositAmount.toLocaleString()} ({metadata!.depositPercent}%)
                                </p>
                            )}
                        </div>

                        {/* Packages */}
                        {packages && packages.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium" style={{ color: 'var(--sf-foreground)' }}>
                                    Choose a package
                                </p>
                                <div className="space-y-2">
                                    {packages.map((pkg) => (
                                        <PackageCard
                                            key={pkg.id}
                                            pkg={pkg}
                                            isSelected={selectedPackage?.id === pkg.id}
                                            onSelect={() => onPackageChange(pkg.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quantity */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium" style={{ color: 'var(--sf-foreground)' }}>
                                Sessions / Hours
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                                    className="w-9 h-9 rounded-md border flex items-center justify-center transition-colors hover:sf-bg-muted"
                                    style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-foreground)' }}
                                    disabled={quantity <= 1}
                                >
                                    −
                                </button>
                                <span
                                    className="w-10 text-center font-medium"
                                    style={{ color: 'var(--sf-foreground)' }}
                                >
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => onQuantityChange(quantity + 1)}
                                    className="w-9 h-9 rounded-md border flex items-center justify-center transition-colors hover:sf-bg-muted"
                                    style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-foreground)' }}
                                >
                                    +
                                </button>
                                {quantity > 1 && (
                                    <span className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                        Total: KSh {(activePrice * quantity).toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="space-y-3 pt-2">
                            {isAvailable ? (
                                <Button
                                    size="lg"
                                    onClick={onBookService}
                                    disabled={isBooking}
                                    className="sf-btn-primary w-full h-12 text-base"
                                >
                                    {isBooking ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Booking…
                                        </>
                                    ) : (
                                        <>
                                            <CalendarCheck className="w-5 h-5 mr-2" />
                                            Book Now
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <div className="h-12 flex items-center justify-center rounded-md sf-badge-oos w-full gap-2 text-base font-medium">
                                    <Package className="w-5 h-5" />
                                    {availability === 'busy' ? 'Currently Busy' : 'Unavailable'}
                                </div>
                            )}

                            {/* Trust signals */}
                            <div
                                className="flex flex-wrap items-center justify-center gap-4 text-xs pt-1"
                                style={{ color: 'var(--sf-foreground-subtle)' }}
                            >
                                <span className="flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 sf-text-accent" />
                                    Secure booking
                                </span>
                                {metadata?.requiresDeposit && (
                                    <span className="flex items-center gap-1">
                                        <BadgePercent className="w-3.5 h-3.5 sf-text-accent" />
                                        {metadata.depositPercent}% deposit to confirm
                                    </span>
                                )}
                                {activeDeliveryDays != null && (
                                    <span className="flex items-center gap-1">
                                        <Zap className="w-3.5 h-3.5 sf-text-accent" />
                                        {activeDeliveryDays}-day turnaround
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ borderTop: '1px solid var(--sf-border)' }} />

                        {/* Description */}
                        {description && (
                            <div className="space-y-2">
                                <h2
                                    className="sf-heading text-base font-medium"
                                    style={{ color: 'var(--sf-foreground)' }}
                                >
                                    About this service
                                </h2>
                                {metadata?.descriptionHtml ? (
                                    <div
                                        className="prose prose-sm max-w-none text-sm"
                                        style={{ color: 'var(--sf-foreground-subtle)' }}
                                        dangerouslySetInnerHTML={{ __html: metadata.descriptionHtml }}
                                    />
                                ) : (
                                    <p
                                        className="text-sm leading-relaxed"
                                        style={{ color: 'var(--sf-foreground-subtle)' }}
                                    >
                                        {description}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Feature highlights */}
                        {metadata?.features && metadata.features.length > 0 && (
                            <div className="space-y-2">
                                <h2
                                    className="sf-heading text-base font-medium"
                                    style={{ color: 'var(--sf-foreground)' }}
                                >
                                    What's included
                                </h2>
                                <ul className="space-y-2">
                                    {metadata.features.map((f, i) => (
                                        <li
                                            key={i}
                                            className="flex items-start gap-2 text-sm"
                                            style={{ color: 'var(--sf-foreground-subtle)' }}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 sf-text-accent" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Tags */}
                        {metadata?.tags && metadata.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {metadata.tags.map((tag) => (
                                    <span key={tag} className="sf-pill sf-pill-inactive text-xs px-3 py-1">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* SKU */}
                        {sku && (
                            <p className="text-xs" style={{ color: 'var(--sf-foreground)', opacity: 0.38 }}>
                                Ref: {sku}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}