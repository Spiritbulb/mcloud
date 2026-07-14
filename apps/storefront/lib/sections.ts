// lib/sections.ts
// Storefront-side registry: maps a page section `type` to the repo Liquid
// section template that renders it and the slice of render context it needs.
// @mcloud/liquid stays a dumb renderer; this file holds the storefront's
// knowledge of what data each section consumes. Adding a section type = a new
// entry here + a .liquid file in packages/liquid.

import { getVertical } from '@mcloud/verticals'

export type SectionType =
  | 'hero'
  | 'collections'
  | 'featured'
  | 'all-products'
  | 'mission'
  | 'programs'
  | 'impact'
  | 'contact'
  | 'campaigns'

export interface PageSection {
  type: string
  settings?: Record<string, unknown>
}

export interface PageRenderContext {
  store: unknown
  products: unknown[]
  collections: unknown[]
  featuredProducts: unknown[]
  campaigns: unknown[]
}

export interface SectionDef {
  templateKey: string
  pickContext: (ctx: PageRenderContext) => Record<string, unknown>
}

export const SECTION_REGISTRY: Record<SectionType, SectionDef> = {
  hero: {
    templateKey: 'classic/sections/hero',
    // Campaigns too: on a non-commerce site the hero CTA opens the donate flow
    // for the lead campaign instead of scrolling to products.
    pickContext: (ctx) => ({ store: ctx.store, campaigns: ctx.campaigns }),
  },
  collections: {
    templateKey: 'classic/sections/collections-grid',
    pickContext: (ctx) => ({ store: ctx.store, collections: ctx.collections }),
  },
  featured: {
    templateKey: 'classic/sections/featured-products',
    pickContext: (ctx) => ({ store: ctx.store, products: ctx.featuredProducts }),
  },
  'all-products': {
    templateKey: 'classic/sections/all-products',
    pickContext: (ctx) => ({ store: ctx.store, products: ctx.products }),
  },
  mission: {
    templateKey: 'classic/sections/mission',
    pickContext: (ctx) => ({ store: ctx.store }),
  },
  programs: {
    templateKey: 'classic/sections/programs',
    pickContext: (ctx) => ({ store: ctx.store }),
  },
  impact: {
    templateKey: 'classic/sections/impact',
    pickContext: (ctx) => ({ store: ctx.store }),
  },
  contact: {
    templateKey: 'classic/sections/contact',
    pickContext: (ctx) => ({ store: ctx.store }),
  },
  campaigns: {
    templateKey: 'classic/sections/campaigns',
    pickContext: (ctx) => ({ store: ctx.store, campaigns: ctx.campaigns }),
  },
}

/**
 * The Home page's default section list for a store's vertical. Used as the
 * fallback when a store has no seeded `pages` row. Unknown/null type → shop.
 */
export function defaultHomeSections(storeType?: string | null): PageSection[] {
  const home = getVertical(storeType).defaultPages.find((p) => p.slug === '')
  return (home?.sections ?? []).map((s) => ({ type: s.type }))
}

/** Back-compat: the shop Home section list (existing callers/tests). */
export const DEFAULT_HOME_SECTIONS: PageSection[] = defaultHomeSections('shop')
