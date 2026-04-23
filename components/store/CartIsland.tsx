'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'
import { ShoppingBag, Loader2, Package } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'

function CartButton({
    productId,
    productName,
    productPrice,
    productImage,
    inStock,
}: {
    productId: string
    productName: string
    productPrice: number
    productImage: string
    inStock: boolean
}) {
    const { addToCart } = useCart()
    const [loading, setLoading] = useState(false)

    if (!inStock) {
        return (
            <span className="sf-badge-oos inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium flex-shrink-0">
                <Package className="w-3 h-3" />
                Sold Out
            </span>
        )
    }

    const handle = async () => {
        setLoading(true)
        try {
            addToCart({
                variantId: productId,
                productId,
                name: productName,
                price: productPrice,
                image: productImage,
                quantity: 1,
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handle}
            disabled={loading}
            className="sf-btn-primary flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
            style={{ borderRadius: 'var(--sf-border-radius)' }}
        >
            {loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <ShoppingBag className="w-3.5 h-3.5" />
            }
            Add to Cart
        </button>
    )
}

export default function CartIsland() {
    const [mounts, setMounts] = useState<
        { el: Element; props: React.ComponentProps<typeof CartButton> }[]
    >([])
    const pathname = usePathname()

    useEffect(() => {
        const islands = document.querySelectorAll('[data-cart-island]')
        const collected: typeof mounts = []
        islands.forEach((el) => {
            const d = (el as HTMLElement).dataset
            collected.push({
                el,
                props: {
                    productId: d.productId!,
                    productName: d.productName!,
                    productPrice: parseFloat(d.productPrice!),
                    productImage: d.productImage ?? '',
                    inStock: d.inStock === 'true',
                },
            })
        })
        setMounts(collected)
    }, [pathname])

    return (
        <>
            {mounts.map(({ el, props }) =>
                createPortal(<CartButton key={props.productId} {...props} />, el)
            )}
        </>
    )
}