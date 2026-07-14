'use client'

import { getVertical } from '@mcloud/verticals'
import { ShoppingBag, Heart, User, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { useStoreHref } from '@/contexts/StoreContext'
import { useWishlist } from '@/contexts/WishlistContext'

interface Store {
    id: string
    name: string
    slug: string
    logo_url: string | null
    type?: string | null
}

/** A published page of this store, linked from the nav. */
interface NavPage {
    slug: string
    title: string
}

function WishlistBadge({ count }: { count: number }) {
    if (count === 0) return null
    return (
        <span
            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center font-medium leading-none"
            style={{ backgroundColor: 'var(--sf-foreground)', color: 'var(--sf-background)' }}
        >
            {count > 9 ? '9+' : count}
        </span>
    )
}

export default function StoreNav({ store, pages = [] }: { store: Store; pages?: NavPage[] }) {
    const { cartItems } = useCart()
    const { user } = useCustomerAuth()
    const { wishlistIds } = useWishlist()
    const href = useStoreHref()
    const [menuOpen, setMenuOpen] = useState(false)
    // Non-commerce verticals (NGO) have no basket or customer account — donations
    // go through the campaigns section, so the shop chrome is dead weight there.
    const commerce = getVertical(store.type).commerce

    return (
        <nav className="sf-nav sticky top-0 z-40">
            <div className="container mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">

                <Link href={href('/')} className="flex items-center gap-3">
                    {store.logo_url ? (
                        <img
                            src={store.logo_url}
                            alt={store.name}
                            className="object-cover h-10 w-auto"
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
                </Link>

                {/* The store's own published pages (About, Contact, ...). Without
                    these, an authored page is reachable only by typing its URL.
                    On phones they move into the drawer below: most of this
                    audience is on mobile, so they must not simply vanish. */}
                {pages.length > 0 && (
                    <div className="hidden md:flex items-center gap-6 mr-auto ml-8">
                        {pages.map((p) => (
                            <Link
                                key={p.slug}
                                href={href(`/p/${p.slug}`)}
                                className="text-sm transition-opacity hover:opacity-70"
                                style={{ color: 'var(--sf-foreground)' }}
                            >
                                {p.title}
                            </Link>
                        ))}
                    </div>
                )}

                {pages.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setMenuOpen((o) => !o)}
                        className="md:hidden w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-70 mr-auto ml-2 bg-transparent border-0 p-0 appearance-none cursor-pointer"
                        // A control, not a call to action: it must not compete with
                        // the Donate CTA. Without an explicit transparent background
                        // the button picks up the theme accent and reads as primary.
                        style={{ color: 'var(--sf-foreground)', background: 'transparent' }}
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                    >
                        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                )}

                {commerce && (
                    <div className="flex items-center gap-1">
                        <Link
                            href={href('/account/dashboard')}
                            className="relative w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-70"
                            style={{ color: 'var(--sf-foreground)' }}
                            aria-label="Wishlist"
                        >
                            <Heart className="w-4 h-4" />
                            <WishlistBadge count={wishlistIds.size} />
                        </Link>

                        <Link
                            href={href(`/account/${user ? 'dashboard' : 'login'}`)}
                            className="relative w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-70"
                            style={{ color: 'var(--sf-foreground)' }}
                            aria-label={user ? 'My account' : 'Sign in'}
                        >
                            <User className="w-4 h-4" />
                            {user && (
                                <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-500" />
                            )}
                        </Link>

                        <Link
                            href={href('/cart')}
                            className="relative w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-70"
                            style={{ color: 'var(--sf-foreground)' }}
                            aria-label="Cart"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            {cartItems.length > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-xs font-medium text-white" >
                                    {cartItems.length}
                                </span>
                            )}
                        </Link>
                    </div>
                )}

            </div>

            {/* Mobile drawer. This is the only way to reach an authored page on a
                phone, so it is not optional chrome. */}
            {menuOpen && pages.length > 0 && (
                <div
                    className="md:hidden border-t"
                    style={{
                        borderColor: 'var(--sf-border)',
                        backgroundColor: 'var(--sf-background)',
                    }}
                >
                    <div className="container mx-auto px-4 py-2 flex flex-col">
                        {pages.map((p) => (
                            <Link
                                key={p.slug}
                                href={href(`/p/${p.slug}`)}
                                onClick={() => setMenuOpen(false)}
                                className="py-3 text-sm transition-opacity hover:opacity-70"
                                style={{ color: 'var(--sf-foreground)' }}
                            >
                                {p.title}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    )
}