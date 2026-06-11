// Theme registry — add new themes here
// Each theme exports: StoreFront, ProductsPage, ProductDetailPage, CartPage

export interface ThemeMeta {
    id: string
    name: string
    description: string
    preview: {
        primary: string
        background: string
        accent: string
    }
}

export const THEMES: ThemeMeta[] = [
    {
        id: 'classic',
        name: 'Classic',
        description: 'Clean editorial look with sharp lines and serif headings',
        preview: { primary: '#1c2228', background: '#ffffff', accent: '#c9a96e' },
    }
]

export type ThemeId = 'classic'