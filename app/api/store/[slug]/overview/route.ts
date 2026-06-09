import { auth0 } from '@/lib/auth0'
import { getStoreOverview } from '@/lib/store-data'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const session = await auth0.getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug } = await params
    const orgSlug = request.nextUrl.searchParams.get('org')
    if (!orgSlug) return NextResponse.json({ error: 'Bad Request' }, { status: 400 })

    const result = await getStoreOverview(session.user.sub, slug, orgSlug)

    if (result.error === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (result.error === 'not_found' || result.error === 'wrong_org') return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    if (result.error) return NextResponse.json({ error: 'Server error' }, { status: 500 })

    return NextResponse.json(result.data)
}
