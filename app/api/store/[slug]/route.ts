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
    const supabase = await createClient()

    const { data: store, error } = await supabase
        .from('stores')
        .select('*, theme:store_themes(*), members:store_members!inner(user_id, role)')
        .eq('slug', slug)
        .eq('store_members.user_id', session.user.sub)
        .single()

    if (error) console.error('[store fetch]', error.code, error.message)

    if (!store) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json(store)
}