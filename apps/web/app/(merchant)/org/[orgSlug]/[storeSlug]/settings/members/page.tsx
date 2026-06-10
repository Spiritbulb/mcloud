import { getMembers } from './actions'
import MembersPage from './members-client'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'

export default async function Page({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug } = await params
    const session = await getSession()
    if (!session?.user) redirect(`/auth/login`)

    const data = await getMembers(storeSlug)
    if (data.error === 'Store not found') notFound()

    if (!data.currentRole || !['owner', 'admin'].includes(data.currentRole)) {
        redirect(`/org/${orgSlug}/${storeSlug}/settings`)
    }

    return <MembersPage {...data} slug={storeSlug} />
}
