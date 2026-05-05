import { getMembers } from './actions'
import MembersPage from './members-client'
import { notFound, redirect } from 'next/navigation'
import { auth0 } from '@/lib/auth0'

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const session = await auth0.getSession()
    if (!session?.user) redirect(`${process.env.APP_BASE_URL}/auth/login`)

    const data = await getMembers(slug)
    if (data.error === 'Store not found') notFound()

    // Only owners and admins can access this page
    if (!data.currentRole || !['owner', 'admin'].includes(data.currentRole)) {
        redirect(`/store/${slug}/settings`)
    }

    return <MembersPage {...data} slug={slug} />
}