'use client'

// components/store/blog-list-inner.tsx
// Owns all static imports of theme components + framer-motion.
// Only ever loaded via dynamic() from blog-list-shell.tsx.

import ClassicBlogListPage from '@/src/themes/classic/BlogListPage'
import NoirBlogListPage from '@/src/themes/noir/BlogListPage'
import MinimalBlogListPage from '@/src/themes/minimal/BlogListPage'
import type { BlogListPageProps } from '@/src/themes/types'

const THEMES = {
    classic: ClassicBlogListPage,
    noir: NoirBlogListPage,
    minimal: MinimalBlogListPage,
}

export default function BlogListInner({ themeId, ...props }: BlogListPageProps & { themeId?: string }) {
    const Component = THEMES[themeId as keyof typeof THEMES] ?? THEMES.classic
    return <Component {...props} />
}