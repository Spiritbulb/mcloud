import { getSession } from '@mcloud/auth/server'
import OnboardingClient from './onboarding-client'

export default async function Page( searchParams: Promise<{ next?: string }>) {
    const session = await getSession()
    const userName = session?.user?.name ?? null
    const to = (await searchParams).next ?? '/org'

    return <OnboardingClient userName={userName} to={to} />
}
