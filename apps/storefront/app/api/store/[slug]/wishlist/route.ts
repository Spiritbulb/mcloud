// app/api/store/[slug]/wishlist/route.ts
// Server-mediated wishlist. Replaces direct anon-key table access from the
// browser (WishlistContext). All DB work uses the service-role client and is
// scoped to the customer resolved from the VERIFIED Supabase Auth session, so a
// client can no longer read or mutate another customer's wishlist by supplying a
// different customer_id/email.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { getActiveStoreId, getStoreCustomer } from '@/lib/customer-auth'

const noStore = { 'Cache-Control': 'no-store' }

// GET → { productIds: string[] } — the signed-in customer's wishlisted product ids.
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params
    const storeId = await getActiveStoreId(slug)
    if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: noStore })

    const customer = await getStoreCustomer(storeId)
    // Not signed in (or no customer row yet) → empty wishlist, not an error: the
    // UI renders the same as a guest with nothing saved.
    if (!customer) return NextResponse.json({ productIds: [] }, { headers: noStore })

    const admin = await createClient()
    const { data } = await admin
        .from('wishlists')
        .select('product_id')
        .eq('customer_id', customer.id)

    return NextResponse.json(
        { productIds: (data ?? []).map((r) => r.product_id) },
        { headers: noStore },
    )
}

// POST { productId, action: 'add' | 'remove' } → { wishlisted: boolean }
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params
    let body: { productId?: unknown; action?: unknown }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: noStore })
    }
    const productId = typeof body.productId === 'string' ? body.productId : ''
    const action = body.action === 'remove' ? 'remove' : body.action === 'add' ? 'add' : null
    if (!productId || !action) {
        return NextResponse.json({ error: 'productId and action are required' }, { status: 400, headers: noStore })
    }

    const storeId = await getActiveStoreId(slug)
    if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: noStore })

    const customer = await getStoreCustomer(storeId)
    if (!customer) return NextResponse.json({ error: 'Sign in to save items' }, { status: 401, headers: noStore })

    const admin = await createClient()
    if (action === 'remove') {
        await admin
            .from('wishlists')
            .delete()
            .eq('customer_id', customer.id)
            .eq('product_id', productId)
        return NextResponse.json({ wishlisted: false }, { headers: noStore })
    }

    // add — verify the product belongs to this store before inserting, so a
    // client can't seed arbitrary product ids into the table.
    const { data: product } = await admin
        .from('products')
        .select('id')
        .eq('id', productId)
        .eq('store_id', storeId)
        .single()
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404, headers: noStore })

    // Idempotent insert in code: the wishlists table has no unique constraint, so
    // upsert/onConflict isn't available — guard against a duplicate row by hand.
    const { data: existing } = await admin
        .from('wishlists')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('product_id', productId)
        .maybeSingle()
    if (!existing) {
        await admin
            .from('wishlists')
            .insert({ customer_id: customer.id, product_id: productId, store_id: storeId })
    }
    return NextResponse.json({ wishlisted: true }, { headers: noStore })
}
