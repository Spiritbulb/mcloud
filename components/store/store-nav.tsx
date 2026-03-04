'use client'

import { ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'

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

export default function StoreNav({ store }: { store: Store }) {
    return (
        <nav className="sf-nav sticky top-0 z-40">
            <div className="container mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
                <Link href={`/`}>
                    <div className="flex items-center gap-3">
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
                        <div className="flex flex-col">
                            <span
                                className="sf-heading font-normal text-sm hidden sm:block"
                                style={{ color: 'var(--sf-foreground)' }}
                            >
                                {store.name.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </Link>

                <Link
                    href={`/store/${store.slug}/cart`}
                    className="w-9 h-9 flex items-center justify-center transition-colors"
                    style={{ color: 'var(--sf-foreground)' }}
                    aria-label="Cart"
                >
                    <ShoppingBag className="w-4 h-4" />
                </Link>
            </div>
        </nav>
    )
}