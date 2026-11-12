import { getStore } from '@mcloud/db/server'
import { getVertical } from '@mcloud/verticals'
import { notFound, redirect } from 'next/navigation'
import ReviewsClient from './reviews-client'

export default async function ReviewsPage({ params }: { params: Promise<{ orgSlug: string; storeSlug: string }> }) {
    const { orgSlug, storeSlug } = await params
    const store = await getStore(storeSlug)
    if (!store) notFound()

    // Product reviews only exist for verticals that sell things. Hidden in the nav is not unreachable.
    if (!getVertical(store.type).commerce) redirect(`/org/${orgSlug}/${storeSlug}/settings`)

    return <ReviewsClient storeId={store.id} storeSlug={store.slug} />
}
