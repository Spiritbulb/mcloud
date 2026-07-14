// lib/sections.ts
// Storefront-side registry: maps a page section `type` to the repo Liquid
// section template that renders it and the slice of render context it needs.
// @mcloud/liquid stays a dumb renderer; this file holds the storefront's
// knowledge of what data each section consumes. Adding a section type = a new
// entry here + a .liquid file in packages/liquid.

import { getVertical } from '@mcloud/verticals'
import type { SettingField } from '@mcloud/verticals'
import { heroSlides, authoredSlides } from './hero'

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
  /** Human name, shown in the Editor rail. */
  label: string
  /**
   * What a merchant may configure on this section. The admin GENERATES its form
   * from this: adding a field here grows the UI with no admin code.
   *
   * A `default` MUST equal the string the template currently hardcodes, or every
   * existing store's copy changes the moment this ships.
   */
  schema?: readonly SettingField[]
}

/** Heading + eyebrow, the two things every section shows. */
const copy = (heading: string, eyebrow: string): readonly SettingField[] => [
  { id: 'heading', type: 'text', label: 'Heading', default: heading },
  { id: 'eyebrow', type: 'text', label: 'Label above heading', default: eyebrow },
]

export const SECTION_REGISTRY: Record<SectionType, SectionDef> = {
  hero: {
    templateKey: 'classic/sections/hero',
    label: 'Hero',
    // The hero is ONE shape: a list of slides (a single-image hero is a list of
    // one). heroSlides() normalises whatever a store actually has — including the
    // legacy flat keys — so the template has no branch to get wrong. Campaigns come
    // too: on a non-commerce site the CTA opens the donate flow.
    pickContext: (ctx) => {
      const store = ctx.store as {
        settings?: Record<string, unknown> | null
        name?: string
        description?: string | null
        commerce?: boolean
      }
      return {
        store: ctx.store,
        campaigns: ctx.campaigns,
        // What the visitor SEES: defaults substituted in.
        slides: heroSlides({
          settings: store?.settings,
          storeName: store?.name ?? '',
          storeDescription: store?.description,
          commerce: !!store?.commerce,
          hasCampaign: Array.isArray(ctx.campaigns) && ctx.campaigns.length > 0,
        }),
        // What is actually STORED: no defaults. The two differ, and conflating them
        // is the trap — a hero with no title DISPLAYS the store's name, so reporting
        // the rendered value would save "KFS" as though the merchant had typed it,
        // and "Donate" as their button text. The template renders `slides` and
        // reports `authored`.
        authored: authoredSlides(store?.settings),
      }
    },
    // The hero's copy lives in the slides, not in section config, so it declares no
    // heading/eyebrow. Everything on it is edited in the preview.
    schema: [],
  },
  collections: {
    templateKey: 'classic/sections/collections-grid',
    label: 'Collections',
    pickContext: (ctx) => ({ store: ctx.store, collections: ctx.collections }),
    schema: [
      ...copy('Shop by Category', 'Collections'),
      { id: 'subheading', type: 'text', label: 'Subheading', default: 'Curated selections for every need' },
    ],
  },
  featured: {
    templateKey: 'classic/sections/featured-products',
    label: 'Featured products',
    pickContext: (ctx) => ({ store: ctx.store, products: ctx.featuredProducts }),
    schema: copy('Top Picks', 'Featured Collection'),
  },
  'all-products': {
    templateKey: 'classic/sections/all-products',
    label: 'All products',
    pickContext: (ctx) => ({ store: ctx.store, products: ctx.products }),
    schema: copy('Browse Everything', 'All Products'),
  },
  mission: {
    templateKey: 'classic/sections/mission',
    label: 'Mission',
    pickContext: (ctx) => ({ store: ctx.store }),
    // The mission's headline and body come from store settings
    // (missionHeadline / mission), so only the eyebrow is per-section.
    schema: [
      { id: 'eyebrow', type: 'text', label: 'Label above heading', default: 'Our Mission' },
    ],
  },
  programs: {
    templateKey: 'classic/sections/programs',
    label: 'Programs',
    pickContext: (ctx) => ({ store: ctx.store }),
    schema: copy('What We Do', 'Programs'),
  },
  impact: {
    templateKey: 'classic/sections/impact',
    label: 'Impact',
    pickContext: (ctx) => ({ store: ctx.store }),
    schema: copy('Our Impact', 'Impact'),
  },
  contact: {
    templateKey: 'classic/sections/contact',
    label: 'Contact',
    pickContext: (ctx) => ({ store: ctx.store }),
    schema: copy('Contact Us', 'Get in Touch'),
  },
  campaigns: {
    templateKey: 'classic/sections/campaigns',
    label: 'Campaigns',
    pickContext: (ctx) => ({ store: ctx.store, campaigns: ctx.campaigns }),
    schema: copy('Support a Cause', 'Campaigns'),
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
