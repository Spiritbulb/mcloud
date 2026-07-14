// lib/pages.ts
// Read a store's published page by slug, using the storefront server client
// (service-role, same access pattern as products/collections). No anon exposure.
import { createClient } from '@mcloud/db/server'
import type { PageSection } from './sections'

export interface PageRow {
  id: string
  slug: string
  title: string
  position: number
  sections: PageSection[]
}

/** A store's published page for `slug`, or null. Pass '' for the home page. */
export async function getPublishedPage(storeId: string, slug: string): Promise<PageRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('pages')
    .select('id, slug, title, position, sections')
    .eq('store_id', storeId)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    position: data.position,
    sections: Array.isArray(data.sections) ? (data.sections as unknown as PageSection[]) : [],
  }
}
