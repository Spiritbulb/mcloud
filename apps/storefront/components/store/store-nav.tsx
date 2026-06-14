'use client'

import { ShoppingBag, Heart, User } from 'lucide-react'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { useStoreHref } from '@/contexts/StoreContext'
import { useWishlist } from '@/contexts/WishlistContext'

interface Store {
    id: string
    name: string
    slug: string
    logo_url: string | null
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

export default function StoreNav({ store }: { store: Store }) {
    const { cartItems } = useCart()
    const { user } = useCustomerAuth()
    const { wishlistIds } = useWishlist()
    const href = useStoreHref()

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

            </div>
        </nav>
    )
}