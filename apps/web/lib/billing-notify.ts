// Billing receipts: a wallet top-up landing and a store plan being bought. Best-effort like
// every platform email: the money has already moved, so failures are swallowed.
import { createClient } from '@mcloud/db/server'
import { sendEmail } from '@mcloud/mail'
import { planPurchasedEmail, walletTopupEmail } from '@mcloud/mail/templates'
import { centsToKes } from './wallet-math'
import { WEB_ORIGIN } from './web-origin'

function billingUrl(orgSlug: string): string {
    return `${WEB_ORIGIN}/org/${orgSlug}/billing`
}

/** To whoever started the top-up. */
export async function notifyWalletTopup(input: {
    topupId: string
    orgId: string
    requestedBy: string | null
    amountCents: number
    balanceCents: number
    receipt?: string | null
}): Promise<void> {
    if (!input.requestedBy) return
    const requestedBy = input.requestedBy
    try {
        const supabase = await createClient()
        const [{ data: org }, { data: user }] = await Promise.all([
            supabase.from('orgs').select('name, slug').eq('id', input.orgId).single(),
            supabase.from('users').select('email').eq('id', requestedBy).single(),
        ])
        if (!org || !user?.email) return
        await sendEmail({
            to: user.email,
            idempotencyKey: `wallet-topup/${input.topupId}`,
            ...walletTopupEmail({
                orgName: org.name,
                amountKes: centsToKes(input.amountCents),
                balanceKes: centsToKes(input.balanceCents),
                receipt: input.receipt,
                billingUrl: billingUrl(org.slug),
            }),
        })
    } catch {
        // the wallet is already credited
    }
}

/** To the person who bought the plan. */
export async function notifyPlanPurchased(input: {
    to: string
    orgSlug: string
    storeName: string
    planLabel: string
    amountCents: number
    periodEnd: string
    balanceCents: number
}): Promise<void> {
    try {
        await sendEmail({
            to: input.to,
            ...planPurchasedEmail({
                storeName: input.storeName,
                planLabel: input.planLabel,
                amountKes: centsToKes(input.amountCents),
                periodEnd: input.periodEnd,
                balanceKes: centsToKes(input.balanceCents),
                billingUrl: billingUrl(input.orgSlug),
            }),
        })
    } catch {
        // the plan is already active
    }
}
