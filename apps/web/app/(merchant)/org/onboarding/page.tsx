import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import OnboardingClient from './onboarding-client'
import { NextRequest } from 'next/server'

export default async function Page( searchParams: Promise<{ next?: string }>, request: NextRequest ) {
    const session = await getSession()
    const userName = session?.user?.name ?? null
    const to = (await searchParams).next ?? '/org'

    return <OnboardingClient userName={userName} to={to} />
}
