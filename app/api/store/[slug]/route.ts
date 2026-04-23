import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const session = await auth0.getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug } = await params
    const userId = session.user.sub
    const supabase = await createClient()

    // Fetch the logged-in user's own profile
    const { data: sessionUser } = await supabase
        .from('users')
        .select('id, name, email, avatar_url')
        .eq('id', userId)
        .single()

    // Fetch ALL stores this user belongs to
    const { data: memberships } = await supabase
        .from('store_members')
        .select(`
            store_id,
            role,
            store:stores(
                id,
                name,
                slug,
                logo_url
            )
        `)
        .eq('user_id', userId)

    if (!memberships?.length)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const currentMembership = memberships.find((m) => {
        const s = Array.isArray(m.store) ? m.store[0] : m.store
        return s?.slug === slug
    })

    if (!currentMembership?.store_id)
        return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    // Fetch full store details
    const { data: storeData, error } = await supabase
        .from('stores')
        .select(`
            *,
            theme:store_themes(*)
        `)
        .eq('id', currentMembership.store_id)
        .single()

    if (error) console.error('[store fetch]', error.code, error.message)
    if (!storeData) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    const allStores = memberships.map((m) => {
        const memberStore = Array.isArray(m.store) ? m.store[0] : m.store
        return {
            id: memberStore?.id ?? '',
            name: memberStore?.name ?? '',
            slug: memberStore?.slug ?? '',
            logo_url: memberStore?.logo_url ?? null,
            role: m.role,
        }
    })

    return NextResponse.json({
        ...storeData,
        // `user` is always the logged-in user, never the store owner
        user: sessionUser ?? {
            id: userId,
            name: session.user.name ?? 'Account',
            email: session.user.email ?? '',
            avatar_url: session.user.picture ?? null,
        },
        role: currentMembership.role,
        allStores,
    })
}