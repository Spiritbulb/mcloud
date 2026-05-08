// app/onboarding/page.tsx  (Server Component)
import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import OnboardingPage from './onboarding-client'
import { getOnboardingData } from './actions'

export default async function Page() {
    const { stores, userName } = await getOnboardingData()

    return <OnboardingPage existingStores={stores} />
}