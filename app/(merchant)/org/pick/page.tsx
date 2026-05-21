import { redirect } from 'next/navigation'
import { auth0 } from '@/lib/auth0'
import { getPickerData } from './actions'
import PickerClient from './picker-client'

export default async function PickPage() {
    const session = await auth0.getSession()
    if (!session?.user) redirect('/auth/login')

    const { stores, orgs, userName } = await getPickerData()

    // No stores and no orgs yet — send to onboarding to create first store
    if (stores.length === 0 && orgs.length === 0) {
        redirect('/onboarding')
    }

    // Single store, no orgs to manage — skip the picker entirely, go straight in
    if (stores.length === 1 && orgs.length === 0) {
        redirect(`/store/${stores[0].slug}/settings`)
    }

    return <PickerClient stores={stores} orgs={orgs} userName={userName} />
}