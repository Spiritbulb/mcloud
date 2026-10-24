import { getStoreRow } from '@/lib/store-queries'
import StoreViewBeacon from '@/components/store/store-view-beacon'
import { StoreHome } from './store-home'

// Served from the CDN and rebuilt in the background at most once per window. Merchant
// edits call revalidateStore() so they show up immediately; this is the backstop for
// anything that writes without it.
export const revalidate = 3600

interface Props {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
    const { slug } = await params
    const store = await getStoreRow(slug)

    if (!store || !store.is_active) return { title: 'Store not found' }

    const settings = (store.settings && typeof store.settings === 'object' && !Array.isArray(store.settings))
        ? store.settings as Record<string, unknown>
        : {}

    // Link previews are wide and cropped by each platform: the hero photo makes a far better card
    // than a logo, which is often a wordmark that ends up cut off or tiny.
    const ogImage = (settings.heroImage as string | undefined) || store.logo_url || null

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

export default async function StorePage({ params }: Props) {
    const { slug } = await params
    return (
        <>
            <StoreHome slug={slug} />
            <StoreViewBeacon slug={slug} />
        </>
    )
}
