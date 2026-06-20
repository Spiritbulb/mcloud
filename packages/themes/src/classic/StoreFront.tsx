'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingBag, ArrowRight, CalendarCheck, Clock, MapPin, Star } from 'lucide-react'
import { Button } from '@mcloud/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@mcloud/ui/card'
import { Separator } from '@mcloud/ui/separator'
import { motion } from 'framer-motion'
import { cn } from '@mcloud/ui/utils'
import type { StoreFrontProps, ServiceItem } from '../types'

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, meta }: { eyebrow: string; title: string; meta?: string }) {
    return (
        <div className="mb-8 md:mb-12">
            <div className="flex items-end justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--sf-foreground)' }}>
                <div>
                    <span className="text-[11px] uppercase tracking-[0.2em] sf-text-accent font-medium">{eyebrow}</span>
                    <h2 className="sf-heading text-3xl md:text-4xl font-light tracking-tight mt-1">{title}</h2>
                </div>
                {meta && <span className="text-xs shrink-0 pb-1" style={{ color: 'var(--sf-foreground-subtle)' }}>{meta}</span>}
            </div>
        </div>
    )
}

function formatPrice(amount: number, currency: string) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
    }).format(amount)
}

function isInStock(product: StoreFrontProps['products'][0]) {
    if (!product.track_inventory) return true
    return product.inventory_quantity > 0
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
    product, currency, storeSlug,
}: {
    product: StoreFrontProps['products'][0]
    currency: string
    storeSlug: string
}) {
    const inStock = isInStock(product)
    const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
    const image = product.images?.[0] || null

    return (
        <Link href={`/store/${storeSlug}/${product.slug}`} className="sf-tile group block">
            <div className="relative overflow-hidden sf-bg-muted h-56 sm:h-64">
                {image ? (
                    <img src={image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8" style={{ color: 'var(--sf-foreground)', opacity: 0.25 }} />
                    </div>
                )}
                {!inStock && (
                    <div className="absolute inset-0 sf-bg-overlay flex items-center justify-center">
                        <span className="sf-badge-oos inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-medium">Out of stock</span>
                    </div>
                )}
                {hasDiscount && inStock && (
                    <span className="sf-badge-sale sf-border-radius absolute top-2 left-2 inline-flex items-center px-2.5 py-0.5 text-xs font-medium">Sale</span>
                )}
            </div>
            <div className="pt-3 space-y-0.5">
                <h3 className="sf-heading text-base font-normal line-clamp-2 sf-tile-name">{product.name}</h3>
                {product.review_count ? (
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        <Star className="w-3 h-3 sf-star-filled" />
                        <span>{product.rating!.toFixed(1)} ({product.review_count})</span>
                    </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-2 pt-0.5">
                    {product.description ? (
                        <span className="text-xs line-clamp-1" style={{ color: 'var(--sf-foreground-subtle)' }}>{product.description}</span>
                    ) : <span />}
                    <span className="flex items-baseline gap-1.5 shrink-0">
                        <span className="text-base font-light sf-text-accent">{formatPrice(product.price, currency)}</span>
                        {hasDiscount && (
                            <span className="text-xs line-through" style={{ color: 'var(--sf-foreground-subtle)' }}>{formatPrice(product.compare_at_price!, currency)}</span>
                        )}
                    </span>
                </div>
            </div>
        </Link>
    )
}

// ─── Service Card ─────────────────────────────────────────────────────────────
function ServiceCard({
    service, currency, storeSlug,
}: {
    service: ServiceItem
    currency: string
    storeSlug: string
}) {
    const thumb = service.media?.find((m) => m.type === 'image')?.url
        ?? service.metadata?.media?.find((m) => m.type === 'image')?.url
    const availability = service.availability ?? service.metadata?.availability ?? 'available'
    const packages = service.packages ?? service.metadata?.packages ?? []
    const prices = packages.map((p) => parseFloat(String(p.price)) || 0).filter(Boolean)
    const minPrice = prices.length > 0 ? Math.min(...prices) : service.price

    const availDot = { available: 'sf-dot-instock', busy: 'sf-dot-busy', unavailable: 'sf-dot-outofstock' }[availability]
    const availLabel = { available: 'Available', busy: 'Busy', unavailable: 'Unavailable' }[availability]

    return (
        <Link href={`/store/${storeSlug}/services/${service.slug}`} className="sf-tile group block">
            <div className="relative overflow-hidden sf-bg-muted h-56 sm:h-64">
                {thumb ? (
                    <img src={thumb} alt={service.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <CalendarCheck className="w-8 h-8" style={{ color: 'var(--sf-foreground)', opacity: 0.25 }} />
                    </div>
                )}
                {/* Availability badge */}
                <span className="absolute top-2 left-2 sf-card inline-flex items-center gap-1.5 px-2 py-0.5 text-xs shadow">
                    <span className={cn('h-1.5 w-1.5 rounded-full', availDot)} />
                    {availLabel}
                </span>
            </div>
            <div className="pt-3 space-y-1">
                {service.metadata?.serviceType && (
                    <p className="text-[10px] uppercase tracking-[0.18em] sf-text-accent font-medium">{service.metadata.serviceType}</p>
                )}
                <h3 className="sf-heading text-base font-normal line-clamp-2 sf-tile-name">{service.name}</h3>
                {service.description && (
                    <p className="text-xs line-clamp-1" style={{ color: 'var(--sf-foreground-subtle)' }}>{service.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs pt-0.5" style={{ color: 'var(--sf-foreground-subtle)' }}>
                    {service.metadata?.deliveryDays && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{service.metadata.deliveryDays}d delivery</span>
                    )}
                    {service.metadata?.location && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{service.metadata.location}</span>
                    )}
                    {service.metadata?.rating != null && (
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 sf-star-filled" />{service.metadata.rating.toFixed(1)}</span>
                    )}
                </div>
                <div className="flex items-baseline gap-1.5 pt-1">
                    <span className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>{packages.length > 0 ? 'From' : 'Price'}</span>
                    <span className="text-base font-light sf-text-accent">{formatPrice(minPrice, currency)}</span>
                </div>
            </div>
        </Link>
    )
}

// ─── Classic StoreFront ────────────────────────────────────────────────────────
export default function ClassicStoreFront({
    store,
    products,
    collections,
    featuredProducts,
    services = [],
}: StoreFrontProps) {
    const router = useRouter()
    const [query, setQuery] = useState('')
    const [activeCollection, setActiveCollection] = useState<string | null>(null)
    const [currentSlide, setCurrentSlide] = useState(0)
    const [activeTab, setActiveTab] = useState<'products' | 'services'>(
        products.length === 0 && services.length > 0 ? 'services' : 'products'
    )

    const settings = store.settings ?? {}
    const heroSlides =
        settings.heroSlides && settings.heroSlides.length > 0
            ? settings.heroSlides
            : [{
                title: settings.heroTitle ?? store.name,
                subtitle: settings.heroSubtitle ?? store.description ?? '',
                image: settings.heroImage ?? undefined,
                accent: 'New Arrivals',
                buttonText: 'Shop now',
            }]

    useEffect(() => {
        if (heroSlides.length <= 1) return
        const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length), 5000)
        return () => clearInterval(timer)
    }, [heroSlides.length])

    const filtered = useMemo(() => products.filter((p) =>
        query ? p.name.toLowerCase().includes(query.toLowerCase()) || p.description?.toLowerCase().includes(query.toLowerCase()) : true
    ), [products, query])

    const filteredServices = useMemo(() => services.filter((s) =>
        query ? s.name.toLowerCase().includes(query.toLowerCase()) || s.description?.toLowerCase().includes(query.toLowerCase()) : true
    ), [services, query])

    const hasProducts = products.length > 0
    const hasServices = services.length > 0
    const showTabs = hasProducts && hasServices

    return (
        <div className="min-h-screen">
            {/* ── HERO ── */}
            {!query && (
                <section className="relative w-full overflow-hidden">
                    {heroSlides.map((slide, index) => (
                        <div key={index} className={`grid md:grid-cols-2 ${index === currentSlide ? 'block' : 'hidden'}`}>
                            {/* Text column */}
                            <div className="order-2 md:order-1 flex items-center">
                                <motion.div
                                    key={currentSlide}
                                    initial={{ opacity: 0, y: 32 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                                    className="w-full px-6 sm:px-10 md:px-14 py-12 md:py-24 max-w-xl mx-auto md:mx-0 space-y-5"
                                >
                                    {slide.accent && (
                                        <div className="flex items-center gap-3">
                                            <span className="h-0.5 w-9 sf-bg-accent" />
                                            <span className="text-[11px] uppercase tracking-[0.2em] sf-text-accent font-medium">{slide.accent}</span>
                                        </div>
                                    )}
                                    <h1 className="sf-heading text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.04]">{slide.title}</h1>
                                    {slide.subtitle && (
                                        <p className="text-base md:text-lg font-light max-w-md" style={{ color: 'var(--sf-foreground-subtle)' }}>{slide.subtitle}</p>
                                    )}
                                    <Button
                                        size="lg"
                                        className="sf-btn-primary mt-1 group rounded-none"
                                        onClick={() => document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' })}
                                    >
                                        {slide.buttonText ?? 'Shop now'}
                                        <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </motion.div>
                            </div>
                            {/* Image column */}
                            <div className="order-1 md:order-2 relative h-[42vh] sm:h-[56vh] md:h-auto md:min-h-[78vh]">
                                {slide.image ? (
                                    <img src={slide.image} alt={slide.title} className="absolute inset-0 w-full h-full object-cover" />
                                ) : (
                                    <div className="sf-hero-fallback absolute inset-0">
                                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_40%,white,transparent_60%)]" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {heroSlides.length > 1 && (
                        <div className="absolute bottom-6 left-6 sm:left-10 md:left-14 flex gap-2 z-30">
                            {heroSlides.map((_, index) => (
                                <button key={index} onClick={() => setCurrentSlide(index)} aria-label={`Slide ${index + 1}`}
                                    className={`h-0.5 transition-all duration-300 ${index === currentSlide ? 'w-12 sf-bg-accent' : 'w-6'}`}
                                    style={index === currentSlide ? undefined : { backgroundColor: 'var(--sf-border-strong)' }}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* ── COLLECTIONS ── */}
            {!query && collections.length > 0 && (
                <>
                    <Separator />
                    <section className="sf-section-muted py-12 md:py-20">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <SectionHeader eyebrow="Collections" title="Shop by Category" meta={`${collections.length} categories`} />
                            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none mb-8">
                                <button onClick={() => setActiveCollection(null)} className={`sf-pill shrink-0 px-4 py-1.5 text-sm border transition-colors ${activeCollection === null ? 'sf-pill-active' : 'sf-pill-inactive'}`}>All</button>
                                {collections.map((c) => (
                                    <button key={c.id} onClick={() => setActiveCollection(c.id)} className={`sf-pill shrink-0 px-4 py-1.5 text-sm border transition-colors ${activeCollection === c.id ? 'sf-pill-active' : 'sf-pill-inactive'}`}>{c.name}</button>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                                {collections.map((collection) => (
                                    <Card key={collection.id} className="sf-card group cursor-pointer overflow-hidden hover:shadow-lg transition-shadow pt-0" onClick={() => router.push(`/store/${store.slug}/collections/${collection.slug}`)}>
                                        <div className="relative aspect-[4/3] overflow-hidden sf-bg-muted">
                                            {collection.image_url ? (
                                                <img src={collection.image_url} alt={collection.name} className="absolute inset-0 w-full h-full object-cover" />
                                            ) : (
                                                <div className="sf-collection-placeholder w-full h-full" />
                                            )}
                                        </div>
                                        <CardHeader className="px-4 pt-4 pb-2">
                                            <CardTitle className="sf-heading text-xl font-light">{collection.name}</CardTitle>
                                            {collection.description && (
                                                <CardDescription><span className="line-clamp-2 text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>{collection.description}</span></CardDescription>
                                            )}
                                        </CardHeader>
                                        <CardFooter className="px-4 pb-4">
                                            <button className="sf-pill sf-pill-inactive border px-3 py-1.5 text-sm">Explore</button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </section>
                </>
            )}

            <Separator />

            {/* ── FEATURED PRODUCTS ── */}
            {!query && featuredProducts.length > 0 && (
                <>
                    <section className="py-12 md:py-20">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <SectionHeader eyebrow="Featured" title="Top Picks" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                {featuredProducts.map((product) => (
                                    <ProductCard key={product.id} product={product} currency={store.currency} storeSlug={store.slug} />
                                ))}
                            </div>
                        </div>
                    </section>
                    <Separator />
                </>
            )}

            {/* ── CATALOGUE (products + services) ── */}
            <section id="catalogue" className="py-12 md:py-20">
                <div className="max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto">
                    {showTabs ? (
                        <div className="mb-8 md:mb-12">
                            <span className="text-[11px] uppercase tracking-[0.2em] sf-text-accent font-medium">Catalogue</span>
                            <h2 className="sf-heading text-3xl md:text-4xl font-light tracking-tight mt-1 mb-5">Browse Everything</h2>
                            <div className="flex gap-7 border-b" style={{ borderColor: 'var(--sf-foreground)' }}>
                                {(['products', 'services'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className="pb-3 text-sm capitalize transition-colors border-b-2 -mb-px"
                                        style={{
                                            borderColor: activeTab === tab ? 'var(--sf-accent)' : 'transparent',
                                            color: activeTab === tab ? 'var(--sf-foreground)' : 'var(--sf-foreground-subtle)',
                                            fontWeight: activeTab === tab ? 500 : 400,
                                        }}
                                    >
                                        {tab} <span className="text-xs opacity-70">({tab === 'products' ? products.length : services.length})</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <SectionHeader
                            eyebrow={hasServices ? 'Services' : 'All Products'}
                            title={hasServices ? 'Our Services' : 'Browse Everything'}
                            meta={`${hasServices ? services.length : products.length} items`}
                        />
                    )}

                    {/* Products grid */}
                    {(!showTabs || activeTab === 'products') && hasProducts && (
                        filtered.length === 0 ? (
                            <div className="text-center py-24 space-y-3">
                                <ShoppingBag className="w-10 h-10 mx-auto" style={{ color: 'var(--sf-foreground)', opacity: 0.2 }} />
                                <p className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                    {query ? 'No products match your search' : 'No products yet'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                {filtered.map((product) => (
                                    <ProductCard key={product.id} product={product} currency={store.currency} storeSlug={store.slug} />
                                ))}
                            </div>
                        )
                    )}

                    {/* Services grid */}
                    {(!showTabs || activeTab === 'services') && hasServices && (
                        filteredServices.length === 0 ? (
                            <div className="text-center py-24 space-y-3">
                                <CalendarCheck className="w-10 h-10 mx-auto" style={{ color: 'var(--sf-foreground)', opacity: 0.2 }} />
                                <p className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                    {query ? 'No services match your search' : 'No services yet'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                {filteredServices.map((service) => (
                                    <ServiceCard key={service.id} service={service} currency={store.currency} storeSlug={store.slug} />
                                ))}
                            </div>
                        )
                    )}
                </div>
            </section>
        </div>
    )
}