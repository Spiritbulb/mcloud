// lib/sections.ts
// Storefront-side registry: maps a page section `type` to the repo Liquid
// section template that renders it and the slice of render context it needs.
// @mcloud/liquid stays a dumb renderer; this file holds the storefront's
// knowledge of what data each section consumes. Adding a section type = a new
// entry here + a .liquid file in packages/liquid.

export type SectionType = 'hero' | 'collections' | 'featured' | 'all-products'

export interface PageSection {
  type: string
  settings?: Record<string, unknown>
}

export interface PageRenderContext {
  store: unknown
  products: unknown[]
  collections: unknown[]
  featuredProducts: unknown[]
}

export interface SectionDef {
  templateKey: string
  pickContext: (ctx: PageRenderContext) => Record<string, unknown>
}

export const SECTION_REGISTRY: Record<SectionType, SectionDef> = {
  hero: {
    templateKey: 'classic/sections/hero',
    pickContext: (ctx) => ({ store: ctx.store }),
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
}

export const DEFAULT_HOME_SECTIONS: PageSection[] = [
  { type: 'hero' },
  { type: 'collections' },
  { type: 'featured' },
  { type: 'all-products' },
]
