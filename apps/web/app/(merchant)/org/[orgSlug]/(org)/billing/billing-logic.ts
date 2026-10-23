// Display rules for the org Billing screen. The server (purchaseStorePlan) decides what is charged;
// these only label buttons and pre-check the wallet. Pure, tested in billing-logic.test.ts.

export type PaidPlan = 'hobby' | 'pro'

export type StoreSubscription = { plan: string | null; status: string; period_end: string | null } | null

export function isPaidPlanName(plan: string | null | undefined): plan is PaidPlan {
    return plan === 'hobby' || plan === 'pro'
}

export function planLabel(plan: string | null | undefined): string {
    if (!plan) return 'Free'
    return plan.charAt(0).toUpperCase() + plan.slice(1)
}

export function formatKes(amount: number): string {
    return `KSh ${amount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
}

export function formatDate(iso: string | null): string {
    if (!iso) return '—'
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** The plan a store is on right now: an active subscription's plan, otherwise none (Free). */
export function currentPlanOf(subscription: StoreSubscription): string | null {
    return subscription?.status === 'active' ? subscription.plan : null
}

/** "Renew plan", "Upgrade to Pro", "Switch to Hobby" or "Choose Pro", from the current plan. */
export function planActionLabel(current: string | null | undefined, plan: PaidPlan): string {
    if (current === plan) return 'Renew plan'
    if (current === 'hobby' && plan === 'pro') return 'Upgrade to Pro'
    if (isPaidPlanName(current)) return `Switch to ${planLabel(plan)}`
    return `Choose ${planLabel(plan)}`
}

/** Why the wallet cannot pay for `plan`, or null when it can. */
export function shortfallMessage(balanceKes: number, plan: PaidPlan, priceKes: number): string | null {
    if (balanceKes >= priceKes) return null
    return `Your wallet balance is too low for the ${planLabel(plan)} plan. Add at least ${formatKes(priceKes - balanceKes)} to continue.`
}
