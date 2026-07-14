import '@/app/store/[slug]/storefront.css'

import { DonateIsland } from '../../DonateIsland'
import { castStore } from '@/lib/db-cast'
import { buildHomeContext } from '@/lib/liquid-context'
import { loadCampaignsWithProgress } from '@/lib/campaigns'
import { getPublishedPage } from '@/lib/pages'
import { renderPage } from '@/lib/render-page'
import { getVertical } from '@mcloud/verticals'
import { createClient } from '@mcloud/db/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

// A store's own pages (About, Contact, anything the merchant authors) live as
// rows in `pages` with a section list, exactly like the home page. Home is
// `slug = ''`; everything else renders here.
//
// The route is /p/{pageSlug} rather than /{pageSlug} because the storefront
// already has a catch-all product route at /[product-slug]. Without the prefix,
// /about would be swallowed by it and 404 as a missing product.

type Params = Promise<{ slug: string; pageSlug: string }>

async function loadStore(slug: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .single()
    return data
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { slug, pageSlug } = await params
    const rawStore = await loadStore(slug)
    if (!rawStore) return { title: 'Not found' }

    const page = await getPublishedPage(rawStore.id, pageSlug)
    if (!page) return { title: rawStore.name }

    return {
        title: `${page.title} · ${rawStore.name}`,
        description: rawStore.description ?? undefined,
    }
}

export default async function StorePage({ params }: { params: Params }) {
    const { slug, pageSlug } = await params

    const rawStore = await loadStore(slug)
    if (!rawStore) notFound()

    // Unpublished or nonexistent pages are indistinguishable from the outside:
    // both are simply not there.
    const page = await getPublishedPage(rawStore.id, pageSlug)
    if (!page || page.sections.length === 0) notFound()

    const store = castStore(rawStore)
    const vertical = getVertical(rawStore.type as string | null | undefined)

    // Campaigns are what the donate sections and the hero CTA bind to. Only
    // non-commerce verticals have them, and the reader is empty-safe.
    const campaigns = vertical.commerce
        ? []
        : await loadCampaignsWithProgress(store.id, rawStore.settings)

    const context = {
        ...buildHomeContext({
            store,
            products: [],
            collections: [],
            featuredProducts: [],
        }),
        campaigns,
    }

    const html = await renderPage(page.sections, context)

    return (
        <>
            <div data-liquid suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />
            {campaigns.length > 0 ? <DonateIsland slug={slug} /> : null}
        </>
    )
}
