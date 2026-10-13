import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@mcloud/auth/server'
import { signupHref, safeNext } from '@/lib/auth-urls'

export async function GET(request: NextRequest) {
    const next = safeNext(request.nextUrl.searchParams.get('next'))
    const session = await getSession(request).catch(() => null)
    if (session?.user) return NextResponse.redirect(new URL(next, request.url))
    return NextResponse.redirect(signupHref(next))
}
