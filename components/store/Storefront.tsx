'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, ShoppingBag, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Store {
    id: string
    name: string
    slug: string
    description: string | null
    logo_url: string | null
    currency: string
    settings: {
        primaryColor?: string
        heroTitle?: string
        heroSubtitle?: string
        heroImage?: string
        socialLinks?: {
            instagram?: string
            twitter?: string
            tiktok?: string
            whatsapp?: string
        }
    }
}

interface Product {
    id: string
    name: string
    slug: string
    description: string | null
    price: number
    compare_at_price: number | null
    images: { url: string; alt?: string }[]
    inventory_quantity: number
    track_inventory: boolean
}

interface Collection {
    id: string
    name: string
    slug: string
    image_url: string | null
}

interface StoreFrontProps {
    store: Store
    products: Product[]
    collections: Collection[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(amount: number, currency: string) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
    }).format(amount)
}

function isInStock(product: Product) {
    if (!product.track_inventory) return true
    return product.inventory_quantity > 0
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, currency, storeSlug }: {
    product: Product
    currency: string
    storeSlug: string
}) {
    const inStock = isInStock(product)
    const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
    const image = product.images?.[0]?.url ?? null

    return (
        <Link href={`/store/${storeSlug}/products/${product.slug}`} className="group block">
            <div className="relative overflow-hidden bg-surface aspect-square mb-3">
                {image ? (
                    <img
                        src={image}
                        alt={product.name}
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                        <ShoppingBag className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                )}
                {!inStock && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <span className="text-xs font-medium text-muted-foreground">Out of stock</span>
                    </div>
                )}
                {hasDiscount && inStock && (
                    <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs rounded-none">
                        Sale
                    </Badge>
                )}
            </div>
            <div className="space-y-1">
                <p className="text-sm font-medium leading-tight group-hover:underline underline-offset-2">
                    {product.name}
                </p>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                        {formatPrice(product.price, currency)}
                    </span>
                    {hasDiscount && (
                        <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(product.compare_at_price!, currency)}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    )
}

// ─── Main Storefront ──────────────────────────────────────────────────────────
export default function StoreFront({ store, products, collections }: StoreFrontProps) {
    const [query, setQuery] = useState('')
    const [activeCollection, setActiveCollection] = useState<string | null>(null)

    const settings = store.settings ?? {}
    const primaryColor = settings.primaryColor ?? '#1c2228'

    const filtered = useMemo(() => {
        return products.filter((p) => {
            const matchesQuery = query
                ? p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.description?.toLowerCase().includes(query.toLowerCase())
                : true
            return matchesQuery
        })
    }, [products, query])

    return (
        <div className="min-h-screen bg-background">

            {/* ── NAV ──────────────────────────────────────────────────────────── */}
            <nav className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
                <div className="container mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {store.logo_url ? (
                            <img src={store.logo_url} alt={store.name} width={28} height={28} className="rounded-full" />
                        ) : (
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {store.name[0].toUpperCase()}
                            </div>
                        )}
                        <span className="font-semibold text-sm">{store.name}</span>
                    </div>

                    {/* Search — desktop */}
                    <div className="hidden md:flex flex-1 max-w-sm relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search products..."
                            className="pl-8 h-8 text-sm rounded-none"
                        />
                    </div>

                    <Link href={`/store/${store.slug}/cart`}>
                        <Button variant="ghost" size="icon" className="relative">
                            <ShoppingBag className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>

                {/* Search — mobile */}
                <div className="md:hidden px-4 pb-3 relative">
                    <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search products..."
                        className="pl-8 h-8 text-sm rounded-none"
                    />
                </div>
            </nav>

            {/* ── HERO ─────────────────────────────────────────────────────────── */}
            {!query && (
                <section
                    className="relative py-16 md:py-24 px-4 md:px-6"
                    style={{ backgroundColor: primaryColor }}
                >
                    {settings.heroImage && (
                        <div className="absolute inset-0">
                            <img
                                src={settings.heroImage}
                                alt=""
                                className="object-cover opacity-20"
                            />
                        </div>
                    )}
                    <div className="relative container mx-auto text-center space-y-4">
                        <h1 className="text-3xl md:text-5xl font-bold text-white">
                            {settings.heroTitle ?? store.name}
                        </h1>
                        {(settings.heroSubtitle ?? store.description) && (
                            <p className="text-white/70 text-base md:text-lg max-w-lg mx-auto">
                                {settings.heroSubtitle ?? store.description}
                            </p>
                        )}
                        <Button
                            className="bg-white text-foreground hover:bg-white/90 rounded-none mt-2"
                            onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            Shop now
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </div>
                </section>
            )}

            {/* ── COLLECTIONS ──────────────────────────────────────────────────── */}
            {!query && collections.length > 0 && (
                <section className="container mx-auto px-4 md:px-6 py-8">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        <button
                            onClick={() => setActiveCollection(null)}
                            className={`shrink-0 px-4 py-1.5 text-sm border transition-colors ${activeCollection === null
                                ? 'bg-foreground text-background border-foreground'
                                : 'bg-background text-foreground border-border hover:border-foreground'
                                }`}
                        >
                            All
                        </button>
                        {collections.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setActiveCollection(c.id)}
                                className={`shrink-0 px-4 py-1.5 text-sm border transition-colors ${activeCollection === c.id
                                    ? 'bg-foreground text-background border-foreground'
                                    : 'bg-background text-foreground border-border hover:border-foreground'
                                    }`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* ── PRODUCTS ─────────────────────────────────────────────────────── */}
            <section id="products" className="container mx-auto px-4 md:px-6 py-8 pb-24">
                {query && (
                    <p className="text-sm text-muted-foreground mb-6">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''} for{' '}
                        <span className="font-medium text-foreground">"{query}"</span>
                    </p>
                )}

                {filtered.length === 0 ? (
                    <div className="text-center py-24 space-y-3">
                        <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                        <p className="text-muted-foreground text-sm">
                            {query ? 'No products match your search' : 'No products yet'}
                        </p>
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="text-sm text-foreground underline underline-offset-4"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {filtered.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                currency={store.currency}
                                storeSlug={store.slug}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* ── FOOTER ───────────────────────────────────────────────────────── */}
            <footer className="border-t py-8">
                <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} {store.name}</p>
                    {settings.socialLinks && (
                        <div className="flex items-center gap-4">
                            {settings.socialLinks.instagram && (
                                <a href={settings.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                                    Instagram
                                </a>
                            )}
                            {settings.socialLinks.tiktok && (
                                <a href={settings.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                                    TikTok
                                </a>
                            )}
                            {settings.socialLinks.whatsapp && (
                                <a href={`https://wa.me/${settings.socialLinks.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                                    WhatsApp
                                </a>
                            )}
                        </div>
                    )}
                    <p className="text-xs">
                        Powered by{' '}
                        <a href="https://menengai.cloud" className="hover:text-foreground transition-colors">
                            Menengai Cloud
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    )
}
