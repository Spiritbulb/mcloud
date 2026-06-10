'use client'

// components/store/blog-post-shell.tsx
// This file has NO static imports of react-markdown, framer-motion,
// or any theme component. That is intentional and load-bearing.
//
// Turbopack 16 walks the static import graph from server pages. The only
// thing that actually stops that walk is a file with no offending static
// imports — dynamic() only affects runtime bundling, not the graph walk.
// This file is that hard stop.

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { BlogPostPageProps } from '@/src/themes/types'

// ALL real imports live inside the dynamic() factory — never at the top level.
const BlogPostPageInner = dynamic(
    () => import('./post-inner'),
    {
        ssr: false,
        loading: () => (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        ),
    }
)

export function BlogPostPage(props: BlogPostPageProps & { themeId?: string }) {
    return <BlogPostPageInner {...props} />
}