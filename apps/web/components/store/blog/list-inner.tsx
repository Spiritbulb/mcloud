'use client'

// components/store/blog-list-inner.tsx
// Owns all static imports of theme components + framer-motion.
// Only ever loaded via dynamic() from blog-list-shell.tsx.

import ClassicBlogListPage from '@mcloud/themes/classic/BlogListPage'
import type { BlogListPageProps } from '@mcloud/themes/types'

const THEMES: Record<string, React.ComponentType<BlogListPageProps>> = {
    classic: ClassicBlogListPage,
}

export default function BlogListInner({ themeId, ...props }: BlogListPageProps & { themeId?: string }) {
    const Component = THEMES[themeId as keyof typeof THEMES] ?? THEMES.classic
    return <Component {...props} />
}