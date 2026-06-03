import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import OnboardingClient from './onboarding-client'

export default async function Page() {
    const session = await auth0.getSession()
    const userName = session?.user?.name ?? null

    return <OnboardingClient userName={userName} />
}
