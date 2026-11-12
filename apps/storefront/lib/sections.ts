// lib/sections.ts
// Storefront-side registry: maps a page section `type` to the Liquid section
// file that renders it (in whichever theme folder the store uses) and the slice of render context it needs.
// @mcloud/liquid stays a dumb renderer; this file holds the storefront's
// knowledge of what data each section consumes. Adding a section type = a new
// entry here + a .liquid file in packages/liquid.

import { getVertical } from '@mcloud/verticals'
import type { SettingField } from '@mcloud/verticals'
import { heroSlides } from './hero'
import { MAX_PICKED_PRODUCTS, selectProducts } from './product-selection'

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
  | 'gallery'
  | 'services'

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
  services?: unknown[]
}

export interface SectionDef {
  /**
   * The section's Liquid file, without theme or extension ('hero', 'collections-grid').
   * renderPage picks the folder from the store's theme (lib/store-themes.ts).
   */
  file: string
  /** `settings` is this section's own config, for sections whose content depends on it (picked products). */
  pickContext: (ctx: PageRenderContext, settings?: Record<string, unknown>) => Record<string, unknown>
  /** Human name, shown in the Editor's section list. */
  label: string
  /** One line for the Editor's "Add section" picker. */
  description?: string
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

/**
 * Settings every section has, declared once. The Editor shows them on every
 * section panel; renderPage honours `hidden` before it looks at the type.
 */
export const COMMON_SECTION_SCHEMA: readonly SettingField[] = [
  { id: 'hidden', type: 'toggle', label: 'Hide this section', default: false },
]

/** How many cards across. `auto` is the fluid grid the templates always had. */
const columns: SettingField = {
  id: 'columns', type: 'select', label: 'Columns', default: 'auto',
  options: [
    { value: 'auto', label: 'Automatic' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
  ],
}

const cardStyle: SettingField = {
  id: 'card_style', type: 'select', label: 'Card style', default: 'flat',
  options: [
    { value: 'flat', label: 'Flat' },
    { value: 'bordered', label: 'Bordered' },
    { value: 'shadow', label: 'Shadow' },
  ],
}

export const SECTION_REGISTRY: Record<SectionType, SectionDef> = {
  hero: {
    file: 'hero',
    label: 'Hero',
    description: 'Large banner with slides, headline and a call to action.',
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
        slides: heroSlides({
          settings: store?.settings,
          storeName: store?.name ?? '',
          storeDescription: store?.description,
          commerce: !!store?.commerce,
          hasCampaign: Array.isArray(ctx.campaigns) && ctx.campaigns.length > 0,
        }),
      }
    },
    // The hero's copy lives in the slides, not in section config, so it declares no
    // heading/eyebrow. Its slides are edited in the Editor's hero panel.
    schema: [
      {
        id: 'layout', type: 'select', label: 'Layout', default: 'full',
        options: [
          { value: 'full', label: 'Full-bleed image' },
          { value: 'split', label: 'Image beside text' },
          { value: 'minimal', label: 'Text only' },
        ],
      },
      {
        id: 'height', type: 'select', label: 'Height', default: 'standard',
        options: [
          { value: 'short', label: 'Short' },
          { value: 'standard', label: 'Standard' },
          { value: 'tall', label: 'Full screen' },
        ],
      },
    ],
  },
  collections: {
    file: 'collections-grid',
    label: 'Collections',
    description: 'A grid of your product collections.',
    pickContext: (ctx) => ({ store: ctx.store, collections: ctx.collections }),
    schema: [
      ...copy('Shop by Category', 'Collections'),
      { id: 'subheading', type: 'text', label: 'Subheading', default: 'Curated selections for every need' },
      columns,
    ],
  },
  featured: {
    file: 'featured-products',
    label: 'Featured products',
    description: 'Products you choose, or your featured ones if you have not chosen any.',
    // Picked products win; with none picked this is what it always was (the featured
    // collection, else the newest). ctx.products is every active product, so a pick
    // that was hidden or deleted simply drops out.
    pickContext: (ctx, settings) => ({
      store: ctx.store,
      products: selectProducts(
        settings?.productIds,
        ctx.products as { id: string }[],
        ctx.featuredProducts as { id: string }[],
      ),
    }),
    schema: [
      ...copy('Top Picks', 'Featured Collection'),
      { id: 'productIds', type: 'products', label: 'Products to show', max: MAX_PICKED_PRODUCTS },
      columns,
      cardStyle,
    ],
  },
  'all-products': {
    file: 'all-products',
    label: 'All products',
    description: 'Every product in your catalog.',
    pickContext: (ctx) => ({ store: ctx.store, products: ctx.products }),
    schema: [...copy('Browse Everything', 'All Products'), columns, cardStyle],
  },
  mission: {
    file: 'mission',
    label: 'Mission',
    description: 'Your mission headline and statement.',
    pickContext: (ctx) => ({ store: ctx.store }),
    // The mission's headline and body come from store settings
    // (missionHeadline / mission), so only the eyebrow is per-section.
    schema: [
      { id: 'eyebrow', type: 'text', label: 'Label above heading', default: 'Our Mission' },
    ],
  },
  programs: {
    file: 'programs',
    label: 'Programs',
    description: 'Cards describing the work you do.',
    pickContext: (ctx) => ({ store: ctx.store }),
    schema: copy('What We Do', 'Programs'),
  },
  impact: {
    file: 'impact',
    label: 'Impact',
    description: 'Numbers that show what your work adds up to.',
    pickContext: (ctx) => ({ store: ctx.store }),
    schema: copy('Our Impact', 'Impact'),
  },
  contact: {
    file: 'contact',
    label: 'Contact',
    description: 'Your address, email and phone number.',
    pickContext: (ctx) => ({ store: ctx.store }),
    schema: copy('Contact Us', 'Get in Touch'),
  },
  campaigns: {
    file: 'campaigns',
    label: 'Campaigns',
    description: 'Causes visitors can donate to, with progress.',
    pickContext: (ctx) => ({ store: ctx.store, campaigns: ctx.campaigns }),
    schema: copy('Support a Cause', 'Campaigns'),
  },
  gallery: {
    file: 'gallery',
    label: 'Gallery',
    description: 'A grid of photos with captions.',
    pickContext: (ctx) => ({ store: ctx.store }),
    schema: [
      ...copy('Recent Shoots', 'Gallery'),
      { id: 'limit', type: 'number', label: 'Photos to show', default: 8, min: 1, max: 30 },
      { id: 'ctaText', type: 'text', label: 'Link button text', default: 'View full gallery' },
      { id: 'ctaUrl', type: 'text', label: 'Link button URL', default: '' },
    ],
  },
    services: {
    file: 'services',
    label: 'Services',
    description: 'Services customers can book.',
    pickContext: (ctx) => ({ store: ctx.store, services: ctx.services }),
    schema: [
     ...copy('What We Offer', 'Services'),
      { id: 'limit', type: 'number', label: 'Services to show', default: 3, min: 1, max: 12 },
   ],
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
