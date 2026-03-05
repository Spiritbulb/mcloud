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
    },
    {
        id: 'noir',
        name: 'Noir',
        description: 'Dark, moody luxury with gold accents',
        preview: { primary: '#e8d5b0', background: '#0a0a0b', accent: '#d4a843' },
    },
    {
        id: 'minimal',
        name: 'Minimal',
        description: 'Ultra-clean sans-serif with generous whitespace',
        preview: { primary: '#111111', background: '#fafafa', accent: '#3b82f6' },
    },
]

export type ThemeId = 'classic' | 'noir' | 'minimal'