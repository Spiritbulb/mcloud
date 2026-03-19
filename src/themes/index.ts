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
    {
        id: 'photography',
        name: 'Photography',
        description: 'Dark cinematic aesthetic for photographers selling prints and artwork',
        preview: { primary: '#f2f2f2', background: '#0c0c0c', accent: '#c8965a' },
    },
    {
        id: 'portfolio',
        name: 'Portfolio',
        description: 'Bold, high-impact theme for creative professionals, agencies, and designers',
        preview: { primary: '#111111', background: '#ffffff', accent: '#6366f1' },
    },
    {
        id: 'services',
        name: 'Services',
        description: 'Professional, trustworthy theme for consultants, agencies, coaches, clinics, and service businesses',
        preview: { primary: '#0f172a', background: '#f8fafc', accent: '#2563eb' },
    },
    {
        id: 'restaurant',
        name: 'Restaurant',
        description: 'Warm, inviting theme for restaurants, cafes, bakeries, and food businesses',
        preview: { primary: '#2c1810', background: '#faf7f2', accent: '#c8622a' },
    },
]

export type ThemeId = 'classic' | 'noir' | 'minimal' | 'photography' | 'portfolio' | 'services' | 'restaurant'