import { redirect } from 'next/navigation'

// Appearance was split up: logo and icon moved to Brand, colours, fonts, slides and
// gallery are edited in the Editor. Kept so old links and bookmarks still land somewhere.
export default async function AppearancePage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug } = await params
    redirect(`/org/${orgSlug}/${storeSlug}/settings/brand`)
}
