// Service-role DB helpers for the handoff tickets. mintTicket seals the token
// pair and inserts a 60s single-use row; redeemTicket atomically consumes it.
//
// createClient (@mcloud/db/server) pulls in next/headers, which only resolves in
// the Next runtime — so it is imported dynamically INSIDE the async DB functions,
// keeping this module's top level dependency-free. That lets the pure helpers
// (newTicketId, safeRedirect) be unit-tested under bare `node --test`.
import { sealTokens, openTokens, type HandoffTokens } from './crypto'
import { newTicketId } from './ticket-id'
import { sanitizeReturnTo } from '../auth/_return-to'

export { newTicketId }

const TTL_MS = 60_000

/** Sanitize an untrusted redirect to a same-origin relative path (fallback '/'). */
export function safeRedirect(value: unknown): string {
  return sanitizeReturnTo(value, '/')
}

export async function mintTicket(tokens: HandoffTokens, redirectTo: unknown): Promise<string> {
  const { createClient } = await import('@mcloud/db/server')
  const supabase = await createClient()
  const id = newTicketId()
  const sealed = await sealTokens(tokens)
  const now = Date.now()
  // Opportunistic sweep of long-expired rows (tiny, short-lived table).
  await supabase
    .from('auth_handoff_tickets')
    .delete()
    .lt('expires_at', new Date(now - 86_400_000).toISOString())
  const { error } = await supabase.from('auth_handoff_tickets').insert({
    id,
    sealed_tokens: sealed,
    redirect_to: safeRedirect(redirectTo),
    expires_at: new Date(now + TTL_MS).toISOString(),
  })
  if (error) throw new Error(`mintTicket insert failed: ${error.message}`)
  return id
}

export async function redeemTicket(
  id: string,
): Promise<{ tokens: HandoffTokens; redirectTo: string } | null> {
  const { createClient } = await import('@mcloud/db/server')
  const supabase = await createClient()
  // Atomic single-use consume: only rows still unused AND unexpired are updated,
  // and the update returns the row. A replay updates 0 rows.
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('auth_handoff_tickets')
    .update({ used_at: nowIso })
    .eq('id', id)
    .is('used_at', null)
    .gt('expires_at', nowIso)
    .select('sealed_tokens, redirect_to')
    .maybeSingle()
  if (error || !data) return null
  const tokens = await openTokens(data.sealed_tokens)
  if (!tokens) return null
  return { tokens, redirectTo: data.redirect_to }
}
