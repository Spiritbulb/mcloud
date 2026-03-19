'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, ShoppingBag, ExternalLink } from 'lucide-react'
import type { StoreFrontProps } from '../types'

function fmt(amount: number, currency: string) {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}

// ─── Case Study Card ───────────────────────────────────────────────────────────
function CaseStudyCard({ product, currency, storeSlug }: {
    product: StoreFrontProps['products'][0]
    currency: string
    storeSlug: string
}) {
    const image = product.images?.[0] ?? null
    const excerpt = product.description
        ? product.description.length > 120
            ? product.description.slice(0, 120).trimEnd() + '…'
            : product.description
        : null

    return (
        <Link
            href={`/store/${storeSlug}/${product.slug}`}
            className="group block border border-gray-100 hover:border-[#6366f1]/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white"
        >
            {/* Image */}
            <div className="relative overflow-hidden aspect-video bg-gray-50">
                {image ? (
                    <img
                        src={image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-gray-200" />
                    </div>
                )}
                <div className="absolute inset-0 bg-[#6366f1]/0 group-hover:bg-[#6366f1]/5 transition-colors duration-300" />
            </div>

            {/* Content */}
            <div className="p-6 md:p-8">
                <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="text-xl font-black text-[#111111] leading-tight group-hover:text-[#6366f1] transition-colors">
                        {product.name}
                    </h3>
                    <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-[#6366f1] flex-shrink-0 mt-1 transition-colors" />
                </div>
                {excerpt && (
                    <p className="text-sm text-gray-500 leading-relaxed mb-4">{excerpt}</p>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#111111]">{fmt(product.price, currency)}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#6366f1] group-hover:gap-3 transition-all duration-200">
                        View project <ArrowRight className="w-3 h-3" />
                    </span>
                </div>
            </div>
        </Link>
    )
}

// ─── Portfolio StoreFront ──────────────────────────────────────────────────────
export default function PortfolioStoreFront({ store, products, collections, featuredProducts }: StoreFrontProps) {
    const settings = store.settings ?? {}
    const heroTitle = settings.heroTitle ?? store.name
    const heroSubtitle = settings.heroSubtitle ?? store.description ?? ''
    const heroImage = settings.heroImage ?? null
    const social = settings.socialLinks ?? {}

    const displayProducts = featuredProducts.length > 0 ? featuredProducts : products.slice(0, 6)

    return (
        <div className="min-h-screen bg-white text-[#111111] font-sans">

            {/* ── NAV ── */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
                    <Link href={`/store/${store.slug}`} className="text-lg font-black tracking-tight text-[#111111] hover:text-[#6366f1] transition-colors">
                        {store.name}
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link href={`/store/${store.slug}/products`} className="text-sm font-semibold text-gray-500 hover:text-[#111111] transition-colors hidden sm:block">
                            Work
                        </Link>
                        <Link href={`/store/${store.slug}/blog`} className="text-sm font-semibold text-gray-500 hover:text-[#111111] transition-colors hidden sm:block">
                            Insights
                        </Link>
                        <Link
                            href={`/store/${store.slug}/cart`}
                            className="flex items-center gap-2 bg-[#6366f1] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 hover:bg-[#4f46e5] transition-colors"
                        >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Cart
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section className="relative min-h-screen flex items-center pt-16">
                {/* Background image */}
                {heroImage && (
                    <>
                        <img src={heroImage} alt={heroTitle} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-[#111111]/70" />
                    </>
                )}

                {/* Background pattern when no image */}
                {!heroImage && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-indigo-50/40" />
                )}

                <div className={`relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-24 ${heroImage ? 'text-white' : 'text-[#111111]'}`}>
                    <div className="max-w-4xl">
                        {/* Eyebrow */}
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-0.5 bg-[#6366f1]" />
                            <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#6366f1]">
                                Creative Professional
                            </span>
                        </div>

                        {/* Main heading */}
                        <h1 className="text-6xl md:text-8xl lg:text-[clamp(4rem,10vw,8rem)] font-black leading-[0.92] tracking-tight mb-8">
                            {heroTitle}
                        </h1>

                        {heroSubtitle && (
                            <p className={`text-lg md:text-xl font-light leading-relaxed max-w-2xl mb-12 ${heroImage ? 'text-white/80' : 'text-gray-500'}`}>
                                {heroSubtitle}
                            </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4">
                            <button
                                onClick={() => document.getElementById('portfolio-work')?.scrollIntoView({ behavior: 'smooth' })}
                                className="inline-flex items-center gap-3 bg-[#6366f1] text-white font-bold text-sm uppercase tracking-widest px-8 py-4 hover:bg-[#4f46e5] transition-colors"
                            >
                                View Work <ArrowRight className="w-4 h-4" />
                            </button>
                            <Link
                                href={`/store/${store.slug}/products`}
                                className={`inline-flex items-center gap-2 font-bold text-sm uppercase tracking-widest px-8 py-4 border-2 transition-colors ${heroImage ? 'border-white/40 text-white hover:border-white' : 'border-gray-200 text-[#111111] hover:border-[#6366f1] hover:text-[#6366f1]'}`}
                            >
                                All Projects
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                    <div className="w-px h-12 bg-gradient-to-b from-transparent to-[#6366f1]/60" />
                </div>
            </section>

            {/* ── SELECTED WORK ── */}
            <section id="portfolio-work" className="py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto">
                <div className="flex items-end justify-between mb-16 gap-6 flex-wrap">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#6366f1] mb-3">Portfolio</p>
                        <h2 className="text-4xl md:text-6xl font-black text-[#111111] leading-tight">
                            Selected<br />Work
                        </h2>
                    </div>
                    <Link
                        href={`/store/${store.slug}/products`}
                        className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-[#6366f1] transition-colors group"
                    >
                        View all <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {displayProducts.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-gray-200">
                        <ShoppingBag className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 text-sm">No projects yet</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                        {displayProducts.map((p, i) => (
                            <div
                                key={p.id}
                                style={{ animationDelay: `${i * 0.08}s` }}
                                className="animate-fade-in"
                            >
                                <CaseStudyCard product={p} currency={store.currency} storeSlug={store.slug} />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── ABOUT ── */}
            {store.description && (
                <section className="py-24 md:py-32 bg-[#111111] text-white">
                    <div className="max-w-7xl mx-auto px-6 md:px-12">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#6366f1] mb-4">About</p>
                                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-8">
                                    Who we are
                                </h2>
                                <div className="w-12 h-1 bg-[#6366f1] mb-8" />
                            </div>
                            <div>
                                <p className="text-lg text-white/70 leading-relaxed mb-8">
                                    {store.description}
                                </p>
                                <Link
                                    href={`/store/${store.slug}/products`}
                                    className="inline-flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-[#6366f1] hover:gap-5 transition-all duration-200 group"
                                >
                                    See our work <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ── SOCIAL LINKS ── */}
            {Object.values(social).some(Boolean) && (
                <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto border-t border-gray-100">
                    <div className="flex flex-wrap items-center gap-6">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Find us on</span>
                        {social.instagram && (
                            <a href={social.instagram} target="_blank" rel="noopener noreferrer"
                                className="text-sm font-bold text-gray-400 hover:text-[#6366f1] transition-colors uppercase tracking-wider">
                                Instagram
                            </a>
                        )}
                        {social.twitter && (
                            <a href={social.twitter} target="_blank" rel="noopener noreferrer"
                                className="text-sm font-bold text-gray-400 hover:text-[#6366f1] transition-colors uppercase tracking-wider">
                                Twitter
                            </a>
                        )}
                        {social.tiktok && (
                            <a href={social.tiktok} target="_blank" rel="noopener noreferrer"
                                className="text-sm font-bold text-gray-400 hover:text-[#6366f1] transition-colors uppercase tracking-wider">
                                TikTok
                            </a>
                        )}
                        {social.whatsapp && (
                            <a href={`https://wa.me/${social.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                                className="text-sm font-bold text-gray-400 hover:text-[#6366f1] transition-colors uppercase tracking-wider">
                                WhatsApp
                            </a>
                        )}
                    </div>
                </section>
            )}

            {/* ── FOOTER ── */}
            <footer className="border-t border-gray-100 py-12 px-6 md:px-12">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div>
                        <p className="text-lg font-black text-[#111111] mb-1">{store.name}</p>
                        <p className="text-xs text-gray-400 uppercase tracking-widest">Creative Studio</p>
                    </div>
                    <nav className="flex flex-wrap items-center gap-6">
                        <Link href={`/store/${store.slug}/products`} className="text-sm font-semibold text-gray-400 hover:text-[#6366f1] transition-colors">Work</Link>
                        <Link href={`/store/${store.slug}/blog`} className="text-sm font-semibold text-gray-400 hover:text-[#6366f1] transition-colors">Insights</Link>
                        <Link href={`/store/${store.slug}/cart`} className="text-sm font-semibold text-gray-400 hover:text-[#6366f1] transition-colors">Cart</Link>
                    </nav>
                    <p className="text-xs text-gray-300">
                        &copy; {new Date().getFullYear()} {store.name}
                    </p>
                </div>
            </footer>
        </div>
    )
}
