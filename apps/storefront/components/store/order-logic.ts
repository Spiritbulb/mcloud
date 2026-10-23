// Pure helpers for the store Orders screen (order-settings.tsx): filtering, headline numbers and
// labels. No React or I/O, tested in order-logic.test.ts.

export const ORDER_FILTERS = ['all', 'pending', 'paid', 'fulfilled', 'cancelled'] as const
export type OrderFilter = (typeof ORDER_FILTERS)[number]

/** The payment and fulfilment values the merchant can set by hand (order-actions allows the same). */
export const PAYMENT_STATUSES = ['pending', 'paid', 'partially_paid', 'refunded', 'voided'] as const
export const FULFILLMENT_STATUSES = ['unfulfilled', 'partially_fulfilled', 'fulfilled'] as const

type OrderLike = { status: string; fulfillment_status: string; total: number | string }

/** A filter matches on either axis, so "fulfilled" finds fulfilled orders whatever their payment state. */
export function filterOrders<T extends OrderLike>(orders: readonly T[], filter: string): T[] {
    if (filter === 'all') return [...orders]
    return orders.filter((o) => o.status === filter || o.fulfillment_status === filter)
}

/** Headline numbers. Revenue counts paid orders only. */
export function orderStats(orders: readonly OrderLike[]) {
    const paid = orders.filter((o) => o.status === 'paid')
    return {
        total: orders.length,
        pending: orders.filter((o) => o.status === 'pending').length,
        paid: paid.length,
        revenue: paid.reduce((sum, o) => sum + Number(o.total), 0),
    }
}

export function filterCounts(orders: readonly OrderLike[]): Record<OrderFilter, number> {
    const counts = { all: orders.length } as Record<OrderFilter, number>
    for (const f of ORDER_FILTERS.slice(1)) counts[f] = filterOrders(orders, f).length
    return counts
}

/** "partially_paid" -> "Partially paid". */
export function statusLabel(status: string | null | undefined): string {
    if (!status) return '—'
    const words = status.replace(/_/g, ' ')
    return words.charAt(0).toUpperCase() + words.slice(1)
}

export function formatMoney(currency: string, value: number | string): string {
    return `${currency} ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

/** "1 item", "3 items". */
export function itemCount(n: number | undefined): string {
    const count = n ?? 0
    return count === 1 ? '1 item' : `${count} items`
}
