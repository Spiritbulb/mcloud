'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MapPin, Clock, Instagram, Twitter, MessageCircle } from 'lucide-react'
import type { StoreFrontProps } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
    }).format(amount)
}

// ─── Restaurant StoreFront ─────────────────────────────────────────────────────

export default function RestaurantStoreFront({
    store,
    products,
    collections,
    featuredProducts,
}: StoreFrontProps) {
    const settings = store.settings ?? {}
    const heroImage = settings.heroImage
    const socialLinks = settings.socialLinks ?? {}

    const displayFeatured = featuredProducts.length > 0 ? featuredProducts : products.slice(0, 6)

    return (
        <div className="min-h-screen bg-[#faf7f2] text-[#2c1810]">

            {/* ── HERO ── */}
            <section className="relative w-full h-[75vh] min-h-[480px] overflow-hidden">
                {heroImage ? (
                    <>
                        <img
                            src={heroImage}
                            alt={store.name}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#c8622a] via-[#a84e20] to-[#2c1810]" />
                )}

                {/* Hero content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                    <div className="max-w-2xl space-y-5">
                        <span className="inline-block bg-[#c8622a] text-white text-xs font-medium tracking-widest uppercase px-4 py-1.5 rounded-full">
                            {settings.heroTitle ? 'Welcome' : 'Est. ' + new Date().getFullYear()}
                        </span>
                        <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-tight drop-shadow-lg">
                            {settings.heroTitle ?? store.name}
                        </h1>
                        {(settings.heroSubtitle || store.description) && (
                            <p className="text-white/85 text-lg sm:text-xl font-light leading-relaxed max-w-xl mx-auto">
                                {settings.heroSubtitle ?? store.description}
                            </p>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                            <Link
                                href={`/store/${store.slug}/products`}
                                className="inline-flex items-center gap-2 bg-[#c8622a] hover:bg-[#b05520] text-white font-medium px-7 py-3.5 rounded-full transition-colors duration-200"
                            >
                                View Our Menu
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <button
                                onClick={() =>
                                    document
                                        .getElementById('our-story')
                                        ?.scrollIntoView({ behavior: 'smooth' })
                                }
                                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white font-medium px-7 py-3.5 rounded-full border border-white/30 transition-colors duration-200"
                            >
                                Our Story
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/60">
                    <div className="w-px h-8 bg-white/40 animate-pulse" />
                </div>
            </section>

            {/* ── FEATURED MENU ITEMS ── */}
            {displayFeatured.length > 0 && (
                <section className="py-16 md:py-24 px-4 md:px-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-12">
                            <span className="inline-block text-[#c8622a] text-sm font-medium tracking-widest uppercase mb-3">
                                Fresh &amp; Delicious
                            </span>
                            <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#2c1810]">
                                Our Menu
                            </h2>
                            <div className="mt-4 flex items-center justify-center gap-3">
                                <div className="h-px w-16 bg-[#c8622a]/40" />
                                <span className="text-[#c8622a]">✦</span>
                                <div className="h-px w-16 bg-[#c8622a]/40" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            {displayFeatured.map((product) => {
                                const image = product.images?.[0] ?? null
                                return (
                                    <Link
                                        key={product.id}
                                        href={`/store/${store.slug}/${product.slug}`}
                                        className="group flex items-center gap-5 bg-white hover:bg-[#fff8f3] border border-[#e8ddd4] hover:border-[#c8622a]/30 rounded-xl p-4 sm:p-5 transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                        {/* Thumbnail */}
                                        <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#f0e8e0]">
                                            {image ? (
                                                <img
                                                    src={image}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-3xl">
                                                    🍽️
                                                </div>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2c1810] group-hover:text-[#c8622a] transition-colors line-clamp-1">
                                                {product.name}
                                            </h3>
                                            {product.description && (
                                                <p className="text-sm text-[#6b4c3b] mt-0.5 line-clamp-2 leading-relaxed">
                                                    {product.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Price */}
                                        <div className="flex-shrink-0 text-right">
                                            <span className="text-lg sm:text-xl font-bold text-[#c8622a]">
                                                {fmt(product.price, store.currency)}
                                            </span>
                                            {product.compare_at_price && product.compare_at_price > product.price && (
                                                <p className="text-xs text-[#6b4c3b]/60 line-through mt-0.5">
                                                    {fmt(product.compare_at_price, store.currency)}
                                                </p>
                                            )}
                                        </div>

                                        <ArrowRight className="flex-shrink-0 w-4 h-4 text-[#c8622a]/40 group-hover:text-[#c8622a] group-hover:translate-x-1 transition-all duration-200" />
                                    </Link>
                                )
                            })}
                        </div>

                        <div className="text-center mt-10">
                            <Link
                                href={`/store/${store.slug}/products`}
                                className="inline-flex items-center gap-2 bg-[#2c1810] hover:bg-[#3d2416] text-[#faf7f2] font-medium px-8 py-3.5 rounded-full transition-colors duration-200"
                            >
                                See Full Menu
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* ── CATEGORIES ── */}
            {collections.length > 0 && (
                <section className="py-16 md:py-20 bg-[#f5ede3] px-4 md:px-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-10">
                            <span className="inline-block text-[#c8622a] text-sm font-medium tracking-widest uppercase mb-3">
                                Browse by
                            </span>
                            <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#2c1810]">
                                Category
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {collections.map((collection) => (
                                <Link
                                    key={collection.id}
                                    href={`/store/${store.slug}/products`}
                                    className="group flex flex-col items-center gap-3 bg-white hover:bg-[#fff8f3] border border-[#e8ddd4] hover:border-[#c8622a]/30 rounded-xl p-5 text-center transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    {collection.image_url ? (
                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-[#f0e8e0]">
                                            <img
                                                src={collection.image_url}
                                                alt={collection.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-[#c8622a]/10 flex items-center justify-center text-2xl">
                                            🍴
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-serif font-bold text-[#2c1810] group-hover:text-[#c8622a] transition-colors">
                                            {collection.name}
                                        </p>
                                        {collection.description && (
                                            <p className="text-xs text-[#6b4c3b] mt-1 line-clamp-2">
                                                {collection.description}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── OUR STORY ── */}
            {store.description && (
                <section id="our-story" className="py-16 md:py-24 px-4 md:px-8">
                    <div className="max-w-3xl mx-auto text-center">
                        <span className="inline-block text-[#c8622a] text-sm font-medium tracking-widest uppercase mb-3">
                            About Us
                        </span>
                        <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#2c1810] mb-6">
                            Our Story
                        </h2>
                        <div className="flex items-center justify-center gap-3 mb-8">
                            <div className="h-px w-16 bg-[#c8622a]/40" />
                            <span className="text-[#c8622a]">✦</span>
                            <div className="h-px w-16 bg-[#c8622a]/40" />
                        </div>
                        <p className="text-[#4a2e20] text-lg leading-relaxed font-light">
                            {store.description}
                        </p>
                        {store.logo_url && (
                            <img
                                src={store.logo_url}
                                alt={store.name}
                                className="w-24 h-24 mx-auto mt-10 object-contain rounded-full border-4 border-[#c8622a]/20"
                            />
                        )}
                    </div>
                </section>
            )}

            {/* ── FOOTER ── */}
            <footer className="bg-[#2c1810] text-[#faf7f2] py-14 px-4 md:px-8">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10">
                        {/* Brand */}
                        <div className="space-y-4">
                            <h3 className="font-serif text-2xl font-bold">{store.name}</h3>
                            <p className="text-[#d4b8a8] text-sm leading-relaxed">
                                {store.description?.slice(0, 120) ?? 'Bringing warmth and flavor to every meal.'}
                            </p>
                        </div>

                        {/* Hours */}
                        <div className="space-y-4">
                            <h4 className="font-serif text-lg font-bold flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#c8622a]" />
                                Opening Hours
                            </h4>
                            <ul className="space-y-1.5 text-sm text-[#d4b8a8]">
                                <li className="flex justify-between gap-4">
                                    <span>Mon – Fri</span>
                                    <span>8:00 AM – 9:00 PM</span>
                                </li>
                                <li className="flex justify-between gap-4">
                                    <span>Saturday</span>
                                    <span>9:00 AM – 10:00 PM</span>
                                </li>
                                <li className="flex justify-between gap-4">
                                    <span>Sunday</span>
                                    <span>10:00 AM – 8:00 PM</span>
                                </li>
                            </ul>
                        </div>

                        {/* Social & Links */}
                        <div className="space-y-4">
                            <h4 className="font-serif text-lg font-bold flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-[#c8622a]" />
                                Connect
                            </h4>
                            <div className="flex flex-wrap gap-3">
                                {socialLinks.instagram && (
                                    <a
                                        href={socialLinks.instagram}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-[#d4b8a8] hover:text-[#c8622a] transition-colors"
                                    >
                                        <Instagram className="w-4 h-4" />
                                        Instagram
                                    </a>
                                )}
                                {socialLinks.twitter && (
                                    <a
                                        href={socialLinks.twitter}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-[#d4b8a8] hover:text-[#c8622a] transition-colors"
                                    >
                                        <Twitter className="w-4 h-4" />
                                        Twitter
                                    </a>
                                )}
                                {socialLinks.whatsapp && (
                                    <a
                                        href={`https://wa.me/${socialLinks.whatsapp}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-[#d4b8a8] hover:text-[#c8622a] transition-colors"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        WhatsApp
                                    </a>
                                )}
                            </div>
                            <div className="pt-2 space-y-1">
                                <Link
                                    href={`/store/${store.slug}/products`}
                                    className="block text-sm text-[#d4b8a8] hover:text-[#c8622a] transition-colors"
                                >
                                    Our Menu
                                </Link>
                                <Link
                                    href={`/store/${store.slug}/blog`}
                                    className="block text-sm text-[#d4b8a8] hover:text-[#c8622a] transition-colors"
                                >
                                    Stories &amp; Recipes
                                </Link>
                                <Link
                                    href={`/store/${store.slug}/cart`}
                                    className="block text-sm text-[#d4b8a8] hover:text-[#c8622a] transition-colors"
                                >
                                    Your Order
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[#4a2e20] pt-6 text-center text-xs text-[#6b4c3b]">
                        &copy; {new Date().getFullYear()} {store.name}. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    )
}
