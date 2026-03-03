import { Search, ShoppingBag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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
        <nav className="sf-nav border-b sticky top-0 z-40">
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
                        <div className="sf-logo-fallback w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold">
                            {store.name[0].toUpperCase()}
                        </div>
                    )}
                    <span className="sf-heading font-semibold text-sm hidden sm:block">
                        {store.name}
                    </span>
                </div>

                <Link href={`/store/${store.slug}/cart`}>
                    <Button variant="ghost" size="icon">
                        <ShoppingBag className="w-4 h-4" />
                    </Button>
                </Link>
            </div>
        </nav>)
}
