import { redirect } from 'next/navigation'

export default async function DesignPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug } = await params
    redirect(`/org/${orgSlug}/${storeSlug}/settings/appearance`)
}
