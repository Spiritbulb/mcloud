// app/auth/login-handoff/route.ts — runs on www, sets cookie, redirects to login
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/'
    const cookieStore = await cookies()

    cookieStore.set('auth_return_to', returnTo, {
        httpOnly: true,
        secure: true,
        maxAge: 60 * 10,
        path: '/',
        // No domain needed — this runs on www and callback is on www
    })

    return NextResponse.redirect(new URL('/auth/login', request.url))
}
