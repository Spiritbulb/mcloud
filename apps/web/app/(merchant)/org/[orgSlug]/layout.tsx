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
    const { data: org, error: orgError } = await supabase
        .from('orgs')
        .select('id, name, slug, logo_url, icon_url, type')
        .eq('slug', orgSlug)
        .maybeSingle()

    // A failed query is an outage or schema drift, not a missing org: surface it instead of a 404.
    if (orgError) throw new Error(`Loading org "${orgSlug}" failed: ${orgError.message}`)
    if (!org) notFound()

    return <>{children}</>
}