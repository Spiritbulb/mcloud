import { getStore } from '@mcloud/db/server'
import { getVertical } from '@mcloud/verticals'
import { notFound, redirect } from 'next/navigation'
import CustomersPage from './client'

export default async function Page({ params }: { params: Promise<{ orgSlug: string; storeSlug: string }> }) {
    const { orgSlug, storeSlug } = await params

    // The client only ever had the slug, so the store is loaded here purely to
    // read its vertical. getStore is the same cached, server-side helper the
    // sibling products/services pages use, and it selects the whole row.
    const store = await getStore(storeSlug)
    if (!store) notFound()

    // Customer accounts only exist for verticals that sell things. The nav
    // already hides this, but hidden is not the same as unreachable.
    if (!getVertical(store.type).commerce) {
        redirect(`/org/${orgSlug}/${storeSlug}/settings`)
    }

    return <CustomersPage slug={storeSlug} />
}
