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

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? ''
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = 20
    const offset = (page - 1) * limit

    // Verify membership (same pattern as /api/store/[slug])
    const { data: membership } = await supabase
        .from('store_members')
        .select('store_id, store:stores(id, slug)')
        .eq('user_id', userId)
        .then(({ data, error }) => {
            const match = data?.find((m) => {
                const s = Array.isArray(m.store) ? m.store[0] : m.store
                return s?.slug === slug
            })
            return { data: match ?? null, error }
        })

    if (!membership?.store_id)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Build query
    let query = supabase
        .from('customers')
        .select(
            'id, first_name, last_name, email, phone, mpesa_phone, order_count, total_spent, tags, created_at',
            { count: 'exact' }
        )
        .eq('store_id', membership.store_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (q) {
        query = query.or(
            `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`
        )
    }

    const { data: customers, count, error } = await query

    if (error) {
        console.error('[customers fetch]', error.code, error.message)
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }

    return NextResponse.json({ customers: customers ?? [], total: count ?? 0 })
}
