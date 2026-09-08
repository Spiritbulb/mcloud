'use server'

import { createClient } from '@mcloud/db/server'
import { getSession } from '@mcloud/auth/server'
import { revalidatePath } from 'next/cache'
import { planPriceCents } from '@/lib/plans'

type Plan = 'hobby' | 'pro'

type PurchasePlanRow = {
  period_end: string
  new_balance_cents: number
}

export type PurchaseResult =
  | {
      ok: true
      periodEnd: string
      newBalanceCents: number
    }
  | {
      ok: false
      error: string
    }

/**
 * Purchases, renews, or changes a store plan using the organisation wallet.
 *
 * The Postgres purchase_store_plan() RPC must remain authoritative for:
 * - Wallet-balance validation
 * - Atomic wallet debit
 * - Subscription creation/update
 * - Subscription period calculations
 * - Store is_pro state
 * - Concurrency protection
 */
export async function purchaseStorePlan(
  orgSlug: string,
  storeId: string,
  plan: Plan,
): Promise<PurchaseResult> {
  const session = await getSession()

  if (!session?.user) {
    return {
      ok: false,
      error: 'Please sign in before managing subscriptions.',
    }
  }

  if (!orgSlug || !storeId) {
    return {
      ok: false,
      error: 'Missing organisation or store information.',
    }
  }

  if (plan !== 'hobby' && plan !== 'pro') {
    return {
      ok: false,
      error: 'Please select a valid plan.',
    }
  }

  const supabase = await createClient()

  const { data: org, error: orgError } = await supabase
    .from('orgs')
    .select('id')
    .eq('slug', orgSlug)
    .maybeSingle()

  if (orgError) {
    console.error('Could not load organisation for plan purchase:', orgError)

    return {
      ok: false,
      error: 'Unable to verify the organisation. Please try again.',
    }
  }

  if (!org) {
    return {
      ok: false,
      error: 'Organisation not found.',
    }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (membershipError) {
    console.error('Could not verify billing permissions:', membershipError)

    return {
      ok: false,
      error: 'Unable to verify your billing permissions. Please try again.',
    }
  }

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return {
      ok: false,
      error: 'You do not have permission to manage billing for this organisation.',
    }
  }

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, org_id')
    .eq('id', storeId)
    .maybeSingle()

  if (storeError) {
    console.error('Could not load store for plan purchase:', storeError)

    return {
      ok: false,
      error: 'Unable to verify the store. Please try again.',
    }
  }

  if (!store || store.org_id !== org.id) {
    return {
      ok: false,
      error: 'This store does not belong to the selected organisation.',
    }
  }

  const { data, error } = await supabase.rpc('purchase_store_plan', {
    p_org_id: org.id,
    p_store_id: store.id,
    p_plan: plan,
    p_amount_cents: planPriceCents(plan),
  })

  if (error) {
    console.error('purchase_store_plan RPC failed:', error)

    const message = error.message.toLowerCase()

    if (message.includes('insufficient balance')) {
      return {
        ok: false,
        error: 'Your wallet does not have enough funds for this plan. Add funds and try again.',
      }
    }

    if (message.includes('not found')) {
      return {
        ok: false,
        error: 'The store or organisation could no longer be found.',
      }
    }

    if (message.includes('permission') || message.includes('unauthorized')) {
      return {
        ok: false,
        error: 'You do not have permission to complete this billing action.',
      }
    }

    return {
      ok: false,
      error: 'We could not update this subscription. Your wallet was not charged—please try again.',
    }
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | PurchasePlanRow
    | null
    | undefined

  if (
    !row ||
    typeof row.period_end !== 'string' ||
    typeof row.new_balance_cents !== 'number'
  ) {
    console.error('purchase_store_plan returned an unexpected response:', data)

    return {
      ok: false,
      error: 'The subscription was updated, but the billing response was incomplete. Refresh the page to confirm the current status.',
    }
  }

  revalidatePath(`/org/${orgSlug}/billing`)

  return {
    ok: true,
    periodEnd: row.period_end,
    newBalanceCents: row.new_balance_cents,
  }
}