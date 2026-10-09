// Pure builder for the `pages` rows seeded when a store is created. Kept
// separate from stores.ts so it's unit-testable without a DB (the insert
// itself lives in createStoreForUser and is best-effort).
import { getVertical, type SeedSection } from '@mcloud/verticals'

export interface SeedPageRow {
  store_id: string
  slug: string
  title: string
  position: number
  is_published: true
  sections: SeedSection[]
}

/** The default `pages` rows for a store of the given vertical. Unknown/null → shop. */
export function seedPageRows(storeId: string, type: string | null | undefined): SeedPageRow[] {
  return getVertical(type).defaultPages.map((page) => ({
    store_id: storeId,
    slug: page.slug,
    title: page.title,
    position: page.position,
    is_published: true as const,
    sections: page.sections,
  }))
}
