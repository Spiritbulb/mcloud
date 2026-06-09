import { auth0 } from '@/lib/auth0'
import { getStoreSettingsData } from '@/lib/store-data'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const session = await auth0.getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug } = await params
    const result = await getStoreSettingsData(session.user.sub, slug)

    if (result.error === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (result.error === 'not_found') return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    if (result.error) return NextResponse.json({ error: 'Server error' }, { status: 500 })

    // Backfill the user fields from the session when the profile row is empty.
    const data = result.data
    if (!data.user?.name) {
        data.user = {
            ...data.user,
            name: data.user?.name || session.user.name || 'Account',
            email: data.user?.email || session.user.email || '',
            avatar_url: data.user?.avatar_url ?? session.user.picture ?? null,
        }
    }

    return NextResponse.json(data)
}