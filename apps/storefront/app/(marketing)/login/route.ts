// /login and /signup: stable, short entry points for the storefront's marketing pages. They
// resolve to the current auth origin (lib/auth-urls.ts), so links in emails, QR codes and
// the header survive the sign-in screens moving to another domain.
import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@mcloud/auth/server'
import { loginHref, safeNext } from '@/lib/auth-urls'

export async function GET(request: NextRequest) {
    const next = safeNext(request.nextUrl.searchParams.get('next'))
    // Already signed in: skip the login screen.
    const session = await getSession(request).catch(() => null)
    if (session?.user) return NextResponse.redirect(new URL(next, request.url))
    return NextResponse.redirect(loginHref(next))
}
