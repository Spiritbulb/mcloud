// app/auth/post-login/route.ts
// Landing target after a successful WorkOS login (handleAuth redirects here). A
// Route Handler, NOT a page — it renders nothing and returns a real HTTP redirect,
// so there's no layout hydration racing with the redirect (which caused a
// client-side removeChild error when this was a Server Component page).
//
// Provider-agnostic: uses lib/auth, not WorkOS directly. Mirrors the identity into
// our users table and routes to the user's first org (or onboarding).
import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@mcloud/auth/server'
import { onAuthenticated } from '@mcloud/auth/callback'
import { LOGIN_URL } from '@mcloud/auth/routes'

export async function GET(request: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.redirect(new URL(LOGIN_URL, request.url))

    const destination = await onAuthenticated(user)
    return NextResponse.redirect(new URL(destination, request.url))
}
