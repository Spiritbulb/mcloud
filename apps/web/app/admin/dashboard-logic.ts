// Pure maths behind the admin dashboard: revenue roll-ups and the needs-attention queue.
// No I/O here so it can be tested under bare `node --test` (see dashboard-logic.test.ts).

const DAY_MS = 86_400_000

export type PaidOrder = { total: number | null; currency: string | null; created_at: string | null }

export type CurrencyRevenue = {
    currency: string
    last30: number
    last7: number
    orders30: number
    /** The 30 days before that (days 31-60), for the period-over-period comparison. */
    prev30: number
    ordersPrev30: number
    /** Oldest -> newest, one entry per UTC day, for a sparkline. */
    daily: number[]
}

function dayStart(ms: number): number {
    return Math.floor(ms / DAY_MS) * DAY_MS
}

/**
 * Roll paid orders up per currency (a store can sell in a non-KES currency, and adding
 * currencies together would be meaningless). Biggest 30-day total first. Orders 31-60 days old
 * only feed the `prev30` comparison.
 */
export function summarizeRevenue(orders: PaidOrder[], now: number, days = 30): CurrencyRevenue[] {
    const today = dayStart(now)
    const by = new Map<string, CurrencyRevenue>()

    for (const o of orders) {
        if (!o.created_at || typeof o.total !== 'number' || !Number.isFinite(o.total)) continue
        const at = Date.parse(o.created_at)
        if (Number.isNaN(at) || at > now || at <= now - 60 * DAY_MS) continue

        const currency = (o.currency || 'KES').toUpperCase()
        let row = by.get(currency)
        if (!row) {
            row = { currency, last30: 0, last7: 0, orders30: 0, prev30: 0, ordersPrev30: 0, daily: new Array(days).fill(0) }
            by.set(currency, row)
        }
        if (at <= now - 30 * DAY_MS) {
            row.prev30 += o.total
            row.ordersPrev30 += 1
            continue
        }
        row.last30 += o.total
        row.orders30 += 1
        if (at > now - 7 * DAY_MS) row.last7 += o.total
        const ago = (today - dayStart(at)) / DAY_MS
        if (ago < days) row.daily[days - 1 - ago] += o.total
    }
    return [...by.values()].sort((a, b) => b.last30 - a.last30)
}

export type AttentionCounts = {
    pendingSubs: number
    pendingVendors: number
    failedWebhooks: number
}

export type AttentionItem = {
    id: keyof AttentionCounts
    label: string
    count: number
    href: string
    icon: string
}

const ATTENTION: Record<keyof AttentionCounts, Omit<AttentionItem, 'id' | 'count'>> = {
    pendingSubs: { label: 'subscriptions waiting to be activated', href: '/admin/subs', icon: 'pending_actions' },
    pendingVendors: { label: 'Reach vendors awaiting approval', href: '/admin/reach/vendors?status=pending', icon: 'storefront' },
    failedWebhooks: { label: 'failed webhooks in the last 24 hours', href: '/admin/webhooks', icon: 'webhook' },
}

/** Only the queues that have something in them, in a stable order. Empty array = all clear. */
export function attentionItems(counts: AttentionCounts): AttentionItem[] {
    return (Object.keys(ATTENTION) as (keyof AttentionCounts)[])
        .filter((id) => counts[id] > 0)
        .map((id) => ({ id, count: counts[id], ...ATTENTION[id] }))
}

/** "KES 12,400" style; whole units, since the dashboard is a headline not a ledger. */
export function formatMoney(amount: number, currency: string): string {
    return `${currency} ${Math.round(amount).toLocaleString('en-US')}`
}
