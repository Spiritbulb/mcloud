'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { StoreFrontProps } from '../types'

function fmt(amount: number, currency: string) {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}

function PhotoProductCard({
    product,
    currency,
    storeSlug,
}: {
    product: StoreFrontProps['products'][0]
    currency: string
    storeSlug: string
}) {
    const [hovered, setHovered] = useState(false)
    const image = product.images?.[0] ?? null
    const inStock = !product.track_inventory || product.inventory_quantity > 0

    return (
        <Link
            href={`/store/${storeSlug}/${product.slug}`}
            className="block group"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className="relative aspect-square overflow-hidden bg-[#181818]">
                {image ? (
                    <img
                        src={image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[#333] text-xs tracking-widest uppercase">No image</span>
                    </div>
                )}

                {/* Dark overlay on hover */}
                <div
                    className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center transition-opacity duration-300"
                    style={{ opacity: hovered ? 1 : 0 }}
                >
                    <p
                        className="text-[#f2f2f2] text-sm font-serif tracking-wide text-center px-4 leading-snug mb-2"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                        {product.name}
                    </p>
                    <p className="text-[#c8965a] text-xs tracking-widest">
                        {fmt(product.price, currency)}
                    </p>
                </div>

                {!inStock && (
                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center">
                        <span className="text-[#666] text-[10px] tracking-[0.3em] uppercase border border-[#444] px-3 py-1">
                            Sold out
                        </span>
                    </div>
                )}
            </div>
        </Link>
    )
}

export default function PhotographyStoreFront({ store, products, collections, featuredProducts }: StoreFrontProps) {
    const router = useRouter()
    const settings = store.settings ?? {}
    const heroImage = settings.heroImage ?? null
    const socialLinks = settings.socialLinks ?? {}

    return (
        <div className="min-h-screen bg-[#0c0c0c] text-[#f2f2f2]" style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>

            {/* ── HERO ── */}
            <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
                {heroImage && (
                    <img
                        src={heroImage}
                        alt={store.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ opacity: 0.45 }}
                    />
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />

                <div className="relative z-10 text-center px-6">
                    <h1
                        className="text-7xl md:text-9xl lg:text-[11rem] font-normal leading-none tracking-tight text-[#f2f2f2] mb-6"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                        {store.name}
                    </h1>
                    {store.description && (
                        <p className="text-sm md:text-base text-[#aaa] tracking-[0.25em] uppercase max-w-xl mx-auto font-light">
                            {store.description}
                        </p>
                    )}
                    <button
                        onClick={() => document.getElementById('photo-works')?.scrollIntoView({ behavior: 'smooth' })}
                        className="mt-12 inline-block text-[10px] tracking-[0.4em] uppercase text-[#c8965a] border-b border-[#c8965a]/50 pb-0.5 hover:border-[#c8965a] transition-colors duration-300"
                    >
                        View Works
                    </button>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                    <div className="w-px h-12 bg-gradient-to-b from-transparent to-[#c8965a]/60" />
                </div>
            </section>

            {/* ── WORKS SECTION ── */}
            <section id="photo-works" className="py-20 px-6 md:px-12 lg:px-20">
                <div className="flex items-end justify-between mb-12">
                    <h2
                        className="text-4xl md:text-5xl font-normal text-[#f2f2f2] leading-none"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                        Works
                    </h2>
                    <Link
                        href={`/store/${store.slug}/products`}
                        className="text-[10px] tracking-[0.35em] uppercase text-[#c8965a] hover:text-[#f2f2f2] transition-colors duration-200"
                    >
                        All Works →
                    </Link>
                </div>

                {products.length === 0 ? (
                    <div className="py-24 text-center">
                        <p className="text-[11px] tracking-[0.3em] uppercase text-[#444]">No works yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-1.5">
                        {products.map((product) => (
                            <PhotoProductCard
                                key={product.id}
                                product={product}
                                currency={store.currency}
                                storeSlug={store.slug}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* ── FOOTER ── */}
            <footer className="border-t border-[#1c1c1c] px-6 md:px-12 lg:px-20 py-12">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <p
                        className="text-lg text-[#f2f2f2] font-normal"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                        {store.name}
                    </p>

                    <div className="flex items-center gap-6 text-[10px] tracking-[0.3em] uppercase text-[#555]">
                        {socialLinks.instagram && (
                            <a
                                href={socialLinks.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-[#c8965a] transition-colors"
                            >
                                Instagram
                            </a>
                        )}
                        {socialLinks.twitter && (
                            <a
                                href={socialLinks.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-[#c8965a] transition-colors"
                            >
                                Twitter
                            </a>
                        )}
                        {socialLinks.tiktok && (
                            <a
                                href={socialLinks.tiktok}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-[#c8965a] transition-colors"
                            >
                                TikTok
                            </a>
                        )}
                        {socialLinks.whatsapp && (
                            <a
                                href={`https://wa.me/${socialLinks.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-[#c8965a] transition-colors"
                            >
                                WhatsApp
                            </a>
                        )}
                        <Link
                            href={`/store/${store.slug}/cart`}
                            className="hover:text-[#c8965a] transition-colors"
                        >
                            Cart
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
