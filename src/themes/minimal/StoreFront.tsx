'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingBag, ArrowRight, Search, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { StoreFrontProps } from '../types'

function formatPrice(amount: number, currency: string) {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}
function isInStock(p: StoreFrontProps['products'][0]) {
    if (!p.track_inventory) return true
    return p.inventory_quantity > 0
}

// ─── Minimal Product Card ──────────────────────────────────────────────────────
function MinimalProductCard({ product, currency, storeSlug }: {
    product: StoreFrontProps['products'][0]
    currency: string
    storeSlug: string
}) {
    const inStock = isInStock(product)
    const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
    const image = product.images?.[0] || null

    return (
        <Link href={`/store/${storeSlug}/${product.slug}`} className="group block">
            {/* Image — pure rectangle, no border-radius */}
            <div className="relative overflow-hidden aspect-[3/4] bg-[#ede9e3]">
                {image ? (
                    <img
                        src={image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-[#b8b0a6]" />
                    </div>
                )}
                {!inStock && (
                    <div className="absolute inset-0 bg-[#f7f4f0]/80 flex items-center justify-center">
                        <span className="text-[10px] tracking-[0.2em] uppercase text-[#9a9189]">Sold out</span>
                    </div>
                )}
                {hasDiscount && inStock && (
                    <span className="absolute top-3 left-3 text-[9px] tracking-[0.15em] uppercase bg-[#111] text-[#f7f4f0] px-2 py-0.5">
                        Sale
                    </span>
                )}
            </div>

            {/* Text — two lines only, flush */}
            <div className="pt-3 space-y-0.5">
                <h3 className="text-sm font-normal text-[#1a1714] leading-snug group-hover:text-[#5c5650] transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {product.name}
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[#5c5650]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {formatPrice(product.price, currency)}
                    </span>
                    {hasDiscount && (
                        <span className="text-xs text-[#b8b0a6] line-through">
                            {formatPrice(product.compare_at_price!, currency)}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    )
}

// ─── Minimal StoreFront ────────────────────────────────────────────────────────
export default function MinimalStoreFront({ store, products, collections, featuredProducts }: StoreFrontProps) {
    const router = useRouter()
    const [query, setQuery] = useState('')
    const [currentSlide, setCurrentSlide] = useState(0)

    const settings = store.settings ?? {}
    const heroSlides = settings.heroSlides?.length
        ? settings.heroSlides
        : [{ title: settings.heroTitle ?? store.name, subtitle: settings.heroSubtitle ?? '', image: settings.heroImage }]

    useEffect(() => {
        if (heroSlides.length <= 1) return
        const t = setInterval(() => setCurrentSlide(p => (p + 1) % heroSlides.length), 5000)
        return () => clearInterval(t)
    }, [heroSlides.length])

    const filtered = useMemo(() => products.filter(p =>
        query ? p.name.toLowerCase().includes(query.toLowerCase()) : true
    ), [products, query])

    return (
        <div className="min-h-screen bg-[#f7f4f0] text-[#1a1714]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

            {/* ── HERO ── */}
            {!query && (
                <section className="relative w-full h-[85vh] overflow-hidden bg-[#ede9e3]">
                    {heroSlides.map((slide, i) => (
                        <div key={i} className={`absolute inset-0 transition-opacity duration-700 ${i === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            {slide.image
                                ? <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                                : (
                                    <div className="w-full h-full bg-[#ede9e3] flex items-center justify-center">
                                        {/* Decorative typographic fill */}
                                        <p
                                            className="text-[20vw] font-normal leading-none text-[#e5e0d9] select-none pointer-events-none uppercase tracking-tighter"
                                            style={{ fontFamily: "'DM Serif Display', serif" }}
                                            aria-hidden
                                        >
                                            {(slide.title ?? store.name).slice(0, 4)}
                                        </p>
                                    </div>
                                )
                            }
                            {slide.image && <div className="absolute inset-0 bg-[#f7f4f0]/30" />}
                        </div>
                    ))}

                    {/* Text — centered, simple */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                        <motion.div
                            key={currentSlide}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="space-y-4 max-w-2xl"
                        >
                            <h1
                                className="text-5xl md:text-7xl lg:text-8xl font-normal text-[#1a1714] leading-[0.95] tracking-tight"
                                style={{ fontFamily: "'DM Serif Display', serif" }}
                            >
                                {heroSlides[currentSlide]?.title ?? store.name}
                            </h1>
                            {heroSlides[currentSlide]?.subtitle && (
                                <p className="text-base md:text-lg text-[#7a7169] font-light max-w-md mx-auto leading-relaxed">
                                    {heroSlides[currentSlide].subtitle}
                                </p>
                            )}
                            <button
                                onClick={() => document.getElementById('minimal-products')?.scrollIntoView({ behavior: 'smooth' })}
                                className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-[#5c5650] hover:text-[#1a1714] transition-colors mt-2 group"
                            >
                                {heroSlides[currentSlide]?.buttonText ?? 'Shop now'}
                                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                            </button>
                        </motion.div>
                    </div>

                    {/* Slide dots */}
                    {heroSlides.length > 1 && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {heroSlides.map((_, i) => (
                                <button key={i} onClick={() => setCurrentSlide(i)}
                                    className={`rounded-full transition-all duration-300 ${i === currentSlide ? 'w-5 h-1.5 bg-[#5c5650]' : 'w-1.5 h-1.5 bg-[#c8c0b6]'}`}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* ── COLLECTIONS ── */}
            {!query && collections.length > 0 && (
                <section className="py-16 md:py-24 px-6 md:px-12 lg:px-20 border-t border-[#e5e0d9]">
                    <div className="mb-10">
                        <h2 className="text-3xl md:text-4xl font-normal text-[#1a1714]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                            Collections
                        </h2>
                        <div className="h-px bg-[#e5e0d9] mt-4" />
                    </div>

                    {/* Horizontal scroll on mobile, grid on desktop */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {collections.map((col, i) => (
                            <motion.div
                                key={col.id}
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.07, duration: 0.5 }}
                                className="group cursor-pointer"
                                onClick={() => router.push(`/store/${store.slug}/collections/${col.slug}`)}
                            >
                                <div className="relative aspect-square overflow-hidden bg-[#ede9e3] mb-3">
                                    {col.image_url
                                        ? <img src={col.image_url} alt={col.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                                        : <div className="w-full h-full" />
                                    }
                                </div>
                                <p className="text-sm text-[#1a1714] group-hover:text-[#5c5650] transition-colors">{col.name}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── FEATURED ── */}
            {!query && featuredProducts.length > 0 && (
                <section className="py-16 md:py-24 px-6 md:px-12 lg:px-20 border-t border-[#e5e0d9]">
                    <div className="flex items-baseline justify-between mb-10">
                        <h2 className="text-3xl md:text-4xl font-normal text-[#1a1714]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                            Featured
                        </h2>
                        <button
                            onClick={() => document.getElementById('minimal-products')?.scrollIntoView({ behavior: 'smooth' })}
                            className="text-xs tracking-[0.1em] text-[#9a9189] hover:text-[#5c5650] transition-colors uppercase"
                        >
                            View all →
                        </button>
                    </div>
                    <div className="h-px bg-[#e5e0d9] mb-10" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                        {featuredProducts.map((p, i) => (
                            <motion.div key={p.id} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.5 }}>
                                <MinimalProductCard product={p} currency={store.currency} storeSlug={store.slug} />
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── ALL PRODUCTS ── */}
            <section id="minimal-products" className="py-16 md:py-24 px-6 md:px-12 lg:px-20 border-t border-[#e5e0d9]">
                <div className="flex items-baseline justify-between mb-10 gap-4 flex-wrap">
                    <h2 className="text-3xl md:text-4xl font-normal text-[#1a1714]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                        {query ? 'Search' : 'All products'}
                    </h2>

                    {/* Search */}
                    <div className="flex items-center gap-2 border-b border-[#c8c0b6] pb-1 focus-within:border-[#5c5650] transition-colors">
                        <Search className="w-3.5 h-3.5 text-[#b8b0a6]" />
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search…"
                            className="bg-transparent text-sm text-[#1a1714] placeholder:text-[#c8c0b6] outline-none w-40"
                        />
                        {query && (
                            <button onClick={() => setQuery('')}>
                                <X className="w-3.5 h-3.5 text-[#b8b0a6] hover:text-[#5c5650] transition-colors" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="h-px bg-[#e5e0d9] mb-10" />

                {query && (
                    <p className="text-xs text-[#9a9189] mb-8 uppercase tracking-wider">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                    </p>
                )}

                {filtered.length === 0 ? (
                    <div className="py-24 text-center space-y-3">
                        <p className="text-sm text-[#9a9189]">Nothing found</p>
                        {query && <button onClick={() => setQuery('')} className="text-xs uppercase tracking-wider text-[#5c5650] underline underline-offset-4">Clear</button>}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                        {filtered.map((p, i) => (
                            <motion.div key={p.id} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: (i % 4) * 0.06, duration: 0.4 }}>
                                <MinimalProductCard product={p} currency={store.currency} storeSlug={store.slug} />
                            </motion.div>
                        ))}
                    </div>
                )}

                {filtered.length > 0 && (
                    <p className="text-xs text-[#c8c0b6] text-center mt-16 tracking-wider uppercase">
                        {filtered.length} item{filtered.length !== 1 ? 's' : ''}
                    </p>
                )}
            </section>
        </div>
    )
}