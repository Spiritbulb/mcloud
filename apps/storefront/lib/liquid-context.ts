// lib/liquid-context.ts
// Maps the data the home page already fetches into the plain-object context the
// Liquid `classic/templates/index` template expects. The template was authored
// against exactly these shapes (see packages/liquid/themes/classic), so this is
// a thin, explicit pass-through rather than a transform.

export interface HomeContext {
    store: {
        id: string
        name: string
        slug: string
        description: string | null
        logo_url: string | null
        currency: string
        settings: Record<string, unknown>
    }
    products: unknown[]
    collections: unknown[]
    featuredProducts: unknown[]
}

interface Input {
    store: {
        id: string; name: string; slug: string; description: string | null
        logo_url: string | null; currency: string; settings?: Record<string, unknown> | null
    }
    products: unknown[]
    collections: unknown[]
    featuredProducts: unknown[]
}

export function buildHomeContext(input: Input): HomeContext {
    return {
        store: {
            id: input.store.id,
            name: input.store.name,
            slug: input.store.slug,
            description: input.store.description,
            logo_url: input.store.logo_url,
            currency: input.store.currency,
            settings: input.store.settings ?? {},
        },
        products: input.products,
        collections: input.collections,
        featuredProducts: input.featuredProducts,
    }
}
