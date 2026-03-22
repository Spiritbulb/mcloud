'use client'

// components/store/Storefront.tsx
// Same fix as BlogPage.tsx — theme files import framer-motion, so they must
// be behind dynamic() to stay out of the server component import graph.

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { StoreFrontProps } from '@/src/themes/types'

const Spinner = () => (
    <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
)

const THEMES: Record<string, React.ComponentType<StoreFrontProps>> = {
    classic: dynamic(() => import('@/src/themes/classic/StoreFront'), { ssr: false, loading: Spinner }),
    noir: dynamic(() => import('@/src/themes/noir/StoreFront'), { ssr: false, loading: Spinner }),
    minimal: dynamic(() => import('@/src/themes/minimal/StoreFront'), { ssr: false, loading: Spinner }),
    photography: dynamic(() => import('@/src/themes/photography/StoreFront'), { ssr: false, loading: Spinner }),
    portfolio: dynamic(() => import('@/src/themes/portfolio/StoreFront'), { ssr: false, loading: Spinner }),
    services: dynamic(() => import('@/src/themes/services/StoreFront'), { ssr: false, loading: Spinner }),
    restaurant: dynamic(() => import('@/src/themes/restaurant/StoreFront'), { ssr: false, loading: Spinner }),
}

export default function StoreFront(props: StoreFrontProps) {
    const themeId = (props.store.settings as any)?.themeId ?? 'classic'
    const Component = THEMES[themeId] ?? THEMES.classic
    return <Component {...props} />
}