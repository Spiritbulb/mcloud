'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingBag, ArrowRight, Search, X, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { StoreFrontProps } from '../types'

function formatPrice(amount: number, currency: string) {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}
function isInStock(p: StoreFrontProps['products'][0]) {
    if (!p.track_inventory) return true
    return p.inventory_quantity > 0
}

// ─── Grain overlay ─────────────────────────────────────────────────────────────
function Grain() {
    return (
        <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[100] opacity-[0.032] mix-blend-overlay"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
            }}
        />
    )
}

// ─── Noir Product Card ─────────────────────────────────────────────────────────
function NoirProductCard({ product, currency, storeSlug }: {
    product: StoreFrontProps['products'][0]
    currency: string
    storeSlug: string
}) {
    const inStock = isInStock(product)
    const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
    const image = product.images?.[0] || null
    const [hovered, setHovered] = useState(false)

    return (
        <Link
            href={`/store/${storeSlug}/${product.slug}`}
            className="group block"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Image frame */}
            <div className="relative overflow-hidden aspect-[3/4] bg-[#0e0e0e]">
                {image ? (
                    <img
                        src={image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-90 group-hover:opacity-100"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-[#3a3a3a]" />
                    </div>
                )}

                {/* Hover overlay */}
                <motion.div
                    initial={false}
                    animate={{ opacity: hovered ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-5"
                >
                    <span className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] font-light">
                        View piece
                    </span>
                </motion.div>

                {/* Badges */}
                {!inStock && (
                    <div className="absolute top-3 left-3">
                        <span className="text-[9px] tracking-[0.25em] uppercase text-[#666] border border-[#333] px-2 py-1 bg-black/80">
                            Sold out
                        </span>
                    </div>
                )}
                {hasDiscount && inStock && (
                    <div className="absolute top-3 right-3">
                        <span className="text-[9px] tracking-[0.25em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-2 py-1 bg-black/80">
                            Sale
                        </span>
                    </div>
                )}
            </div>

            {/* Text */}
            <div className="pt-4 pb-1 space-y-1">
                <p className="text-[11px] tracking-[0.2em] uppercase text-[#888] font-light">
                    {product.description?.slice(0, 30) || 'New arrival'}
                </p>
                <h3 className="text-sm font-light text-[#e8e2d9] leading-tight tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {product.name}
                </h3>
                <div className="flex items-center gap-3 pt-1">
                    <span className="text-sm text-[#c9a96e] font-light tracking-wide">
                        {formatPrice(product.price, currency)}
                    </span>
                    {hasDiscount && (
                        <span className="text-xs text-[#555] line-through">
                            {formatPrice(product.compare_at_price!, currency)}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    )
}

// ─── Noir StoreFront ───────────────────────────────────────────────────────────
export default function NoirStoreFront({ store, products, collections, featuredProducts }: StoreFrontProps) {
    const router = useRouter()
    const [query, setQuery] = useState('')
    const [searchOpen, setSearchOpen] = useState(false)
    const [currentSlide, setCurrentSlide] = useState(0)

    const settings = store.settings ?? {}
    const heroSlides = settings.heroSlides?.length
        ? settings.heroSlides
        : [{ title: settings.heroTitle ?? store.name, subtitle: settings.heroSubtitle ?? '', image: settings.heroImage, accent: 'New Collection', buttonText: 'Explore' }]

    useEffect(() => {
        if (heroSlides.length <= 1) return
        const t = setInterval(() => setCurrentSlide(p => (p + 1) % heroSlides.length), 6000)
        return () => clearInterval(t)
    }, [heroSlides.length])

    const filtered = useMemo(() => products.filter(p =>
        query ? p.name.toLowerCase().includes(query.toLowerCase()) : true
    ), [products, query])

    return (
        <div className="min-h-screen bg-[#080808] text-[#e8e2d9]" style={{ fontFamily: "'Jost', sans-serif" }}>
            <Grain />

            {/* ── HERO ── */}
            {!query && (
                <section className="relative w-full h-screen overflow-hidden">
                    {heroSlides.map((slide, i) => (
                        <div
                            key={i}
                            className={`absolute inset-0 transition-opacity duration-1000 ${i === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        >
                            {slide.image
                                ? <img src={slide.image} alt={slide.title} className="w-full h-full object-cover opacity-60" />
                                : <div className="w-full h-full bg-gradient-to-br from-[#0e0e0e] via-[#111] to-[#0a0a0a]" />
                            }
                            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
                        </div>
                    ))}

                    {/* Hero text — bottom-left editorial */}
                    <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 lg:p-20">
                        <motion.div
                            key={currentSlide}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="max-w-3xl"
                        >
                            {heroSlides[currentSlide]?.accent && (
                                <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e] mb-4 font-light">
                                    {heroSlides[currentSlide].accent}
                                </p>
                            )}
                            <h1
                                className="text-6xl md:text-8xl lg:text-[10rem] font-normal leading-none tracking-tight text-white mb-6 uppercase"
                                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '-0.01em' }}
                            >
                                {heroSlides[currentSlide]?.title ?? store.name}
                            </h1>
                            {heroSlides[currentSlide]?.subtitle && (
                                <p className="text-sm md:text-base text-[#aaa] font-light tracking-widest mb-8 max-w-md" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.1rem' }}>
                                    {heroSlides[currentSlide].subtitle}
                                </p>
                            )}
                            <button
                                onClick={() => document.getElementById('noir-products')?.scrollIntoView({ behavior: 'smooth' })}
                                className="group inline-flex items-center gap-3 text-[10px] tracking-[0.35em] uppercase text-[#e8e2d9] border-b border-[#c9a96e]/50 pb-1 hover:border-[#c9a96e] transition-colors duration-300"
                            >
                                {heroSlides[currentSlide]?.buttonText ?? 'Explore'}
                                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                            </button>
                        </motion.div>
                    </div>

                    {/* Slide indicators */}
                    {heroSlides.length > 1 && (
                        <div className="absolute right-8 md:right-16 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                            {heroSlides.map((_, i) => (
                                <button key={i} onClick={() => setCurrentSlide(i)}
                                    className={`w-px transition-all duration-500 ${i === currentSlide ? 'h-10 bg-[#c9a96e]' : 'h-4 bg-[#444]'}`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Scroll cue */}
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                        className="absolute bottom-8 right-8 md:right-16 text-[#555]"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </motion.div>
                </section>
            )}

            {/* ── SEARCH BAR (when active) ── */}
            {query && (
                <div className="pt-24 pb-6 px-8 md:px-16 lg:px-24 border-b border-[#1a1a1a]">
                    <p className="text-xs tracking-[0.3em] uppercase text-[#666]">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''} for{' '}
                        <span className="text-[#c9a96e]">"{query}"</span>
                    </p>
                </div>
            )}

            {/* ── COLLECTIONS ── */}
            {!query && collections.length > 0 && (
                <section className="py-20 md:py-28 px-8 md:px-16 lg:px-24">
                    <div className="flex items-end justify-between mb-14">
                        <div>
                            <p className="text-[9px] tracking-[0.4em] uppercase text-[#c9a96e] mb-3">Curated for you</p>
                            <h2
                                className="text-5xl md:text-6xl font-normal text-[#e8e2d9] uppercase leading-none"
                                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                            >
                                Collections
                            </h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1a1a1a]">
                        {collections.map((col, i) => (
                            <motion.div
                                key={col.id}
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1, duration: 0.6 }}
                                className="group relative aspect-[4/5] bg-[#0e0e0e] cursor-pointer overflow-hidden"
                                onClick={() => router.push(`/store/${store.slug}/collections/${col.slug}`)}
                            >
                                {col.image_url
                                    ? <img src={col.image_url} alt={col.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700" />
                                    : <div className="absolute inset-0 bg-gradient-to-br from-[#111] to-[#0a0a0a]" />
                                }
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-6">
                                    <h3
                                        className="text-3xl font-normal text-white uppercase leading-none mb-2"
                                        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                                    >
                                        {col.name}
                                    </h3>
                                    <p className="text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        Explore →
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── FEATURED ── */}
            {!query && featuredProducts.length > 0 && (
                <section className="py-20 md:py-28 px-8 md:px-16 lg:px-24 border-t border-[#1a1a1a]">
                    <div className="mb-14">
                        <p className="text-[9px] tracking-[0.4em] uppercase text-[#c9a96e] mb-3">Selected works</p>
                        <h2
                            className="text-5xl md:text-6xl font-normal text-[#e8e2d9] uppercase leading-none"
                            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                        >
                            Featured
                        </h2>
                    </div>

                    {/* Asymmetric featured layout */}
                    <div className="grid grid-cols-12 gap-4 md:gap-6">
                        {featuredProducts.slice(0, 4).map((product, i) => {
                            const spans = ['col-span-12 md:col-span-7', 'col-span-12 md:col-span-5', 'col-span-12 md:col-span-5', 'col-span-12 md:col-span-7']
                            return (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.12, duration: 0.6 }}
                                    className={spans[i] || 'col-span-12 md:col-span-6'}
                                >
                                    <NoirProductCard product={product} currency={store.currency} storeSlug={store.slug} />
                                </motion.div>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* ── ALL PRODUCTS ── */}
            <section id="noir-products" className="py-20 md:py-28 px-8 md:px-16 lg:px-24 border-t border-[#1a1a1a]">
                <div className="flex items-end justify-between mb-14 gap-4 flex-wrap">
                    <div>
                        {query ? (
                            <p className="text-xs tracking-[0.3em] uppercase text-[#666]">Search results</p>
                        ) : (
                            <>
                                <p className="text-[9px] tracking-[0.4em] uppercase text-[#c9a96e] mb-3">The full edit</p>
                                <h2
                                    className="text-5xl md:text-6xl font-normal text-[#e8e2d9] uppercase leading-none"
                                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                                >
                                    All Pieces
                                </h2>
                            </>
                        )}
                    </div>

                    {/* Inline search */}
                    <div className="relative flex items-center gap-3">
                        <AnimatePresence>
                            {searchOpen && (
                                <motion.input
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 200, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    autoFocus
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Search…"
                                    className="bg-transparent border-b border-[#333] text-sm text-[#e8e2d9] placeholder:text-[#444] outline-none pb-1 tracking-wide"
                                />
                            )}
                        </AnimatePresence>
                        <button
                            onClick={() => { setSearchOpen(s => !s); if (searchOpen) setQuery('') }}
                            className="text-[#666] hover:text-[#c9a96e] transition-colors"
                        >
                            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="py-32 text-center">
                        <p className="text-[10px] tracking-[0.3em] uppercase text-[#444]">No pieces found</p>
                        {query && (
                            <button onClick={() => setQuery('')} className="mt-4 text-[10px] tracking-[0.2em] uppercase text-[#c9a96e] hover:text-[#e8e2d9] transition-colors">
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                        {filtered.map((product, i) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-50px' }}
                                transition={{ delay: (i % 4) * 0.08, duration: 0.5 }}
                            >
                                <NoirProductCard product={product} currency={store.currency} storeSlug={store.slug} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}