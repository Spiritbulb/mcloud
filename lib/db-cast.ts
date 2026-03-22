// lib/db-cast.ts
// Narrow raw Supabase rows (which use the broad `Json` type for jsonb/array
// columns) into the tighter theme prop types used by storefront components.
// Call these once in each server page — never sprinkle `as any` in pages.

import type { Store, Product, ProductItem, Collection } from '@/src/themes/types'

// ─── Store ────────────────────────────────────────────────────────────────────

type RawStore = {
    id: string
    name: string
    slug: string
    description: string | null
    logo_url: string | null
    currency: string
    settings: unknown   // Supabase Json — could be null
    [key: string]: unknown
}

export function castStore(raw: RawStore): Store {
    const settings = (raw.settings && typeof raw.settings === 'object' && !Array.isArray(raw.settings))
        ? raw.settings as Record<string, unknown>
        : {}

    return {
        id: raw.id,
        name: raw.name,
        slug: raw.slug,
        description: raw.description,
        logo_url: raw.logo_url,
        currency: raw.currency,
        settings: {
            themeId: settings.themeId as string | undefined,
            heroTitle: settings.heroTitle as string | undefined,
            heroSubtitle: settings.heroSubtitle as string | undefined,
            heroImage: settings.heroImage as string | undefined,
            heroImagePath: settings.heroImagePath as string | undefined,
            logoPath: settings.logoPath as string | undefined,
            heroSlides: settings.heroSlides as Store['settings']['heroSlides'],
            socialLinks: settings.socialLinks as Store['settings']['socialLinks'],
            galleryPhotos: settings.galleryPhotos as Store['settings']['galleryPhotos'],
        },
    }
}

// ─── Product (StoreFront / featured list shape) ───────────────────────────────

type RawProduct = {
    id: string
    name: string
    slug: string
    description: string | null
    price: number
    compare_at_price: number | null
    images: unknown         // Supabase Json — actually string[]
    inventory_quantity: number | null
    track_inventory: boolean | null
}

export function castProduct(raw: RawProduct): Product {
    return {
        id: raw.id,
        name: raw.name,
        slug: raw.slug,
        description: raw.description,
        price: raw.price,
        compare_at_price: raw.compare_at_price,
        images: Array.isArray(raw.images) ? (raw.images as string[]) : [],
        inventory_quantity: raw.inventory_quantity ?? 0,
        track_inventory: raw.track_inventory ?? true,
    }
}

export function castProducts(rows: RawProduct[]): Product[] {
    return rows.map(castProduct)
}

// ─── ProductItem (ProductsPage shape — has extra fields) ─────────────────────

type RawProductItem = RawProduct & {
    is_active: boolean | null
    sku: string | null
    metadata: unknown
}

export function castProductItem(raw: RawProductItem): ProductItem {
    return {
        ...castProduct(raw),
        is_active: raw.is_active ?? true,
        sku: raw.sku,
        metadata: raw.metadata ?? {},
    }
}

export function castProductItems(rows: RawProductItem[]): ProductItem[] {
    return rows.map(castProductItem)
}

// ─── Collection ───────────────────────────────────────────────────────────────

type RawCollection = {
    id: string
    name: string
    slug: string
    description: string | null
    image_url: string | null
}

export function castCollection(raw: RawCollection): Collection {
    return {
        id: raw.id,
        name: raw.name,
        slug: raw.slug,
        description: raw.description,
        image_url: raw.image_url,
    }
}

export function castCollections(rows: RawCollection[]): Collection[] {
    return rows.map(castCollection)
}