// lib/liquid-context.ts
// Maps the data the home page already fetches into the plain-object context the
// Liquid `classic/templates/index` template expects. The template was authored
// against exactly these shapes (see packages/liquid/themes/classic), so this is
// a thin, explicit pass-through rather than a transform.

import { getVertical } from '@mcloud/verticals'

export interface HomeContext extends Record<string, unknown> {
    store: {
        id: string
        name: string
        slug: string
        description: string | null
        logo_url: string | null
        currency: string
        settings: Record<string, unknown>
        /**
         * Does this site SELL? The vertical's flag, carried into Liquid so a
         * template can ask instead of guess.
         *
         * Templates used to infer this from data — "there are campaigns, so this
         * must be a giving site" — which is a different question and gets the
         * answer wrong whenever the data is merely absent. An NGO that has not
         * added a campaign yet is still an NGO, and must not be shown "New
         * Arrivals" and a "Shop now" button pointing at products it does not have.
         */
        commerce: boolean
        /**
         * Is this render being shown inside the Editor's preview? (Shopify calls the
         * same thing `request.design_mode`.)
         *
         * A template uses it to render an affordance a visitor must never see — most
         * importantly, an EMPTY field. A hero with no subtitle normally emits no
         * element at all, which would leave the merchant nothing to click in order
         * to write one. In the editor it renders the empty element so it can be
         * filled; on the live site it stays omitted.
         */
        editing: boolean
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
    /** stores.type. Unknown/null falls back to the shop vertical. */
    storeType?: string | null
    /** True only for a token-verified Editor preview. Never true for a visitor. */
    editing?: boolean
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
            commerce: getVertical(input.storeType).commerce,
            editing: input.editing ?? false,
        },
        products: input.products,
        collections: input.collections,
        featuredProducts: input.featuredProducts,
    }
}
