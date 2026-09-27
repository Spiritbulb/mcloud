// Tiny single-use state table for OAuth CSRF protection when there's no cookie
// jar to stash state in (mobile's browser sheet is a separate context from the
// app). mintOAuthState inserts a row before redirecting to the provider;
// consumeOAuthState atomically deletes it on callback — a replay finds nothing.
const TTL_MS = 10 * 60_000

export async function mintOAuthState(state: string): Promise<void> {
  const { createClient } = await import('@mcloud/db/server')
  const supabase = await createClient()
  const now = Date.now()
  // Opportunistic sweep, same pattern as tickets.ts.
  await supabase
    .from('oauth_states')
    .delete()
    .lt('expires_at', new Date(now - 86_400_000).toISOString())
  const { error } = await supabase.from('oauth_states').insert({
    state,
    expires_at: new Date(now + TTL_MS).toISOString(),
  })
  if (error) throw new Error(`mintOAuthState insert failed: ${error.message}`)
}

export async function consumeOAuthState(state: string): Promise<boolean> {
  const { createClient } = await import('@mcloud/db/server')
  const supabase = await createClient()
  const nowIso = new Date().toISOString()
  // Atomic single-use consume: delete-and-check-count, same shape as
  // redeemTicket's update-and-select. A replay deletes 0 rows.
  const { data, error } = await supabase
    .from('oauth_states')
    .delete()
    .eq('state', state)
    .gt('expires_at', nowIso)
    .select('state')
    .maybeSingle()
  if (error || !data) return false
  return true
}