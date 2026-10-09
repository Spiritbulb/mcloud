import { getPickerData } from '@mcloud/merchant/picker'
import { OrgContextProvider } from '@mcloud/merchant/org-context'
import { createClient } from '@mcloud/db/server'
import { getSession } from '@mcloud/auth/server'
import { redirect, notFound } from 'next/navigation'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import { webAppOrigin } from '@/lib/host'

export default async function OrgLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ orgSlug: string }>
}) {
    const { orgSlug } = await params

    // proxy.ts already gates /org/*; this re-check covers direct renders and keeps
    // the layout correct on its own. Login lives on the web app, so the redirect is
    // absolute, with an app-relative returnTo that web bounces back here.
    const session = await getSession()
    if (!session?.user) {
        redirect(new URL(loginUrlWithReturn(`/org/${orgSlug}`), webAppOrigin()).toString())
    }

    const { stores } = await getPickerData().catch(() => ({ stores: [], orgs: [], userName: null }))

    const supabase = await createClient()
    const { data: org } = await supabase
        .from('orgs')
        .select('id')
        .eq('slug', orgSlug)
        .single()

    if (!org) notFound()

    return (
        <OrgContextProvider stores={stores} orgSlug={orgSlug}>
            {children}
        </OrgContextProvider>
    )
}
