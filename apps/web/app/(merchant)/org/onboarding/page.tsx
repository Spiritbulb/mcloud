import { getSession } from '@mcloud/auth/server'
import OnboardingClient from './onboarding-client'
import { sanitizeOrgSubpath } from './onboarding-logic'

interface PageProps {
    searchParams: Promise<{ next?: string }>
}

export default async function Page( { searchParams }: PageProps ) {
    const session = await getSession()
    const userName = session?.user?.name ?? null
    const { next } = await searchParams
    return <OnboardingClient userName={userName} next={sanitizeOrgSubpath(next)} />
}
