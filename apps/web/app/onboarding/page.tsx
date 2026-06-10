import { getSession } from '@/lib/auth/server'
import { createClient } from '@mcloud/db/server'
import OnboardingClient from './onboarding-client'

export default async function Page() {
    const session = await getSession()
    const userName = session?.user?.name ?? null

    return <OnboardingClient userName={userName} />
}
