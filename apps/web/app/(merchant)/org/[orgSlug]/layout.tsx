import { createClient } from '@mcloud/db/server'
import { getSession } from '@mcloud/auth/server'
import { redirect, notFound } from 'next/navigation'
import { loginUrlWithReturn } from '@mcloud/auth/routes'

export default async function OrgLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ orgSlug: string }>
}) {
    const { orgSlug } = await params
    const session = await getSession()
    if (!session?.user) redirect(loginUrlWithReturn(`/org/${orgSlug}`))

    const supabase = await createClient()
    const { data: org } = await supabase
        .from('orgs')
        .select('id, name, slug, logo_url, type')
        .eq('slug', orgSlug)
        .single()

    if (!org) notFound()

    return <>{children}</>
}