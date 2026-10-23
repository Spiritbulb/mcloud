import { redirect, notFound } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import OrgMembersClient from './members-client'
import { getOrgMembers } from './actions'

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
    const { orgSlug } = await params
    const session = await getSession()
    if (!session?.user) redirect(loginUrlWithReturn(`/org/${orgSlug}/members`))

    // getOrgMembers checks membership; the org itself was already resolved by the layout.
    const data = await getOrgMembers(orgSlug)
    if (data.error === 'Org not found') notFound()
    if (!data.currentRole) redirect(`/org/${orgSlug}`)

    return (
        <OrgMembersClient
            orgId={data.orgId!}
            orgSlug={orgSlug}
            members={data.members}
            invites={data.invites}
            currentRole={data.currentRole}
        />
    )
}
