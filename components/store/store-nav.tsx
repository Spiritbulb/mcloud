'use client'

import { ShoppingBag, X, Search } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'


interface Store {
    id: string
    name: string
    slug: string
    description: string | null
    logo_url: string | null
    currency: string
    settings: {
        heroTitle?: string
        heroSubtitle?: string
        heroImage?: string
        heroImagePath?: string
        logoPath?: string
        heroSlides?: {
            title: string
            subtitle?: string
            image?: string
            accent?: string
            buttonText?: string
        }[]
        socialLinks?: {
            instagram?: string
            twitter?: string
            tiktok?: string
            whatsapp?: string
        }
    }
}

interface StoreNavProps {
    store: Store
    themeId?: string
}



// ─── Classic Nav ───────────────────────────────────────────────────────────────
// Colours come entirely from storefront.css sf-* custom properties.
function ClassicNav({ store }: { store: Store }) {
    const { cartItems } = useCart()
    return (
        <nav className="sf-nav sticky top-0 z-40">
            <div className="container mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
                <Link href={`/store/${store.slug}`} className="flex items-center gap-3">
                    {store.logo_url ? (
                        <img
                            src={store.logo_url}
                            alt={store.name}
                            width={36}
                            height={36}
                            className="object-cover"
                            style={{ borderRadius: 'var(--sf-border-radius)' }}
                        />
                    ) : (
                        <div
                            className="sf-logo-fallback w-7 h-7 flex items-center justify-center text-xs font-bold"
                            style={{ borderRadius: 'var(--sf-border-radius)' }}
                        >
                            {store.name[0].toUpperCase()}
                        </div>
                    )}
                    <span
                        className="sf-heading font-normal text-sm hidden sm:block"
                        style={{ color: 'var(--sf-foreground)' }}
                    >
                        {store.name.toUpperCase()}
                    </span>
                </Link>

                <Link
                    href={`/store/${store.slug}/cart`}
                    className="w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-70"
                    style={{ color: 'var(--sf-foreground)' }}
                    aria-label="Cart"
                >
                    <ShoppingBag className="w-4 h-4" />
                    {cartItems.length > 0 && (
                        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                </Link>
            </div>
        </nav>
    )
}

// ─── Noir Nav ─────────────────────────────────────────────────────────────────
// #080808 bg, [#1a1a1a] border, gold [#c9a96e] accents, Jost font.
function NoirNav({ store }: { store: Store }) {
    const [searchOpen, setSearchOpen] = useState(false)

    return (
        <nav
            className="sticky top-0 z-40 border-b border-[#1a1a1a] bg-[#080808]/95 backdrop-blur-sm"
            style={{ fontFamily: "'Jost', sans-serif" }}
        >
            <div className="px-8 md:px-16 lg:px-24 h-16 flex items-center justify-between gap-6">
                {/* Wordmark */}
                <Link href={`/store/${store.slug}`} className="flex items-center gap-3 group">
                    {store.logo_url ? (
                        <img
                            src={store.logo_url}
                            alt={store.name}
                            width={28}
                            height={28}
                            className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                    ) : (
                        <div className="w-6 h-6 flex items-center justify-center text-[10px] font-light text-[#080808] bg-[#c9a96e]">
                            {store.name[0].toUpperCase()}
                        </div>
                    )}
                    <span className="text-[11px] tracking-[0.35em] uppercase text-[#e8e2d9] font-light hidden sm:block">
                        {store.name}
                    </span>
                </Link>

                {/* Right: search + cart */}
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                        {searchOpen && (
                            <input
                                autoFocus
                                placeholder="Search…"
                                className="bg-transparent border-b border-[#333] text-sm text-[#e8e2d9] placeholder:text-[#444] outline-none pb-0.5 tracking-wide w-36"
                            />
                        )}
                        <button
                            onClick={() => setSearchOpen(s => !s)}
                            className="text-[#666] hover:text-[#c9a96e] transition-colors"
                            aria-label={searchOpen ? 'Close search' : 'Search'}
                        >
                            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                        </button>
                    </div>

                    <Link
                        href={`/store/${store.slug}/cart`}
                        className="text-[#666] hover:text-[#c9a96e] transition-colors"
                        aria-label="Cart"
                    >
                        <ShoppingBag className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </nav>
    )
}

// ─── Minimal Nav ──────────────────────────────────────────────────────────────
// #f7f4f0 bg, [#e5e0d9] border, warm neutrals, DM Sans font.
function MinimalNav({ store }: { store: Store }) {
    const [searchOpen, setSearchOpen] = useState(false)

    return (
        <nav
            className="sticky top-0 z-40 bg-[#f7f4f0]/95 backdrop-blur-sm border-b border-[#e5e0d9]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
            <div className="px-6 md:px-12 lg:px-20 h-14 flex items-center justify-between gap-4">
                {/* Wordmark */}
                <Link href={`/store/${store.slug}`} className="flex items-center gap-3">
                    {store.logo_url ? (
                        <img
                            src={store.logo_url}
                            alt={store.name}
                            width={32}
                            height={32}
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-7 h-7 flex items-center justify-center text-xs text-[#f7f4f0] bg-[#1a1714]">
                            {store.name[0].toUpperCase()}
                        </div>
                    )}
                    <span className="text-sm font-normal text-[#1a1714] hidden sm:block">
                        {store.name}
                    </span>
                </Link>

                {/* Right: search + cart */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 border-b border-transparent focus-within:border-[#c8c0b6] transition-colors pb-0.5">
                        {searchOpen && (
                            <input
                                autoFocus
                                placeholder="Search…"
                                className="bg-transparent text-sm text-[#1a1714] placeholder:text-[#c8c0b6] outline-none w-32"
                            />
                        )}
                        <button
                            onClick={() => setSearchOpen(s => !s)}
                            className="text-[#b8b0a6] hover:text-[#5c5650] transition-colors"
                            aria-label={searchOpen ? 'Close search' : 'Search'}
                        >
                            {searchOpen ? <X className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
                        </button>
                    </div>

                    <Link
                        href={`/store/${store.slug}/cart`}
                        className="text-[#5c5650] hover:text-[#1a1714] transition-colors"
                        aria-label="Cart"
                    >
                        <ShoppingBag className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </nav>
    )
}

// ─── Photography Nav ──────────────────────────────────────────────────────────
// #0c0c0c bg, #c8965a accent, elegant serif feel
function PhotographyNav({ store }: { store: Store }) {
    return (
        <nav
            className="fixed top-0 left-0 right-0 z-40 bg-[#0c0c0c]/90 backdrop-blur-sm border-b border-[#1c1c1c]"
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            <div className="px-6 md:px-12 lg:px-20 h-14 flex items-center justify-between gap-4">
                <Link href={`/store/${store.slug}`} className="flex items-center gap-3">
                    {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} width={28} height={28} className="object-cover" />
                    ) : (
                        <div className="w-6 h-6 flex items-center justify-center text-[10px] font-light text-[#c8965a] border border-[#c8965a]/50">
                            {store.name[0].toUpperCase()}
                        </div>
                    )}
                    <span className="text-[11px] tracking-[0.25em] uppercase text-[#888] font-light hidden sm:block">
                        {store.name}
                    </span>
                </Link>

                <div className="flex items-center gap-4">
                    <Link href={`/store/${store.slug}/cart`} className="text-[#555] hover:text-[#c8965a] transition-colors" aria-label="Cart">
                        <ShoppingBag className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </nav>
    )
}

// ─── Portfolio Nav ────────────────────────────────────────────────────────────
// #ffffff bg, #6366f1 accent, bold creative
function PortfolioNav({ store }: { store: Store }) {
    return (
        <nav
            className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-100"
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            <div className="px-6 md:px-12 lg:px-16 h-16 flex items-center justify-between gap-4">
                <Link href={`/store/${store.slug}`} className="flex items-center gap-3">
                    {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} width={36} height={36} className="object-cover" />
                    ) : (
                        <div className="w-8 h-8 flex items-center justify-center text-xs font-semibold text-white bg-[#6366f1]">
                            {store.name[0].toUpperCase()}
                        </div>
                    )}
                    <span className="text-sm font-semibold text-gray-900 hidden sm:block">
                        {store.name}
                    </span>
                </Link>

                <div className="flex items-center gap-6">
                    <Link href={`/store/${store.slug}/products`} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        Work
                    </Link>
                    <Link href={`/store/${store.slug}/cart`} className="text-gray-600 hover:text-gray-900 transition-colors" aria-label="Cart">
                        <ShoppingBag className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </nav>
    )
}

// ─── Services Nav ────────────────────────────────────────────────────────────
// #f8fafc bg, #2563eb accent, professional trustworthy
function ServicesNav({ store }: { store: Store }) {
    return (
        <nav
            className="sticky top-0 z-40 bg-slate-50/90 backdrop-blur-sm border-b border-slate-200"
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            <div className="px-6 md:px-12 lg:px-20 h-14 flex items-center justify-between gap-4">
                <Link href={`/store/${store.slug}`} className="flex items-center gap-3">
                    {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} width={32} height={32} className="object-cover" />
                    ) : (
                        <div className="w-7 h-7 flex items-center justify-center text-xs font-semibold text-white bg-[#2563eb]">
                            {store.name[0].toUpperCase()}
                        </div>
                    )}
                    <span className="text-sm font-medium text-slate-900 hidden sm:block">
                        {store.name}
                    </span>
                </Link>

                <div className="flex items-center gap-6">
                    <Link href={`/store/${store.slug}/products`} className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                        Services
                    </Link>
                    <Link href={`/store/${store.slug}/cart`} className="text-slate-600 hover:text-slate-900 transition-colors" aria-label="Cart">
                        <ShoppingBag className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </nav>
    )
}

// ─── Restaurant Nav ──────────────────────────────────────────────────────────
// #faf7f2 bg, #c8622a accent, warm inviting
function RestaurantNav({ store }: { store: Store }) {
    return (
        <nav
            className="sticky top-0 z-40 bg-[#faf7f2]/95 backdrop-blur-sm border-b border-[#e8e0d8]"
            style={{ fontFamily: "'Georgia', serif" }}
        >
            <div className="px-6 md:px-12 lg:px-16 h-14 flex items-center justify-between gap-4">
                <Link href={`/store/${store.slug}`} className="flex items-center gap-3">
                    {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} width={32} height={32} className="object-cover" />
                    ) : (
                        <div className="w-7 h-7 flex items-center justify-center text-xs font-light text-[#c8622a] border border-[#c8622a]/50">
                            {store.name[0].toUpperCase()}
                        </div>
                    )}
                    <span className="text-sm font-light text-[#2c1810] hidden sm:block italic">
                        {store.name}
                    </span>
                </Link>

                <div className="flex items-center gap-6">
                    <Link href={`/store/${store.slug}/products`} className="text-sm text-[#8b6f5c] hover:text-[#2c1810] transition-colors">
                        Menu
                    </Link>
                    <Link href={`/store/${store.slug}/cart`} className="text-[#8b6f5c] hover:text-[#2c1810] transition-colors" aria-label="Cart">
                        <ShoppingBag className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </nav>
    )
}

// ─── Theme dispatcher ─────────────────────────────────────────────────────────
export default function StoreNav({ store, themeId = 'classic' }: StoreNavProps) {
    switch (themeId) {
        case 'noir': return <NoirNav store={store} />
        case 'minimal': return <MinimalNav store={store} />
        case 'photography': return <PhotographyNav store={store} />
        case 'portfolio': return <PortfolioNav store={store} />
        case 'services': return <ServicesNav store={store} />
        case 'restaurant': return <RestaurantNav store={store} />
        default: return <ClassicNav store={store} />
    }
}