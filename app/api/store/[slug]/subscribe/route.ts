// app/api/store/[slug]/subscribe/route.ts
import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { NextResponse, NextRequest } from 'next/server'

const PRO_PAYMENT_URL = 'https://payment.intasend.com/subscriptions/charge/3Y3XX0L/plan/'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const session = await auth0.getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug } = await params
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('id, name, slug, is_pro')
        .eq('slug', slug)
        .single()

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const { data: membership } = await supabase
        .from('store_members')
        .select('role')
        .eq('store_id', store.id)
        .eq('user_id', session.user.sub)
        .in('role', ['owner', 'admin'])
        .single()

    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (store.is_pro) return NextResponse.json({ error: 'Already pro' }, { status: 400 })

    // Record pending subscription
    await supabase.from('store_subscriptions').insert({
        store_id: store.id,
        intasend_invoice_id: null,
        intasend_tracking_id: null,
        amount: 2500,
        currency: 'KES',
        status: 'pending',
    })

    return NextResponse.json({ url: PRO_PAYMENT_URL })
}