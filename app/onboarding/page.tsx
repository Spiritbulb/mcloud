// app/onboarding/page.tsx  (Server Component)
import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import OnboardingPage from './onboarding-client'
import { getOnboardingData } from './actions'

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ org?: string }>
}) {
    const { stores, userName } = await getOnboardingData()
    const { org } = await searchParams

    return <OnboardingPage existingStores={stores} orgId={org ?? null} />
}