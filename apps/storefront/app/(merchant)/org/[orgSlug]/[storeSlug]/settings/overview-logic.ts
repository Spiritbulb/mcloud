// Wording and numbers for the store Overview (settings-home-client.tsx). A commerce store sells and
// earns; a non-commerce site (an NGO) raises donations. Pure, tested in overview-logic.test.ts.

export function formatCurrency(n: number, currency: string): string {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

/**
 * Share of views that reached a later funnel step, as "12.5%". Measured against the top of the
 * funnel (not the previous step) and clamped, so a later step larger than an earlier one can't
 * read as more than 100%. Null when there were no views.
 */
export function funnelRate(step: number, views: number): string | null {
    if (!views) return null
    return `${Math.min(100, (step / views) * 100).toFixed(1)}%`
}

export function overviewHeadline(name: string, commerce: boolean, hasMoney: boolean): string {
    if (commerce) return hasMoney ? `${name} is making money.` : `${name} is ready to sell.`
    return hasMoney ? `${name} is raising money.` : `${name} is ready for donations.`
}

export function overviewSummary({ commerce, revenue, raised, currency }: {
    commerce: boolean
    revenue: number
    raised: number
    currency: string
}): string {
    if (commerce && revenue > 0) return `You've earned ${formatCurrency(revenue, currency)} so far. Keep the momentum going.`
    if (!commerce && raised > 0) return `You've raised ${formatCurrency(raised, currency)} so far. Keep the momentum going.`
    return commerce
        ? 'Add a product, share your link, and take your first order today. We handle the hosting, SSL, and uptime.'
        : 'Add a campaign, share your link, and take your first donation today. We handle the hosting, SSL, and uptime.'
}
