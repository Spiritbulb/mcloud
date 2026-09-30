// POST /api/mobile/reach/orders — create a pending order and fire the STK push.
// The order only becomes 'paid' when PalPluss confirms (see /api/webhooks/palpluss/reach).
// Prices always come from the database, never from the app.
import { NextResponse, type NextRequest } from 'next/server'
import { initiateStkPush } from '@/lib/palpluss'
import { reachDb } from '@/lib/reach/db'
import { REACH_STORE_ID, priceForBuyer, settingsFor } from '@/lib/reach/store-config'
import { fail, requireMobileUser } from '../../_lib'

const PHONE_RE = /^(?:\+254|254|0)\d{9}$/

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const appUrl = process.env.NEXT_PUBLIC_ADMIN_ORIGIN
    if (!appUrl) return fail(500, 'Server misconfigured: NEXT_PUBLIC_ADMIN_ORIGIN not set')

    const body = (await req.json().catch(() => null)) as {
        phone?: string
        lines?: { product_id?: string; quantity?: number }[]
    } | null

    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    if (!PHONE_RE.test(phone)) return fail(400, 'Enter a valid Kenyan phone number')
    if (!body?.lines?.length) return fail(400, 'lines is required')

    // Merge duplicate lines and validate quantities
    const wanted = new Map<string, number>()
    for (const l of body.lines) {
        const qty = Number(l.quantity)
        if (typeof l.product_id !== 'string' || !Number.isInteger(qty) || qty < 1 || qty > 50) {
            return fail(400, 'Invalid item in cart')
        }
        wanted.set(l.product_id, (wanted.get(l.product_id) ?? 0) + qty)
    }
    const ids = [...wanted.keys()]

    const db = await reachDb()

    const { data: products, error: pErr } = await db
        .from('products')
        .select('id, name, price, images, inventory_quantity, track_inventory')
        .in('id', ids)
        .eq('store_id', REACH_STORE_ID)
        .eq('is_active', true)
    if (pErr) return fail(500, pErr.message)
    if ((products ?? []).length !== ids.length) return fail(400, 'Some items are no longer available')

    const { data: links, error: lErr } = await db
        .from('reach_product_vendors')
        .select('product_id, vendor_id')
        .in('product_id', ids)
    if (lErr) return fail(500, lErr.message)
    const vendorOf = new Map<string, string>((links ?? []).map((l: any) => [l.product_id, l.vendor_id]))

    let subtotal = 0
    const items: any[] = []
    const owed = new Map<string, number>() // vendor -> what they get (their base price, no markup)

    for (const p of products as any[]) {
        const qty = wanted.get(p.id)!
        const vendorId = vendorOf.get(p.id)
        if (!vendorId) return fail(400, `${p.name} is not available`)
        const tracked = p.track_inventory ?? true
        const left = p.inventory_quantity ?? 0
        if (tracked && left < qty) return fail(409, `Only ${left} left of ${p.name}`)

        const unit = priceForBuyer(Number(p.price), REACH_STORE_ID)
        subtotal += unit * qty
        items.push({
            product_id: p.id,
            title: p.name,
            quantity: qty,
            price: unit,
            total: unit * qty,
            image_url: p.images?.[0] ?? null,
        })
        owed.set(vendorId, (owed.get(vendorId) ?? 0) + Math.round(Number(p.price) * qty))
    }

    const settings = settingsFor(REACH_STORE_ID)
    const fee = settings.paymentModel === 'escrow' ? settings.serviceFeeKes : 0
    const total = subtotal + fee

    const orderNumber = `RCH-${Date.now().toString(36).toUpperCase()}`
    const { data: order, error: oErr } = await db
        .from('orders')
        .insert({
            store_id: REACH_STORE_ID,
            order_number: orderNumber,
            status: 'pending',
            fulfillment_status: 'unfulfilled',
            subtotal,
            total,
            currency: 'KES',
            customer_phone: phone,
            source: 'reach',
        })
        .select('id, order_number')
        .single()
    if (oErr || !order) return fail(500, oErr?.message ?? 'Could not create order')

    const cleanup = async () => {
        await db.from('order_items').delete().eq('order_id', order.id)
        await db.from('orders').delete().eq('id', order.id) // payouts + payments cascade
    }

    const { error: iErr } = await db.from('order_items').insert(items.map((i) => ({ ...i, order_id: order.id })))
    if (iErr) {
        await cleanup()
        return fail(500, iErr.message)
    }

    const { error: poErr } = await db
        .from('reach_vendor_payouts')
        .insert([...owed].map(([vendor_id, amount_kes]) => ({ order_id: order.id, vendor_id, amount_kes })))
    if (poErr) {
        await cleanup()
        return fail(500, poErr.message)
    }

    const { data: payment, error: payErr } = await db
        .from('reach_payments')
        .insert({ order_id: order.id, user_id: auth.user.id, phone, amount_kes: total })
        .select('id')
        .single()
    if (payErr || !payment) {
        await cleanup()
        return fail(500, payErr?.message ?? 'Could not start payment')
    }

    try {
        const stk = await initiateStkPush({
            amountKes: total,
            phone,
            accountReference: payment.id.replace(/-/g, '').slice(0, 12),
            transactionDesc: 'Reach order',
            callbackUrl: `${appUrl}/api/webhooks/palpluss/reach`,
        })
        await db.from('reach_payments').update({ palpluss_transaction_id: stk.transactionId }).eq('id', payment.id)
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to start payment'
        await db
            .from('reach_payments')
            .update({ status: 'failed', failure_reason: message, settled_at: new Date().toISOString() })
            .eq('id', payment.id)
        return fail(502, message)
    }

    return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, total }, { status: 201 })
}