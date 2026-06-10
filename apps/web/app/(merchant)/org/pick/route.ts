// app/(merchant)/org/pick/route.ts
// /org/pick is no longer the hub — redirect to the user's first org (or onboarding).
// Route Handler (not a page) so the redirect is a clean HTTP redirect.
import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { LOGIN_URL } from '@mcloud/auth/routes'

export async function GET(request: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.redirect(new URL(LOGIN_URL, request.url))

    const supabase = await createClient()
    const { data: firstOrg } = await supabase
        .from('org_members')
        .select('org:orgs(slug)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

    const orgSlug = firstOrg ? (firstOrg.org as { slug?: string } | null)?.slug : null
    return NextResponse.redirect(new URL(orgSlug ? `/org/${orgSlug}` : '/onboarding', request.url))
}
