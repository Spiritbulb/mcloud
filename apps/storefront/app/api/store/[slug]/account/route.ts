// app/api/store/[slug]/account/route.ts
// Customer account dashboard data + profile/address updates, server-side. Replaces
// direct anon-key reads/writes from the browser that were authorized only by a
// client-supplied email — meaning anyone with the anon key could read any
// customer's orders + PII. Everything here is scoped to the customer resolved from
// the VERIFIED Supabase Auth session (getStoreCustomer).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import type { TablesUpdate } from '@mcloud/db/types'
import { getActiveStoreId, getStoreCustomer } from '@/lib/customer-auth'

const noStore = { 'Cache-Control': 'no-store' }

// GET → { customer, orders, wishlistProducts } for the signed-in customer.
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params
    const storeId = await getActiveStoreId(slug)
    if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: noStore })

    const customer = await getStoreCustomer(storeId)
    if (!customer) {
        // Signed-out (or no customer row): empty dashboard, not an error.
        return NextResponse.json({ customer: null, orders: [], wishlistProducts: [] }, { headers: noStore })
    }

    const admin = await createClient()

    // Full customer row (profile + addresses).
    const { data: customerRow } = await admin
        .from('customers')
        .select('*')
        .eq('id', customer.id)
        .single()

    // Orders: those linked to this customer, PLUS legacy guest orders that share the
    // verified email but were never linked (customer_id null) — same union the old
    // client did, but the email is now the trusted session email.
    const { data: linked } = await admin
        .from('orders')
        .select('*, order_items(*)')
        .eq('store_id', storeId)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(20)

    const { data: unlinked } = await admin
        .from('orders')
        .select('*, order_items(*)')
        .eq('store_id', storeId)
        .eq('customer_email', customer.email)
        .is('customer_id', null)
        .order('created_at', { ascending: false })
        .limit(20)

    const orders = [...(linked ?? []), ...(unlinked ?? [])].sort(
        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    )

    // Wishlist products (ids → product rows), scoped to this store.
    const { data: wl } = await admin
        .from('wishlists')
        .select('product_id')
        .eq('customer_id', customer.id)
    const productIds = (wl ?? []).map((r) => r.product_id)
    let wishlistProducts: unknown[] = []
    if (productIds.length) {
        const { data: products } = await admin
            .from('products')
            .select('*')
            .eq('store_id', storeId)
            .in('id', productIds)
        wishlistProducts = products ?? []
    }

    return NextResponse.json({ customer: customerRow, orders, wishlistProducts }, { headers: noStore })
}

// PATCH { profile?: {first_name,last_name,phone}, addresses? } → { ok: true }
// Updates only the signed-in customer's own row.
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params
    const storeId = await getActiveStoreId(slug)
    if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: noStore })

    const customer = await getStoreCustomer(storeId)
    if (!customer) return NextResponse.json({ error: 'Not signed in' }, { status: 401, headers: noStore })

    let body: {
        profile?: { first_name?: string; last_name?: string; phone?: string }
        addresses?: { line1?: string; city?: string; country?: string; label?: string }[]
    }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: noStore })
    }

    const update: TablesUpdate<'customers'> = {}
    if (body.profile) {
        update.first_name = body.profile.first_name?.trim() ?? ''
        update.last_name = body.profile.last_name?.trim() ?? ''
        update.phone = body.profile.phone?.trim() ?? ''
    }
    if (body.addresses !== undefined) update.addresses = body.addresses

    if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400, headers: noStore })
    }

    const admin = await createClient()
    const { error } = await admin.from('customers').update(update).eq('id', customer.id)
    if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500, headers: noStore })

    return NextResponse.json({ ok: true }, { headers: noStore })
}
