'use client'

// components/store/blog-post-inner.tsx
// Owns all the static imports of theme components + react-markdown.
// Only ever loaded via dynamic() from blog-post-shell.tsx — never
// imported statically from any server-reachable file.

import ClassicBlogPostPage from '@/src/themes/classic/BlogPostPage'
import NoirBlogPostPage from '@/src/themes/noir/BlogPostPage'
import MinimalBlogPostPage from '@/src/themes/minimal/BlogPostPage'
import PhotographyBlogPostPage from '@/src/themes/photography/BlogPostPage'
import PortfolioBlogPostPage from '@/src/themes/portfolio/BlogPostPage'
import ServicesBlogPostPage from '@/src/themes/services/BlogPostPage'
import RestaurantBlogPostPage from '@/src/themes/restaurant/BlogPostPage'
import type { BlogPostPageProps } from '@/src/themes/types'

const THEMES: Record<string, React.ComponentType<BlogPostPageProps>> = {
    classic: ClassicBlogPostPage,
    noir: NoirBlogPostPage,
    minimal: MinimalBlogPostPage,
    photography: PhotographyBlogPostPage,
    portfolio: PortfolioBlogPostPage,
    services: ServicesBlogPostPage,
    restaurant: RestaurantBlogPostPage,
}

export default function BlogPostInner({ themeId, ...props }: BlogPostPageProps & { themeId?: string }) {
    const Component = THEMES[themeId as keyof typeof THEMES] ?? THEMES.classic
    return <Component {...props} />
}