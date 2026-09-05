// apps/web/lib/wallet-db.ts
// Org credit wallet, ledger, and per-server hourly billing state. Mirrors
// servers-db.ts: plain async functions, @mcloud/db/server client, org-scoped,
// throw on hard DB errors. Balances are stored in KES cents (integers) to
// avoid float drift across many hourly charges.
import { createClient } from '@mcloud/db/server'

export const MIN_TOPUP_KES = 750
export const MIN_TOPUP_CENTS = MIN_TOPUP_KES * 100

export function kesToCents(kes: number) {
  return Math.round(kes * 100)
}

export function centsToKes(cents: number) {
  return cents / 100
}

/** Hourly rate derived from a monthly KES price. Convention: monthly ÷ 730. */
export function hourlyRateCentsForMonthlyKes(monthlyKesPrice: number): number {
  return Math.ceil(kesToCents(monthlyKesPrice) / 730)
}

export async function getWalletBalanceCents(orgId: string): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('org_wallets')
    .select('balance_cents')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data?.balance_cents ?? 0
}

type LedgerKind = 'topup' | 'hourly_charge' | 'refund' | 'adjustment'
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

/**
 * Atomically adjusts an org's wallet balance and writes a ledger entry, via
 * the adjust_org_wallet() Postgres function — locks the wallet row so a
 * topup landing at the same moment as an hourly charge can't race.
 * Positive amountCents credits, negative debits. Throws if a debit would
 * take the balance below zero.
 */
export async function adjustWallet(input: {
  orgId: string
  amountCents: number
  kind: LedgerKind
  serverId?: string
  reference?: string
  metadata?: Record<string, unknown>
}): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('adjust_org_wallet', {
    p_org_id: input.orgId,
    p_amount_cents: input.amountCents,
    p_kind: input.kind,
    p_server_id: input.serverId ?? undefined,
    p_reference: input.reference ?? undefined,
    p_metadata: (input.metadata ?? {}) as Json,
  })

  if (error) throw new Error(error.message)
  return data as number
}

export async function canAffordHourlyRate(
  orgId: string,
  hourlyRateCents: number,
): Promise<{ ok: boolean; balanceCents: number }> {
  const balanceCents = await getWalletBalanceCents(orgId)
  return { ok: balanceCents >= hourlyRateCents, balanceCents }
}

// ── Top-ups ──────────────────────────────────────────────────────────────

export async function createPendingTopup(input: {
  orgId: string
  requestedBy: string
  amountCents: number
  phone: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('wallet_topups')
    .insert({
      org_id: input.orgId,
      requested_by: input.requestedBy,
      amount_cents: input.amountCents,
      phone: input.phone,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function attachPalplussTransaction(topupId: string, transactionId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('wallet_topups')
    .update({ palpluss_transaction_id: transactionId })
    .eq('id', topupId)

  if (error) throw new Error(error.message)
}

export async function markTopupFailed(topupId: string, resultDesc: string) {
  const supabase = await createClient()
  await supabase.from('wallet_topups').update({ status: 'failed', result_desc: resultDesc }).eq('id', topupId)
}

export async function getTopupByPalplussTransactionId(transactionId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('wallet_topups')
    .select('id, org_id, status')
    .eq('palpluss_transaction_id', transactionId)
    .maybeSingle()
  return data
}

export async function resolveTopup(
  topupId: string,
  status: 'success' | 'failed' | 'cancelled' | 'expired',
  fields: { mpesaReceipt?: string | null; resultDesc?: string | null },
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('wallet_topups')
    .update({
      status,
      mpesa_receipt: fields.mpesaReceipt ?? null,
      result_desc: fields.resultDesc ?? null,
    })
    .eq('id', topupId)

  if (error) throw new Error(error.message)
}

// ── Per-server billing state ────────────────────────────────────────────

export async function seedServerBilling(input: { serverId: string; orgId: string; hourlyRateCents: number }) {
  const supabase = await createClient()
  const { error } = await supabase.from('server_billing').insert({
    server_id: input.serverId,
    org_id: input.orgId,
    hourly_rate_cents: input.hourlyRateCents,
    last_billed_at: new Date().toISOString(),
  })

  if (error) throw new Error(error.message)
}

export async function listBillableServers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('server_billing')
    .select('server_id, org_id, hourly_rate_cents, last_billed_at, suspended_at, servers!inner(id, upcloud_uuid, state)')
    .is('suspended_at', null)
    .eq('servers.state', 'started')

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function markServerBilled(serverId: string, billedAt: string) {
  const supabase = await createClient()
  await supabase.from('server_billing').update({ last_billed_at: billedAt }).eq('server_id', serverId)
}

export async function suspendServerBilling(serverId: string, suspendedAt: string) {
  const supabase = await createClient()
  await supabase
    .from('server_billing')
    .update({ last_billed_at: suspendedAt, suspended_at: suspendedAt })
    .eq('server_id', serverId)
}