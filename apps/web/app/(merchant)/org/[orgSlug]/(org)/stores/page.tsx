import { redirect, notFound } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import StoresClient from './stores-client'
import { getOrgStores } from './actions'

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
    const { orgSlug } = await params
    const session = await getSession()
    if (!session?.user) redirect(loginUrlWithReturn(`/org/${orgSlug}/stores`))

    // getOrgStores checks membership; the org itself was already resolved by the layout.
    const data = await getOrgStores(orgSlug)
    if (data.error === 'Not a member' || data.error === 'Org not found') notFound()

    return (
        <StoresClient orgId={data.orgId!} orgSlug={orgSlug} stores={data.stores.map(s => ({ ...s, created_at: s.created_at ?? '' }))} role={data.role} />
    )
}
