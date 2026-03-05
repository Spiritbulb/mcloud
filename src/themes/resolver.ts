// Theme resolver — maps a themeId to the set of page components for that theme.
// Add new themes here when they are created.

import type { ComponentType } from 'react'
import type {
    StoreFrontProps,
    ProductsPageProps,
    CartPageProps,
    ProductDetailPageProps,
} from './types'

export interface ThemeComponents {
    StoreFront: ComponentType<StoreFrontProps>
    ProductsPage: ComponentType<ProductsPageProps>
    CartPage: ComponentType<CartPageProps>
    ProductDetailPage: ComponentType<ProductDetailPageProps>
}

// Lazy-loaded theme bundles. Using dynamic imports keeps each theme's code
// out of the initial bundle if you ever code-split at the route level.
const themes: Record<string, () => Promise<ThemeComponents>> = {
    classic: () =>
        Promise.all([
            import('./classic/StoreFront'),
            import('./classic/ProductsPage'),
            import('./classic/CartPage'),
            import('./classic/ProductDetailPage'),
        ]).then(([sf, pp, cp, pdp]) => ({
            StoreFront: sf.default,
            ProductsPage: pp.default,
            CartPage: cp.default,
            ProductDetailPage: pdp.default,
        })),

    noir: () =>
        Promise.all([
            import('./noir/StoreFront'),
            import('./noir/ProductsPage'),
            import('./noir/CartPage'),
            import('./noir/ProductDetailPage'),
        ]).then(([sf, pp, cp, pdp]) => ({
            StoreFront: sf.default,
            ProductsPage: pp.default,
            CartPage: cp.default,
            ProductDetailPage: pdp.default,
        })),

    minimal: () =>
        Promise.all([
            import('./minimal/StoreFront'),
            import('./minimal/ProductsPage'),
            import('./minimal/CartPage'),
            import('./minimal/ProductDetailPage'),
        ]).then(([sf, pp, cp, pdp]) => ({
            StoreFront: sf.default,
            ProductsPage: pp.default,
            CartPage: cp.default,
            ProductDetailPage: pdp.default,
        })),
}

export async function resolveTheme(themeId: string): Promise<ThemeComponents> {
    const loader = themes[themeId] ?? themes.classic
    return loader()
}

export type { StoreFrontProps, ProductsPageProps, CartPageProps, ProductDetailPageProps }