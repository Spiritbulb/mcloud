// app/store/[slug]/account/layout.tsx
'use client'

import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { use } from 'react'

const PUBLIC_PATHS = ['/login', '/register']

export default function AccountLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ slug: string }>
}) {
    const { slug } = use(params)
    const { user, loading } = useCustomerAuth()
    const router = useRouter()
    const pathname = usePathname()
    const isPublicPath = PUBLIC_PATHS.some(p => pathname.endsWith(p))

    useEffect(() => {
        if (loading) return
        if (!user && !isPublicPath) router.replace(`/store/${slug}/account/login`)
        if (user && isPublicPath) router.replace(`/store/${slug}/account/dashboard`)
    }, [user, loading, isPublicPath, slug])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="h-7 w-7 rounded-full border-2 border-black border-t-transparent animate-spin" />
        </div>
    )

    // Don't flash protected content before redirect fires
    if (!user && !isPublicPath) return null

    return <>{children}</>
}