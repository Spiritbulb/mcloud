import { redirect } from 'next/navigation'

// /store/[slug]/settings → /store/[slug]/settings/general
export default async function SettingsIndexPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params

    redirect(`/store/${slug}/settings/general`)
}