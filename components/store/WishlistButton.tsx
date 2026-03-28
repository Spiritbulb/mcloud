// components/store/WishlistButton.tsx
'use client'

import { Heart } from 'lucide-react'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { useParams, useRouter } from 'next/navigation'

export function WishlistButton({ productId, storeId }: { productId: string; storeId: string | null }) {
    const { user } = useCustomerAuth()
    const { isWishlisted, toggle } = useWishlist()
    const params = useParams<{ slug: string }>()
    const router = useRouter()

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

    return (
        <button
            onClick={handleClick}
            className={`w-8 h-8 flex items-center justify-center border transition-colors ${wishlisted ? 'bg-black border-black' : 'bg-white border-gray-200 hover:border-black'
                }`}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
            <Heart className={`w-4 h-4 transition-colors ${wishlisted ? 'fill-white text-white' : 'text-gray-400'}`} />
        </button>
    )
}