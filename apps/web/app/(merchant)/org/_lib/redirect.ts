// app/(merchant)/org/_lib/redirect.ts
import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@mcloud/auth/server'
import { LOGIN_URL } from '@mcloud/auth/routes'
import { firstOrgSlug } from '@/lib/first-org'


export async function redirectToOrgPath(request: NextRequest, rest: string) {
    const user = await getCurrentUser()
    if (!user) {
        const loginUrl = new URL(LOGIN_URL, request.url)
        loginUrl.searchParams.set('next', `/org${rest}`)
        return NextResponse.redirect(loginUrl)
    }

    const orgSlug = await firstOrgSlug(user.id)

    if (orgSlug) {
        return NextResponse.redirect(new URL(`/org/${orgSlug}${rest}`, request.url))
    }

    const onboardingUrl = new URL('/org/onboarding', request.url)
    if (rest) onboardingUrl.searchParams.set('next', `${rest}`)
    return NextResponse.redirect(onboardingUrl)
}