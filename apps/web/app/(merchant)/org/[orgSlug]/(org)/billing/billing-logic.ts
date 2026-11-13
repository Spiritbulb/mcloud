// Display rules for the org Billing screen. The server (purchaseStorePlan) decides what is charged;
// these only label buttons and pre-check the wallet. Pure, tested in billing-logic.test.ts.

import { MIN_TOPUP_KES } from '@/lib/wallet-math'
import { PLAN_LIMITS, PLAN_PRICE_KES } from '@mcloud/merchant/plans'

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

/** The action label with the monthly price, e.g. "Choose Hobby · KSh 795/mo". */
export function planButtonLabel(current: string | null | undefined, plan: PaidPlan): string {
    return `${planActionLabel(current, plan)} · ${formatKes(PLAN_PRICE_KES[plan])}/mo`
}

/** KSh to add so the wallet covers `priceKes`: 0 when it already does, never below the top-up minimum. */
export function topupAmountFor(balanceKes: number, priceKes: number): number {
    if (balanceKes >= priceKes) return 0
    return Math.max(MIN_TOPUP_KES, Math.ceil(priceKes - balanceKes))
}

function countLabel(n: number, noun: string): string {
    return n === Infinity ? `Unlimited ${noun}` : `Up to ${n} ${noun}`
}

/** Two short lines on what a plan gives, built from PLAN_LIMITS so they match what the app unlocks. */
export function planBenefits(plan: PaidPlan): string[] {
    const limits = PLAN_LIMITS[plan]
    if (plan === 'hobby') {
        return [
            'Your own domain, analytics and a blog',
            `${countLabel(limits.products, 'products')} and ${limits.members} team members`,
        ]
    }
    return [
        'Everything in Hobby, without our branding',
        `${countLabel(limits.products, 'products')}, ${limits.members} team members, priority support`,
    ]
}

export type PollStep = 'confirm' | 'balance-ready' | 'timeout' | 'wait'

/**
 * One balance check after a shortfall top-up. `busy` means another confirm or purchase is open or
 * running: then the plan's confirm must not replace it, so the row is told the balance is ready.
 */
export function pollStep(balanceCents: number | null, priceKes: number, tries: number, maxTries: number, busy: boolean): PollStep {
    if (balanceCents !== null && balanceCents / 100 >= priceKes) return busy ? 'balance-ready' : 'confirm'
    return tries >= maxTries ? 'timeout' : 'wait'
}
