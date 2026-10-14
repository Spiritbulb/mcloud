// What the order page may show, and to whom. An order NUMBER (ORD-<time>-<9 random chars>) is a
// capability: whoever holds it, typically the shopper straight after paying, may see that the order
// exists, whether it is paid, and what is in it. Anything that identifies the person or where it is
// going (contact, address, delivery fee, tracking, per-line prices) needs the signed-in owner.
// Pure on purpose, so the line between the two tiers is tested rather than trusted.

export type OrderItemRow = {
    title?: string | null
    variant_title?: string | null
    quantity: number
    price?: number | string | null
    total?: number | string | null
}

export type OrderRow = {
    order_number: string
    status: string
    fulfillment_status?: string | null
    currency?: string | null
    total: number | string
    subtotal?: number | string | null
    shipping?: number | string | null
    created_at?: string | null
    tracking_number?: string | null
    customer_email?: string | null
    customer_phone?: string | null
    shipping_address?: unknown
    order_items?: OrderItemRow[] | null
}

export interface BasicOrderView {
    detail: 'basic'
    orderNumber: string
    createdAt: string | null
    status: string
    fulfillmentStatus: string | null
    currency: string
    total: number
    items: { title: string; variantTitle: string | null; quantity: number }[]
}

export interface FullOrderView extends Omit<BasicOrderView, 'detail' | 'items'> {
    detail: 'full'
    items: { title: string; variantTitle: string | null; quantity: number; price: number; total: number }[]
    subtotal: number | null
    shipping: number
    trackingNumber: string | null
    contact: { email: string | null; phone: string | null }
    shippingAddress: unknown
}

export type OrderView = BasicOrderView | FullOrderView

const num = (v: unknown): number => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
}

export function viewOrder(row: OrderRow, full: boolean): OrderView {
    const base = {
        orderNumber: row.order_number,
        createdAt: row.created_at ?? null,
        status: row.status,
        fulfillmentStatus: row.fulfillment_status ?? null,
        currency: row.currency || 'KES',
        total: num(row.total),
    }
    const items = row.order_items ?? []

    if (!full) {
        return {
            detail: 'basic',
            ...base,
            items: items.map((i) => ({
                title: i.title ?? 'Item',
                variantTitle: i.variant_title ?? null,
                quantity: i.quantity,
            })),
        }
    }
    return {
        detail: 'full',
        ...base,
        items: items.map((i) => ({
            title: i.title ?? 'Item',
            variantTitle: i.variant_title ?? null,
            quantity: i.quantity,
            price: num(i.price),
            total: num(i.total),
        })),
        subtotal: row.subtotal == null ? null : num(row.subtotal),
        shipping: num(row.shipping),
        trackingNumber: row.tracking_number ?? null,
        contact: { email: row.customer_email ?? null, phone: row.customer_phone ?? null },
        shippingAddress: row.shipping_address ?? null,
    }
}

/**
 * Whether the signed-in customer owns the order: linked to them, or an older guest order that
 * was never linked but carries their verified email (the same rule the account dashboard uses).
 */
export function ownsOrder(
    order: { customer_id?: string | null; customer_email?: string | null },
    customer: { id: string; email: string } | null,
): boolean {
    if (!customer) return false
    if (order.customer_id) return order.customer_id === customer.id
    return !!order.customer_email && order.customer_email.trim().toLowerCase() === customer.email.trim().toLowerCase()
}

/** Plain-language state for the top of the page. Statuses in use: pending|paid, unfulfilled|fulfilled. */
export function describeOrder(status: string, fulfillmentStatus: string | null): { headline: string; detail: string; paid: boolean } {
    if (status === 'cancelled') return { headline: 'Cancelled', detail: 'This order was cancelled.', paid: false }
    if (status !== 'paid') {
        return {
            headline: 'Awaiting payment confirmation',
            detail: 'We have your order. This page updates when your payment is confirmed.',
            paid: false,
        }
    }
    if (fulfillmentStatus === 'fulfilled') {
        return { headline: 'Paid and fulfilled', detail: 'Your order has been fulfilled.', paid: true }
    }
    return { headline: 'Paid', detail: 'Payment received. The seller is preparing your order.', paid: true }
}

/** One readable line from a stored address object (shape varies by store), or null if there is none. */
export function formatAddress(address: unknown): string | null {
    if (!address || typeof address !== 'object' || Array.isArray(address)) return null
    const parts = Object.values(address as Record<string, unknown>)
        .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
        .map((v) => v.trim())
    return parts.length ? parts.join(', ') : null
}
