// themes/resolver.ts
// Maps a themeId to the full set of page components for that theme.

import type { ComponentType } from 'react'
import type {
    StoreFrontProps,
    ProductsPageProps,
    CartPageProps,
    ProductDetailPageProps,
    BlogListPageProps,
    BlogPostPageProps,
} from './types'

export interface ThemeComponents {
    StoreFront: ComponentType<StoreFrontProps>
    ProductsPage: ComponentType<ProductsPageProps>
    CartPage: ComponentType<CartPageProps>
    ProductDetailPage: ComponentType<ProductDetailPageProps>
    BlogListPage: ComponentType<BlogListPageProps>
    BlogPostPage: ComponentType<BlogPostPageProps>
}

const themes: Record<string, () => Promise<ThemeComponents>> = {
    classic: () =>
        Promise.all([
            import('./classic/StoreFront'),
            import('./classic/ProductsPage'),
            import('./classic/CartPage'),
            import('./classic/ProductDetailPage'),
            import('./classic/BlogListPage'),
            import('./classic/BlogPostPage'),
        ]).then(([sf, pp, cp, pdp, blp, bpp]) => ({
            StoreFront: sf.default,
            ProductsPage: pp.default,
            CartPage: cp.default,
            ProductDetailPage: pdp.default,
            BlogListPage: blp.default,
            BlogPostPage: bpp.default,
        })),

    noir: () =>
        Promise.all([
            import('./noir/StoreFront'),
            import('./noir/ProductsPage'),
            import('./noir/CartPage'),
            import('./noir/ProductDetailPage'),
            import('./noir/BlogListPage'),
            import('./noir/BlogPostPage'),
        ]).then(([sf, pp, cp, pdp, blp, bpp]) => ({
            StoreFront: sf.default,
            ProductsPage: pp.default,
            CartPage: cp.default,
            ProductDetailPage: pdp.default,
            BlogListPage: blp.default,
            BlogPostPage: bpp.default,
        })),

    minimal: () =>
        Promise.all([
            import('./minimal/StoreFront'),
            import('./minimal/ProductsPage'),
            import('./minimal/CartPage'),
            import('./minimal/ProductDetailPage'),
            import('./minimal/BlogListPage'),
            import('./minimal/BlogPostPage'),
        ]).then(([sf, pp, cp, pdp, blp, bpp]) => ({
            StoreFront: sf.default,
            ProductsPage: pp.default,
            CartPage: cp.default,
            ProductDetailPage: pdp.default,
            BlogListPage: blp.default,
            BlogPostPage: bpp.default,
        })),

    photography: () =>
        Promise.all([
            import('./photography/StoreFront'),
            import('./photography/ProductsPage'),
            import('./photography/CartPage'),
            import('./photography/ProductDetailPage'),
            import('./photography/BlogListPage'),
            import('./photography/BlogPostPage'),
        ]).then(([sf, pp, cp, pdp, blp, bpp]) => ({
            StoreFront: sf.default,
            ProductsPage: pp.default,
            CartPage: cp.default,
            ProductDetailPage: pdp.default,
            BlogListPage: blp.default,
            BlogPostPage: bpp.default,
        })),

    portfolio: () =>
        Promise.all([
            import('./portfolio/StoreFront'),
            import('./portfolio/ProductsPage'),
            import('./portfolio/CartPage'),
            import('./portfolio/ProductDetailPage'),
            import('./portfolio/BlogListPage'),
            import('./portfolio/BlogPostPage'),
        ]).then(([sf, pp, cp, pdp, blp, bpp]) => ({
            StoreFront: sf.default,
            ProductsPage: pp.default,
            CartPage: cp.default,
            ProductDetailPage: pdp.default,
            BlogListPage: blp.default,
            BlogPostPage: bpp.default,
        })),

    services: () =>
        Promise.all([
            import('./services/StoreFront'),
            import('./services/ProductsPage'),
            import('./services/CartPage'),
            import('./services/ProductDetailPage'),
            import('./services/BlogListPage'),
            import('./services/BlogPostPage'),
        ]).then(([sf, pp, cp, pdp, blp, bpp]) => ({
            StoreFront: sf.default,
            ProductsPage: pp.default,
            CartPage: cp.default,
            ProductDetailPage: pdp.default,
            BlogListPage: blp.default,
            BlogPostPage: bpp.default,
        })),

    restaurant: () =>
        Promise.all([
            import('./restaurant/StoreFront'),
            import('./restaurant/ProductsPage'),
            import('./restaurant/CartPage'),
            import('./restaurant/ProductDetailPage'),
            import('./restaurant/BlogListPage'),
            import('./restaurant/BlogPostPage'),
        ]).then(([sf, pp, cp, pdp, blp, bpp]) => ({
            StoreFront: sf.default,
            ProductsPage: pp.default,
            CartPage: cp.default,
            ProductDetailPage: pdp.default,
            BlogListPage: blp.default,
            BlogPostPage: bpp.default,
        })),
}

export async function resolveTheme(themeId: string): Promise<ThemeComponents> {
    const loader = themes[themeId] ?? themes.classic
    return loader()
}

export type {
    StoreFrontProps, ProductsPageProps, CartPageProps,
    ProductDetailPageProps, BlogListPageProps, BlogPostPageProps,
}
