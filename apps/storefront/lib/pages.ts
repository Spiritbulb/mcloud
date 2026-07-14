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

/** Just enough of a page to link to it from the nav. */
export interface NavPage {
  slug: string
  title: string
}

/**
 * A store's published pages, in author order, for the nav. Home ('') is excluded:
 * the logo already links there. Never throws. A read failure yields no links
 * rather than taking the storefront down.
 */
export async function getNavPages(storeId: string): Promise<NavPage[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('pages')
      .select('slug, title, position')
      .eq('store_id', storeId)
      .eq('is_published', true)
      .neq('slug', '')
      .order('position', { ascending: true })
    if (error) throw error
    return (data ?? []).map((p) => ({ slug: p.slug, title: p.title }))
  } catch (err) {
    console.error('[storefront] nav pages read failed (rendering none):', err)
    return []
  }
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
