import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { NextResponse, NextRequest } from 'next/server'

// /api/store/[slug]/route.ts

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const session = await auth0.getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug } = await params
    const userId = session.user.sub
    const supabase = await createClient()

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

    if (!memberships?.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const currentMembership = memberships.find(m => m.store?.slug === slug)
    if (!currentMembership) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    const { data: store, error } = await supabase
        .from('stores')
        .select(`
            *,
            theme:store_themes(*),
            user:users!stores_owner_id_fkey(
                id,
                name,
                email,
                avatar_url
            )
        `)
        .eq('id', currentMembership.store_id)
        .single()

    if (error) console.error('[store fetch]', error.code, error.message)
    if (!store) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    const allStores = memberships.map(m => {
        const store = m.store as { id: string; name: string; slug: string; logo_url: string }
        return {
            id: store.id,
            name: store.name,
            slug: store.slug,
            logo_url: store.logo_url,
            role: m.role,
        }
    })
    return NextResponse.json({
        ...store,
        role: currentMembership.role,
        allStores,
    })
}