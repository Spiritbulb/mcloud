'use client'

// components/store/BlogPage.tsx
// Theme dispatcher for blog pages.
//
// WHY dynamic() here:
// The theme components import framer-motion, which triggers Turbopack's
// "negative timestamp" error when statically imported from a file that is
// reachable from a server component. Wrapping each theme in dynamic() with
// ssr:false breaks the static import chain and puts them in client-only chunks.

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { BlogListPageProps, BlogPostPageProps } from '@/src/themes/types'

const Spinner = () => (
    <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
)

// ─── List page themes ─────────────────────────────────────────────────────────

const LIST_THEMES = {
    classic: dynamic(() => import('@/src/themes/classic/BlogListPage'), { ssr: false, loading: Spinner }),
    noir: dynamic(() => import('@/src/themes/noir/BlogListPage'), { ssr: false, loading: Spinner }),
    minimal: dynamic(() => import('@/src/themes/minimal/BlogListPage'), { ssr: false, loading: Spinner }),
} satisfies Record<string, React.ComponentType<BlogListPageProps>>

export function BlogListPage({ themeId, ...props }: BlogListPageProps & { themeId?: string }) {
    const Component = LIST_THEMES[themeId as keyof typeof LIST_THEMES] ?? LIST_THEMES.classic
    return <Component {...props} />
}

// ─── Post page themes ─────────────────────────────────────────────────────────

const POST_THEMES = {
    classic: dynamic(() => import('@/src/themes/classic/BlogPostPage'), { ssr: false, loading: Spinner }),
    noir: dynamic(() => import('@/src/themes/noir/BlogPostPage'), { ssr: false, loading: Spinner }),
    minimal: dynamic(() => import('@/src/themes/minimal/BlogPostPage'), { ssr: false, loading: Spinner }),
} satisfies Record<string, React.ComponentType<BlogPostPageProps>>

export function BlogPostPage({ themeId, ...props }: BlogPostPageProps & { themeId?: string }) {
    const Component = POST_THEMES[themeId as keyof typeof POST_THEMES] ?? POST_THEMES.classic
    return <Component {...props} />
}