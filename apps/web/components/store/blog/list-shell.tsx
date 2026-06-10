'use client'

// components/store/blog-list-shell.tsx
// Same pattern as blog-post-shell.tsx — hard stop for Turbopack's graph walk.
// No static imports of framer-motion or react-markdown here.

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { BlogListPageProps } from '@/src/themes/types'

const BlogListPageInner = dynamic(
    () => import('./list-inner'),
    {
        ssr: false,
        loading: () => (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        ),
    }
)

export function BlogListPage(props: BlogListPageProps & { themeId?: string }) {
    return <BlogListPageInner {...props} />
}