import '@/app/store/[slug]/storefront.css'
import { createClient } from '@mcloud/db/server'
import { notFound } from 'next/navigation'
import { castStore, castProducts, castCollections } from '@/lib/db-cast'
import { getReviewAggregates, withReviewAggregates } from '@/lib/reviews'
import { resolveTheme } from '@mcloud/themes/resolver'
import { buildHomeContext } from '@/lib/liquid-context'
import { loadCampaignsWithProgress } from '@/lib/campaigns'
import { getPublishedPage } from '@/lib/pages'
import { renderPage } from '@/lib/render-page'
import { defaultHomeSections } from '@/lib/sections'
import { verifyPreview } from '@/lib/preview'
import { getVertical } from '@mcloud/verticals'
import { DonateIsland } from './DonateIsland'

export const revalidate = 60

interface Props {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ preview?: string; token?: string; settings?: string }>
}

export async function generateMetadata({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('name, description, logo_url, settings')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (!store) return { title: 'Store not found' }

    const settings = (store.settings && typeof store.settings === 'object' && !Array.isArray(store.settings))
        ? store.settings as Record<string, unknown>
        : {}

    const ogImage = store.logo_url ?? (settings.heroImage as string | undefined) ?? null

    return {
        title: store.name,
        description: store.description ?? `Shop at ${store.name}`,
        openGraph: {
            title: store.name,
            description: store.description ?? '',
            images: ogImage ? [ogImage] : [],
        },
    }
}

async function incrementViews(storeId: string) {
    const supabase = await createClient()
    await supabase.rpc('increment_store_views', { store_id: storeId })
}

export default async function StorePage({ params, searchParams }: Props) {
    const { slug } = await params
    const { preview, token, settings } = await searchParams
    const supabase = await createClient()

    const { data: rawStore } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (!rawStore) notFound()

    const [
        { data: rawProducts },
        { data: rawCollections },
        { data: featuredRows },
        { data: rawServices },
    ] = await Promise.all([
        supabase
            .from('products')
            .select('id, name, slug, description, price, compare_at_price, images, inventory_quantity, track_inventory')
            .eq('store_id', rawStore.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),

        supabase
            .from('collections')
            .select('id, name, slug, description, image_url, position')
            .eq('store_id', rawStore.id)
            .eq('is_active', true)
            .neq('slug', 'featured')
            .order('position', { ascending: true }),

        supabase
            .from('collection_products')
            .select(`
                position,
                products (
                    id, name, slug, description, price, compare_at_price,
                    images, inventory_quantity, track_inventory
                )
            `)
            .eq('collections.slug', 'featured')
            .eq('collections.store_id', rawStore.id)
            .order('position', { ascending: true })
            .limit(8),

        (supabase as any)
            .from('services')
            .select('id, name, slug, description, price, is_active, sku, metadata')
            .eq('store_id', rawStore.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
    ])

    const store = castStore(rawStore)
    const baseProducts = castProducts(rawProducts ?? [])
    const collections = castCollections(rawCollections ?? [])
    const services = (rawServices ?? []) as any[]

    const baseFeatured = castProducts(
        (featuredRows ?? [])
            .map((row: any) => row.products)
            .filter(Boolean)
    )

    // Real per-product review aggregates — one query for everything on the page.
    const allIds = [...new Set([...baseProducts, ...baseFeatured].map((p) => p.id))]
    const aggregates = await getReviewAggregates(supabase, rawStore.id, allIds)
    const products = withReviewAggregates(baseProducts, aggregates)
    const featured = withReviewAggregates(baseFeatured, aggregates)

    if (store?.id) {
        incrementViews(store.id)
    }

    const themeId = (store?.settings?.themeId as string) ?? 'classic'

    // Render the home via Liquid. On any template/render error, fall back to the
    // React theme so a template bug can never take a live store down. (The
    // fallback is a sub-project-1 safety net; removed when React is retired.)
    try {
        const homePage = await getPublishedPage(store.id, '')
        let sections = homePage?.sections?.length
            ? homePage.sections
            : defaultHomeSections(rawStore.type as string | null | undefined)

        // Is this the Editor's preview? A VALID token is the only way to be one.
        // This gates both the unsaved-copy override and the `editing` render flag,
        // so a visitor cannot get edit affordances by guessing a query parameter.
        const editing =
            !!token &&
            !!process.env.PREVIEW_SECRET &&
            verifyPreview(token, store.id, process.env.PREVIEW_SECRET)

        // The Editor previews UNSAVED copy. Honoured only with that same token:
        // otherwise a crafted URL would let anyone serve a merchant's customers a
        // re-worded version of their own site.
        if (editing && preview) {
            try {
                const parsed = JSON.parse(Buffer.from(preview, 'base64url').toString('utf-8'))
                if (Array.isArray(parsed)) sections = parsed
            } catch {
                // A malformed preview payload falls through to the real page.
            }
        }

        // The Editor also previews UNSAVED record edits/CRUD (programs, campaigns,
        // impact stats, hero slides), which live in the Editor's `storeDraft` state
        // and are never persisted until Save. Same token gate as `preview` above:
        // honoured only for a verified editing session, merged over saved settings
        // so any key the draft doesn't touch still comes from the real store.
        let previewStore = store
        let previewSettingsForCampaigns: unknown = rawStore.settings
        if (editing && settings) {
            try {
                const override = JSON.parse(Buffer.from(settings, 'base64url').toString('utf-8'))
                if (override && typeof override === 'object' && !Array.isArray(override)) {
                    const savedSettings = (rawStore.settings && typeof rawStore.settings === 'object' && !Array.isArray(rawStore.settings))
                        ? rawStore.settings as Record<string, unknown>
                        : {}
                    const mergedSettings = { ...savedSettings, ...override }
                    previewStore = castStore({ ...rawStore, settings: mergedSettings })
                    previewSettingsForCampaigns = mergedSettings
                }
            } catch {
                // A malformed settings payload falls through to the saved settings.
            }
        }

        const campaigns = await loadCampaignsWithProgress(store.id, previewSettingsForCampaigns)
        const context = {
            ...buildHomeContext({
                store: previewStore,
                storeType: rawStore.type as string | null | undefined,
                editing,
                products,
                collections,
                featuredProducts: featured.length > 0 ? featured : products.slice(0, 8),
            }),
            campaigns,
        }

        const html = await renderPage(sections, context)
        const isNgo = getVertical(rawStore.type as string | null | undefined).id === 'ngo'
        return (
            <>
                <div data-liquid suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />
                {isNgo ? <DonateIsland slug={slug} /> : null}
            </>
        )
    } catch (err) {
        console.error('[storefront] Liquid home render failed, falling back to React:', err)
        const { StoreFront } = await resolveTheme(themeId)
        return (
            <StoreFront
                store={store}
                products={products}
                collections={collections}
                featuredProducts={featured.length > 0 ? featured : products.slice(0, 8)}
                services={services}
            />
        )
    }
}
