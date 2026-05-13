import { redirect } from 'next/navigation'
import { auth0 } from '@/lib/auth0'
import { getPickerData } from './actions'
import PickerClient from './picker-client'

export default async function PickPage() {
    const session = await auth0.getSession()
    if (!session?.user) redirect('/auth/login')

    const { stores, userName } = await getPickerData()

    // Single store — skip the picker entirely, go straight in
    if (stores.length === 1) {
        redirect(`/store/${stores[0].slug}/settings`)
    }

    // No stores yet — send to onboarding to create first store
    if (stores.length === 0) {
        redirect('/onboarding')
    }

    return <PickerClient stores={stores} userName={userName} />
}