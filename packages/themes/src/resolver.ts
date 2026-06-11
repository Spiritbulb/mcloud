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
    ServicesPageProps,
    ServiceDetailsPageProps,
} from './types'

export interface ThemeComponents {
    StoreFront: ComponentType<StoreFrontProps>
    ProductsPage: ComponentType<ProductsPageProps>
    CartPage: ComponentType<CartPageProps>
    ProductDetailPage: ComponentType<ProductDetailPageProps>
    BlogListPage: ComponentType<BlogListPageProps>
    BlogPostPage: ComponentType<BlogPostPageProps>
    ServicesPage: ComponentType<ServicesPageProps>
    ServiceDetailPage: ComponentType<ServiceDetailsPageProps>
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
            import('./classic/ServicesPage'),
            import('./classic/ServiceDetailsPage'),
        ]).then(([sf, pp, cp, pdp, blp, bpp, svp, sdp]) => ({
            StoreFront: sf.default,
            ProductsPage: pp.default,
            CartPage: cp.default,
            ProductDetailPage: pdp.default,
            BlogListPage: blp.default,
            BlogPostPage: bpp.default,
            ServicesPage: svp.default,
            ServiceDetailPage: sdp.default,
        })),
}
export async function resolveTheme(themeId: string): Promise<ThemeComponents> {
    const loader = themes[themeId] ?? themes.classic
    return loader()
}

export type {
    StoreFrontProps, ProductsPageProps, CartPageProps,
    ProductDetailPageProps, BlogListPageProps, BlogPostPageProps,
    ServicesPageProps, ServiceDetailsPageProps,
}