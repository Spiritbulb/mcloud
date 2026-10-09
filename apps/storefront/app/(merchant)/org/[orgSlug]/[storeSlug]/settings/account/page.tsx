import { getAccountData } from './actions'
import AccountPage from './account-client'
import { redirect } from 'next/navigation'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import { webUrl } from '@/lib/host'

export default async function Page({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug } = await params
    const { user, error } = await getAccountData()
    if (error || !user) redirect(webUrl(loginUrlWithReturn(`/org/${orgSlug}/${storeSlug}/settings/account`)))
    return <AccountPage user={user} />
}