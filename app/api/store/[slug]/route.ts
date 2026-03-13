import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    // Pass request so Auth0 can read cookies from this specific request
    const session = await auth0.getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug } = await params
    const userId = session.user.sub
    const supabase = await createClient()

    const { data: memberStore } = await supabase
        .from('store_members')
        .select('store_id, role')
        .eq('user_id', userId)
        .single()

    if (!memberStore) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: store, error } = await supabase
        .from('stores')
        .select('*, theme:store_themes(*)')
        .eq('slug', slug)
        .eq('id', memberStore.store_id)
        .single()

    if (error) console.error('[store fetch]', error.code, error.message)
    if (!store) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    return NextResponse.json({ ...store, role: memberStore.role })
}
