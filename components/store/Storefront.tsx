'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Search, ShoppingBag, ArrowRight, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

// ─── Types ────────────────────────────────────────────────────────────────────
interface HeroSlide {
    title: string
    subtitle?: string
    image?: string
    accent?: string
    buttonText?: string
}

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
        heroImagePath?: string
        logoPath?: string
        heroSlides?: HeroSlide[]
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
    description: string | null
    image_url: string | null
}

interface StoreFrontProps {
    store: Store
    products: Product[]
    collections: Collection[]
    featuredProducts: Product[]
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
            <Card className="overflow-hidden border-border/50 hover:border-foreground/20 transition-all pt-0 cursor-pointer">
                <div className="relative overflow-hidden bg-muted h-56 sm:h-64">
                    {image ? (
                        <Image
                            src={image}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-muted-foreground/40" />
                        </div>
                    )}
                    {!inStock && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                            <Badge variant="secondary">Out of stock</Badge>
                        </div>
                    )}
                    {hasDiscount && inStock && (
                        <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground rounded-none">
                            Sale
                        </Badge>
                    )}
                </div>
                <CardHeader className="space-y-1 px-4 pt-4 pb-2">
                    <CardTitle className={`text-base font-normal line-clamp-2 ${playfair.className}`}>
                        {product.name}
                    </CardTitle>
                    {product.description && (
                        <CardDescription className="text-xs line-clamp-2">
                            {product.description}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardFooter className="flex justify-between items-center px-4 pb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-light">
                            {formatPrice(product.price, currency)}
                        </span>
                        {hasDiscount && (
                            <span className="text-xs text-muted-foreground line-through">
                                {formatPrice(product.compare_at_price!, currency)}
                            </span>
                        )}
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1">
                        View <ArrowRight className="h-3 w-3" />
                    </Button>
                </CardFooter>
            </Card>
        </Link>
    )
}

// ─── Main Storefront ──────────────────────────────────────────────────────────
export default function StoreFront({ store, products, collections, featuredProducts }: StoreFrontProps) {
    const router = useRouter()
    const [query, setQuery] = useState('')
    const [activeCollection, setActiveCollection] = useState<string | null>(null)
    const [currentSlide, setCurrentSlide] = useState(0)

    const settings = store.settings ?? {}
    const primaryColor = settings.primaryColor ?? '#1c2228'

    // Build slides — use heroSlides array if present, else single fallback slide
    const heroSlides: HeroSlide[] =
        settings.heroSlides && settings.heroSlides.length > 0
            ? settings.heroSlides
            : [
                {
                    title: settings.heroTitle ?? store.name,
                    subtitle: settings.heroSubtitle ?? store.description ?? '',
                    image: settings.heroImage ?? undefined,
                    accent: 'New Arrivals',
                    buttonText: 'Shop now',
                },
            ]

    // Auto-advance slides
    useEffect(() => {
        if (heroSlides.length <= 1) return
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [heroSlides.length])

    const filtered = useMemo(() => {
        return products.filter((p) => {
            return query
                ? p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.description?.toLowerCase().includes(query.toLowerCase())
                : true
        })
    }, [products, query])

    return (
        <div className={`min-h-screen bg-background ${playfair.variable}`}>

            {/* ── NAV ───────────────────────────────────────────────────────── */}
            <nav className="border-b sticky top-0 z-40 bg-background">
                <div className="container mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {store.logo_url ? (
                            <img
                                src={store.logo_url}
                                alt={store.name}
                                width={36}
                                height={36}
                                className="rounded-lg object-cover"
                            />
                        ) : (
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {store.name[0].toUpperCase()}
                            </div>
                        )}
                        <span className={`font-semibold text-sm hidden sm:block ${playfair.className}`}>
                            {store.name}
                        </span>
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
                        <Button variant="ghost" size="icon">
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

            {/* ── HERO ──────────────────────────────────────────────────────── */}
            {!query && (
                <section className="relative w-full h-[70vh] sm:h-[90vh] overflow-hidden">
                    {heroSlides.map((slide, index) => (
                        <div
                            key={index}
                            className={`absolute inset-0 transition-opacity duration-700 ${index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                }`}
                        >
                            {slide.image ? (
                                <>
                                    <img
                                        src={slide.image}
                                        alt={slide.title}
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/30 md:bg-black/20" />
                                </>
                            ) : (
                                <div className="absolute inset-0" style={{ backgroundColor: primaryColor }}>
                                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_50%,white,transparent_60%)]" />
                                </div>
                            )}

                            <div className="absolute inset-0 flex items-end md:items-center">
                                <motion.div
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={{
                                        opacity: index === currentSlide ? 1 : 0,
                                        y: index === currentSlide ? 0 : 40,
                                    }}
                                    transition={{ duration: 0.5 }}
                                    className="w-full px-4 sm:px-6 md:px-8 pb-16 md:pb-0"
                                >
                                    <div className="max-w-xl space-y-4 bg-background p-5 sm:p-6">
                                        {slide.accent && (
                                            <Badge variant="outline" className="border-foreground">
                                                {slide.accent}
                                            </Badge>
                                        )}
                                        <h1 className={`text-3xl md:text-5xl font-bold tracking-tight ${playfair.className}`}>
                                            {slide.title}
                                        </h1>
                                        {slide.subtitle && (
                                            <p className="text-muted-foreground text-base md:text-lg font-light">
                                                {slide.subtitle}
                                            </p>
                                        )}
                                        <Button
                                            size="lg"
                                            className="mt-2 group rounded-none text-white"
                                            onClick={() =>
                                                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })
                                            }
                                        >
                                            {slide.buttonText ?? 'Shop now'}
                                            <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                                        </Button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    ))}

                    {/* Slide indicators — only shown for multiple slides */}
                    {heroSlides.length > 1 && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                            {heroSlides.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`h-0.5 transition-all duration-300 ${index === currentSlide ? 'w-12 bg-white' : 'w-6 bg-white/30'
                                        }`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* ── COLLECTIONS ───────────────────────────────────────────────── */}
            {!query && collections.length > 0 && (
                <>
                    <Separator />
                    <section className="py-12 md:py-20 bg-muted/20">
                        <div className="container mx-auto px-4 md:px-6">
                            <div className="mb-10 md:mb-14">
                                <Badge variant="outline" className="mb-3">Collections</Badge>
                                <h2 className={`text-3xl md:text-4xl font-light tracking-tight ${playfair.className}`}>
                                    Shop by Category
                                </h2>
                                <p className="text-muted-foreground font-light text-sm mt-2">
                                    Curated selections for every need
                                </p>
                            </div>

                            {/* Filter pills */}
                            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none mb-8">
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

                            {/* Collection cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                                {collections.map((collection) => (
                                    <Card
                                        key={collection.id}
                                        className="group cursor-pointer overflow-hidden hover:shadow-lg transition-shadow pt-0"
                                        onClick={() =>
                                            router.push(`/store/${store.slug}/collections/${collection.slug}`)
                                        }
                                    >
                                        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                                            {collection.image_url ? (
                                                <Image
                                                    src={collection.image_url}
                                                    alt={collection.name}
                                                    fill
                                                    className="object-cover transition-transform group-hover:scale-105"
                                                />
                                            ) : (
                                                <div
                                                    className="w-full h-full"
                                                    style={{ backgroundColor: primaryColor + '33' }}
                                                />
                                            )}
                                        </div>
                                        <CardHeader className="px-4 pt-4 pb-2">
                                            <CardTitle className={`text-xl font-light ${playfair.className}`}>
                                                {collection.name}
                                            </CardTitle>
                                            {collection.description && (
                                                <CardDescription className="line-clamp-2 text-sm">
                                                    {collection.description}
                                                </CardDescription>
                                            )}
                                        </CardHeader>
                                        <CardFooter className="px-4 pb-4">
                                            <Button variant="outline" size="sm">Explore</Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </section>
                </>
            )}

            <Separator />

            {/* ── FEATURED PRODUCTS ─────────────────────────────────────────── */}
            {!query && featuredProducts.length > 0 && (
                <>
                    <section className="py-12 md:py-20">
                        <div className="container mx-auto px-4 md:px-6">
                            <div className="mb-10 md:mb-14">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="h-px flex-1 bg-border" />
                                    <Badge variant="outline">Featured Collection</Badge>
                                    <div className="h-px flex-1 bg-border" />
                                </div>
                                <h2 className={`text-3xl md:text-4xl font-light text-center tracking-tight ${playfair.className}`}>
                                    Top Picks
                                </h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                {featuredProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        currency={store.currency}
                                        storeSlug={store.slug}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                    <Separator />
                </>
            )}

            {/* ── ALL PRODUCTS (search + browse) ────────────────────────────── */}
            <section id="products" className="py-12 md:py-20">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="mb-10 md:mb-14">
                        {query ? (
                            <p className="text-sm text-muted-foreground">
                                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for{' '}
                                <span className="font-medium text-foreground">"{query}"</span>
                            </p>
                        ) : (
                            <>
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="h-px flex-1 bg-border" />
                                    <Badge variant="outline">All Products</Badge>
                                    <div className="h-px flex-1 bg-border" />
                                </div>
                                <h2 className={`text-3xl md:text-4xl font-light text-center tracking-tight ${playfair.className}`}>
                                    Browse Everything
                                </h2>
                            </>
                        )}
                    </div>

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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
                </div>
            </section>

            {/* ── FOOTER ────────────────────────────────────────────────────── */}
            <footer className="border-t py-8 bg-muted/10">
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
                            {settings.socialLinks.twitter && (
                                <a href={settings.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                                    Twitter / X
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
