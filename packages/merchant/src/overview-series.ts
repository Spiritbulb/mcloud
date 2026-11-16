// Per-day takings for the store Overview's trend panel. Pure: getStoreOverview passes in the order
// rows it already reads. Days are Nairobi calendar days (UTC+3, no daylight saving), so an order
// at 02:00 local time lands on the day the merchant saw it. Tested in overview-series.test.ts.

export type DailyPoint = { date: string; amount: number; count: number }

export type SeriesOrder = {
    total: number | null
    status: string | null
    created_at: string | null
    metadata?: unknown
}

const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** Commerce order statuses that mean the money came in. */
const PAID_STATUSES = new Set(['paid', 'processing', 'shipped', 'delivered'])

function nairobiDay(ms: number): string {
    return new Date(ms + NAIROBI_OFFSET_MS).toISOString().slice(0, 10)
}

/** Same rule as the Overview's donation totals: tagged as a donation and completed. */
function isCompletedDonation(metadata: unknown): boolean {
    const md = (metadata ?? {}) as Record<string, unknown>
    return (md.isDonation === true || md.isDonation === 'true') && md.payment_status === 'completed'
}

export function dailySeries(
    orders: SeriesOrder[],
    { days, now, commerce }: { days: number; now: Date; commerce: boolean },
): DailyPoint[] {
    const series: DailyPoint[] = []
    const index = new Map<string, DailyPoint>()
    for (let i = days - 1; i >= 0; i--) {
        const point = { date: nairobiDay(now.getTime() - i * DAY_MS), amount: 0, count: 0 }
        series.push(point)
        index.set(point.date, point)
    }

    for (const o of orders) {
        const counts = commerce ? PAID_STATUSES.has(o.status ?? '') : isCompletedDonation(o.metadata)
        if (!counts) continue
        const ms = o.created_at ? Date.parse(o.created_at) : NaN
        if (Number.isNaN(ms)) continue
        const point = index.get(nairobiDay(ms))
        if (!point) continue
        point.amount += Number(o.total) || 0
        point.count++
    }
    return series
}

/** True when nothing came in over the whole window (draw a message, not a flat line). */
export function seriesIsEmpty(series: DailyPoint[]): boolean {
    return series.every((d) => d.amount === 0)
}
