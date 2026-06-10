'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { WishlistButton } from '@/components/store/WishlistButton'
import { usePathname } from 'next/navigation'

export default function WishlistIsland() {
    const [mounts, setMounts] = useState<
        { el: Element; productId: string; storeId: string }[]
    >([])
    const pathname = usePathname()

    useEffect(() => {
        const islands = document.querySelectorAll('[data-wishlist-island]')
        const collected: typeof mounts = []
        islands.forEach((el) => {
            const d = (el as HTMLElement).dataset
            collected.push({
                el,
                productId: d.productId!,
                storeId: d.storeId!,
            })
        })
        setMounts(collected)
    }, [pathname])

    return (
        <>
            {mounts.map(({ el, productId, storeId }) =>
                createPortal(
                    <WishlistButton key={productId} productId={productId} storeId={storeId} />,
                    el
                )
            )}
        </>
    )
}