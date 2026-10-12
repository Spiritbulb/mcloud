// Pure payment rules shared by the web and storefront payment routes. The routes do the
// I/O; the decisions about WHAT may be charged and WHEN an order counts as paid live here
// so they are tested once and cannot drift between the two apps.

/** Fixed KES→USD rate PayPal orders are priced at. */
export const KES_TO_USD = 0.0077

/** An order can take a payment only while it is pending and not already completed. */
export function orderIsPayable(order: { status: string | null; metadata: unknown }): boolean {
    if (order.status !== 'pending') return false
    const meta = isRecord(order.metadata) ? order.metadata : {}
    return meta.payment_status !== 'completed'
}

/** Daraja only accepts whole shillings; the amount we ask for is the order total rounded up. */
export function mpesaAmountDue(total: number): number {
    return Math.ceil(Number(total))
}

/** True when what Safaricom reports as paid covers the order (no underpayment). */
export function mpesaPaymentCovers(paid: unknown, total: number): boolean {
    const n = Number(paid)
    return Number.isFinite(n) && n >= mpesaAmountDue(total)
}

/**
 * Normalise a Kenyan mobile number to 2547XXXXXXXX / 2541XXXXXXXX, or null when it is
 * not one. Accepts 07…, 01…, +254…, 254….
 */
export function normalizeKenyanPhone(raw: unknown): string | null {
    if (typeof raw !== 'string') return null
    const digits = raw.replace(/[\s()-]/g, '').replace(/^\+/, '')
    const full = /^0[17]\d{8}$/.test(digits) ? `254${digits.slice(1)}` : digits
    return /^254[17]\d{8}$/.test(full) ? full : null
}

export interface PayableLine {
    title: string
    price: number
    quantity: number
}

export interface PaypalAmounts {
    /** Per line, USD cents per unit (rounded the way PayPal items are). */
    lines: { title: string; unitCents: number; quantity: number }[]
    itemCents: number
    shippingCents: number
    totalCents: number
}

const usdCents = (kes: number) => Math.round(Number(kes) * 100 * KES_TO_USD)

/** Price a PayPal order from the stored order lines, never from client input. */
export function paypalAmounts(lines: PayableLine[], shippingKes: number): PaypalAmounts {
    const priced = lines.map((l) => ({
        title: l.title,
        unitCents: usdCents(l.price),
        quantity: Math.max(1, Math.floor(Number(l.quantity) || 1)),
    }))
    const itemCents = priced.reduce((s, l) => s + l.unitCents * l.quantity, 0)
    const shippingCents = usdCents(shippingKes || 0)
    return { lines: priced, itemCents, shippingCents, totalCents: itemCents + shippingCents }
}

export const centsToUsd = (cents: number) => (cents / 100).toFixed(2)

/** True when the amount PayPal captured (decimal string) equals what we priced. */
export function paypalCaptureMatches(captured: unknown, expectedCents: number): boolean {
    const n = Number(captured)
    return Number.isFinite(n) && Math.round(n * 100) === expectedCents
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v)
}
