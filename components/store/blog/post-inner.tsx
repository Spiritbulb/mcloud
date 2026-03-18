'use client'

// components/store/blog-post-inner.tsx
// Owns all the static imports of theme components + react-markdown.
// Only ever loaded via dynamic() from blog-post-shell.tsx — never
// imported statically from any server-reachable file.

import ClassicBlogPostPage from '@/src/themes/classic/BlogPostPage'
import NoirBlogPostPage from '@/src/themes/noir/BlogPostPage'
import MinimalBlogPostPage from '@/src/themes/minimal/BlogPostPage'
import type { BlogPostPageProps } from '@/src/themes/types'

const THEMES = {
    classic: ClassicBlogPostPage,
    noir: NoirBlogPostPage,
    minimal: MinimalBlogPostPage,
}

export default function BlogPostInner({ themeId, ...props }: BlogPostPageProps & { themeId?: string }) {
    const Component = THEMES[themeId as keyof typeof THEMES] ?? THEMES.classic
    return <Component {...props} />
}