// app/(merchant)/org/_lib/redirect.ts
import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { LOGIN_URL } from '@mcloud/auth/routes'


export async function redirectToOrgPath(request: NextRequest, rest: string) {
    const user = await getCurrentUser()
    if (!user) {
        const loginUrl = new URL(LOGIN_URL, request.url)
        loginUrl.searchParams.set('next', `/org${rest}`)
        return NextResponse.redirect(loginUrl)
    }

    const supabase = await createClient()
    const { data: firstOrg } = await supabase
        .from('org_members')
        .select('org:orgs(slug)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

    const orgSlug = firstOrg ? (firstOrg.org as { slug?: string } | null)?.slug : null

    if (orgSlug) {
        return NextResponse.redirect(new URL(`/org/${orgSlug}${rest}`, request.url))
    }

    const onboardingUrl = new URL('/org/onboarding', request.url)
    if (rest) onboardingUrl.searchParams.set('next', `${rest}`)
    return NextResponse.redirect(onboardingUrl)
}