import { getAccountData } from './actions'
import AccountPage from './account-client'
import { redirect } from 'next/navigation'

export default async function Page() {
    const { user, error } = await getAccountData()
    if (error || !user) redirect(`${process.env.APP_BASE_URL}/auth/login`)
    return <AccountPage user={user} />
}