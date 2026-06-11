// components/store/WishlistButton.tsx
'use client'

import { Heart } from 'lucide-react'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { useParams, useRouter } from 'next/navigation'
import { useIsMobile } from '@mcloud/ui/use-mobile'

export function WishlistButton({ productId, storeId, size }: { productId: string; storeId: string | null, size?: string }) {
    const { user } = useCustomerAuth()
    const { isWishlisted, toggle } = useWishlist()
    const params = useParams<{ slug: string }>()
    const router = useRouter()
    const isMobile = useIsMobile()

    const wishlisted = isWishlisted(productId)

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!user) {
            router.push(`/store/${params.slug}/account/login`)
            return
        }
        if (storeId) {
            toggle(productId, storeId)
        }
    }

    const sizeClass = size === 'lg' ? 'w-full h-10 rounded-lg' : 'w-8 h-8 rounded-full'

    return (

        <button
            onClick={handleClick}
            className={`flex ${sizeClass} items-center justify-center transition-colors cursor-pointer ${wishlisted ? 'bg-black' : 'bg-white'
                }`}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
            <Heart className={`transition-colors ${wishlisted ? 'fill-red-500 text-red-500' : 'text-white fill-white cursor-pointer'} ${size === 'lg' ? 'w-4 h-4' : 'w-4 h-4'}`} />
            {size === 'lg' && !isMobile && (
                <span className="ml-2">{wishlisted ? 'Saved' : 'Save'}</span>
            )}
        </button>

    )
}