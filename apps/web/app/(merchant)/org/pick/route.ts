// app/(merchant)/org/pick/route.ts
// /org/pick is no longer the hub — redirect to the user's first org (or onboarding).
// Route Handler (not a page) so the redirect is a clean HTTP redirect.
import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@mcloud/auth/server'
import { LOGIN_URL } from '@mcloud/auth/routes'
import { dashboardPath } from '@/lib/first-org'

export async function GET(request: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.redirect(new URL(LOGIN_URL, request.url))

    return NextResponse.redirect(new URL(await dashboardPath(user.id), request.url))
}
