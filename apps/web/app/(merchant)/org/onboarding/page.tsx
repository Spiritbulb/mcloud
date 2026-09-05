import { getSession } from '@mcloud/auth/server'
import OnboardingClient from './onboarding-client'

interface PageProps {
    searchParams: Promise<{ next?: string }>
}

export default async function Page( { searchParams }: PageProps ) {
    const session = await getSession()
    const userName = session?.user?.name ?? null
    const { next } = await searchParams
    const to = next ?? '/org'

    return <OnboardingClient userName={userName} to={to} />
}
