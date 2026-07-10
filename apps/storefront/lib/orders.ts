// lib/orders.ts
// Provider-agnostic order creation shared by the product checkout and the NGO
// donation endpoint. The caller hands in ALREADY-PRICED lines — this core never
// computes or second-guesses a line price. Checkout authorizes prices by
// recomputing from product rows; /donate authorizes by validating the donor
// amount against the campaign. Keeping price authority in the callers preserves
// the checkout invariant "the client never sets a product price."
import { createClient } from '@mcloud/db/server'
import type { Json } from '@mcloud/db/types'

export interface OrderLineInput {
  product_id: string | null
  variant_id?: string | null
  quantity: number
  price: number
  title: string
  variant_title?: string | null
  image_url?: string | null
}

export interface CreateOrderInput {
  storeId: string
  guest: { mpesaPhone?: string; email?: string; whatsapp?: string }
  lines: OrderLineInput[]
  paymentMethod: 'mpesa' | 'paypal'
  idempotencyKey: string
  source: 'storefront' | 'donation'
  extraOrderMetadata?: Record<string, unknown>
}

export type CreateOrderResult =
  | { error: string; status: number; orderNumber?: undefined }
  | { error: null; orderNumber: string; total: number }

/** Floor each quantity to an integer >= 1 and compute per-line + subtotal. Pure. */
export function buildLineTotals(
  lines: OrderLineInput[],
): { items: (OrderLineInput & { total: number })[]; subtotal: number } {
  const items = lines.map((l) => {
    const quantity = Math.max(1, Math.floor(Number(l.quantity) || 0))
    return { ...l, quantity, total: l.price * quantity }
  })
  const subtotal = items.reduce((s, i) => s + i.total, 0)
  return { items, subtotal }
}

export async function createOrderWithPayment(input: CreateOrderInput): Promise<CreateOrderResult> {
  const { storeId, guest, paymentMethod, idempotencyKey, source, extraOrderMetadata } = input
  const method = paymentMethod === 'paypal' ? 'paypal' : 'mpesa'
  const admin = await createClient()

  // ── Idempotency: an existing order for this key is returned unchanged. ──
  const { data: prior } = await admin
    .from('orders')
    .select('id, order_number, total')
    .eq('store_id', storeId)
    .eq('metadata->>idempotency_key', idempotencyKey)
    .maybeSingle()
  if (prior) {
    return { error: null, orderNumber: prior.order_number, total: Number(prior.total) }
  }

  const { items, subtotal } = buildLineTotals(input.lines)
  const total = subtotal // tax/shipping/discount are 0 today, matching checkout

  // ── Guest customer upsert (matched by mpesa_phone within the store). ──
  const phoneKey = guest.mpesaPhone?.trim() || null
  const emailKey = guest.email?.trim() || null
  const whatsapp = guest.whatsapp?.trim() || phoneKey

  let customerId: string
  const customerLookup = admin.from('customers').select('id').eq('store_id', storeId)
  const { data: existing } = await (
    phoneKey ? customerLookup.eq('mpesa_phone', phoneKey) : customerLookup.is('mpesa_phone', null)
  ).maybeSingle()

  if (existing) {
    customerId = existing.id
    await admin
      .from('customers')
      .update({ ...(emailKey && { email: emailKey }), whatsapp_number: whatsapp })
      .eq('id', customerId)
  } else {
    const { data: created, error: ce } = await admin
      .from('customers')
      .insert({
        store_id: storeId,
        mpesa_phone: phoneKey,
        email: emailKey,
        whatsapp_number: whatsapp,
        first_name: 'Guest',
        last_name: '',
      })
      .select('id')
      .single()
    if (ce || !created) return { error: 'Could not start checkout', status: 500 }
    customerId = created.id
  }

  // ── Create the order (server-generated number, server-computed total). ──
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      store_id: storeId,
      customer_id: customerId,
      order_number: orderNumber,
      status: 'pending',
      fulfillment_status: 'unfulfilled',
      subtotal,
      tax: 0,
      shipping: 0,
      discount: 0,
      total,
      currency: 'KES',
      customer_email: emailKey,
      customer_phone: phoneKey,
      source,
      metadata: {
        idempotency_key: idempotencyKey,
        payment_method: method === 'mpesa' ? 'MPESA' : 'PayPal',
        payment_status: 'pending',
        mpesa_phone: phoneKey,
        whatsapp_number: whatsapp,
        ...(extraOrderMetadata ?? {}),
      } as unknown as Json,
    })
    .select('id, order_number')
    .single()
  if (orderError || !order) return { error: 'Could not create order', status: 500 }

  const { error: itemsError } = await admin.from('order_items').insert(
    items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      variant_id: i.variant_id ?? null,
      quantity: i.quantity,
      price: i.price,
      total: i.total,
      title: i.title,
      variant_title: i.variant_title ?? null,
      image_url: i.image_url ?? null,
    })),
  )
  if (itemsError) return { error: 'Could not create order items', status: 500 }

  return { error: null, orderNumber: order.order_number, total }
}
