// app/(storefront)/store/[slug]/account/layout.tsx
'use client'

import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { useStoreHref } from '@/contexts/StoreContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

const PUBLIC_PATHS = ['/login', '/register']

export default function AccountLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, loading } = useCustomerAuth()
    const href = useStoreHref()
    const router = useRouter()
    const pathname = usePathname()
    const isPublicPath = PUBLIC_PATHS.some(p => pathname.endsWith(p))

    useEffect(() => {
        if (loading) return
        if (!user && !isPublicPath) router.replace(href('/account/login'))
        if (user && isPublicPath) router.replace(href('/account/dashboard'))
    }, [user, loading, isPublicPath, href, router])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="h-7 w-7 rounded-full border-2 border-black border-t-transparent animate-spin" />
        </div>
    )

    // Don't flash protected content before redirect fires
    if (!user && !isPublicPath) return null

    return <>{children}</>
}