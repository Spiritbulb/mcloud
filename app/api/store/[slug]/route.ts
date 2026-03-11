// app/api/stores/[slug]/route.ts
import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const session = await auth0.getSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug } = await params
    const userId = session.user.sub
    const supabase = await createClient()

    // Step 1: verify membership separately — explicit and reliable
    const { data: memberStore } = await supabase
        .from('store_members')
        .select('store_id, role')
        .eq('user_id', userId)
        .single()

    if (!memberStore) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Step 2: fetch the store by slug + confirmed store_id
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
