'use client'

// components/store/blog-list-inner.tsx
// Owns all static imports of theme components + framer-motion.
// Only ever loaded via dynamic() from blog-list-shell.tsx.

import ClassicBlogListPage from '@/src/themes/classic/BlogListPage'
import NoirBlogListPage from '@/src/themes/noir/BlogListPage'
import MinimalBlogListPage from '@/src/themes/minimal/BlogListPage'
import PhotographyBlogListPage from '@/src/themes/photography/BlogListPage'
import PortfolioBlogListPage from '@/src/themes/portfolio/BlogListPage'
import ServicesBlogListPage from '@/src/themes/services/BlogListPage'
import RestaurantBlogListPage from '@/src/themes/restaurant/BlogListPage'
import type { BlogListPageProps } from '@/src/themes/types'

const THEMES: Record<string, React.ComponentType<BlogListPageProps>> = {
    classic: ClassicBlogListPage,
    noir: NoirBlogListPage,
    minimal: MinimalBlogListPage,
    photography: PhotographyBlogListPage,
    portfolio: PortfolioBlogListPage,
    services: ServicesBlogListPage,
    restaurant: RestaurantBlogListPage,
}

export default function BlogListInner({ themeId, ...props }: BlogListPageProps & { themeId?: string }) {
    const Component = THEMES[themeId as keyof typeof THEMES] ?? THEMES.classic
    return <Component {...props} />
}