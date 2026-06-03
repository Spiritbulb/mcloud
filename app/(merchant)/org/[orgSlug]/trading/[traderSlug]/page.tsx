import { redirect } from 'next/navigation'

export default async function Page({ params }: { params: Promise<{ orgSlug: string; traderSlug: string }> }) {
    const { orgSlug, traderSlug } = await params
    redirect(`/org/${orgSlug}/trading/${traderSlug}/general`)
}
