// @mcloud/verticals — vertical descriptors keyed by stores.type.
// A "vertical" (shop, ngo) names a default page set: the pages seeded when a
// store of that type is created, and the fallback section list the storefront
// renders when a store has no page row. This package is Liquid-free — it only
// NAMES section types (strings); the storefront registry maps names to templates.

export type VerticalId = 'shop' | 'ngo'

/** Names a section type; mapped to a Liquid template by the storefront registry. */
export interface SeedSection {
  type: string
}

export interface SeedPage {
  slug: string // '' = home
  title: string
  position: number
  sections: SeedSection[]
}

export interface Vertical {
  id: VerticalId
  label: string
  defaultPages: SeedPage[]
}

export const VERTICALS: Record<VerticalId, Vertical> = {
  shop: {
    id: 'shop',
    label: 'Shop',
    defaultPages: [
      {
        slug: '',
        title: 'Home',
        position: 0,
        sections: [{ type: 'hero' }, { type: 'collections' }, { type: 'featured' }, { type: 'all-products' }],
      },
    ],
  },
  ngo: {
    id: 'ngo',
    label: 'NGO',
    defaultPages: [
      {
        slug: '',
        title: 'Home',
        position: 0,
        sections: [{ type: 'mission' }, { type: 'programs' }, { type: 'impact' }, { type: 'campaigns' }, { type: 'contact' }],
      },
    ],
  },
}

export function isVerticalId(type: string): type is VerticalId {
  return type === 'shop' || type === 'ngo'
}

/** Resolve a store type to its vertical. Unknown/null/undefined → shop. Never throws. */
export function getVertical(type: string | null | undefined): Vertical {
  if (type && isVerticalId(type)) return VERTICALS[type]
  return VERTICALS.shop
}
