// Database access for the WhatsApp tables (migrations/20261109_whatsapp_merchant_bot.sql).
// Service-role only. The tables are not in database.types.ts until the migration is applied and
// the types regenerated (`npm run sb-typegen -w @mcloud/web`); `db()` is the single untyped seam,
// so removing it afterwards is a one-line change.
import { createClient } from '@mcloud/db/server'
import { IDLE, generateLinkCode, hashLinkCode, parseState, type BotState } from '@mcloud/whatsapp'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function db(): Promise<any> {
    return createClient()
}

export const SESSION_TTL_MS = 30 * 60 * 1000
export const LINK_CODE_TTL_MS = 10 * 60 * 1000

export async function claimMessage(id: string): Promise<boolean> {
    const { error } = await (await db()).from('whatsapp_inbound_ids').insert({ id })
    if (!error) return true
    if (error.code === '23505') return false // already seen: a Meta retry
    throw new Error(`whatsapp_inbound_ids insert failed: ${error.message}`)
}

export async function getLinkedUserId(waId: string): Promise<string | null> {
    const { data } = await (await db())
        .from('whatsapp_links').select('user_id').eq('wa_id', waId).is('revoked_at', null).maybeSingle()
    return data?.user_id ?? null
}

export async function countFailedLinkAttempts(waId: string, sinceMs: number): Promise<number> {
    const since = new Date(Date.now() - sinceMs).toISOString()
    const { count } = await (await db())
        .from('whatsapp_link_attempts').select('id', { count: 'exact', head: true }).eq('wa_id', waId).gte('created_at', since)
    return count ?? 0
}

export async function recordFailedLinkAttempt(waId: string): Promise<void> {
    await (await db()).from('whatsapp_link_attempts').insert({ wa_id: waId })
}

export async function redeemLinkCode(
    codeHash: string,
    waId: string,
): Promise<{ ok: true; userId: string } | { ok: false; code: 'bad_code' | 'number_in_use' }> {
    const { data, error } = await (await db()).rpc('whatsapp_redeem_link_code', { p_code_hash: codeHash, p_wa_id: waId })
    if (error) throw new Error(`whatsapp_redeem_link_code failed: ${error.message}`)
    if (data?.ok) return { ok: true, userId: data.user_id as string }
    return { ok: false, code: data?.code === 'number_in_use' ? 'number_in_use' : 'bad_code' }
}

export async function loadSession(waId: string): Promise<BotState> {
    const { data } = await (await db()).from('whatsapp_sessions').select('state, updated_at').eq('wa_id', waId).maybeSingle()
    if (!data) return IDLE
    if (Date.now() - Date.parse(data.updated_at) > SESSION_TTL_MS) return IDLE
    return parseState(data.state)
}

export async function saveSession(waId: string, state: BotState): Promise<void> {
    await (await db()).from('whatsapp_sessions').upsert({ wa_id: waId, state, updated_at: new Date().toISOString() })
}

// ── Used by the org settings panel (cookie session, acting on the signed-in user's own link) ──

export async function getLinkForUser(userId: string): Promise<{ waId: string; linkedAt: string } | null> {
    const { data } = await (await db())
        .from('whatsapp_links').select('wa_id, linked_at').eq('user_id', userId).is('revoked_at', null).maybeSingle()
    return data ? { waId: data.wa_id as string, linkedAt: data.linked_at as string } : null
}

/** A fresh code for this user. Older unused codes are voided so only the newest works. */
export async function issueLinkCode(userId: string): Promise<{ code: string; expiresAt: string }> {
    const supabase = await db()
    await supabase.from('whatsapp_link_codes').update({ used_at: new Date().toISOString() }).eq('user_id', userId).is('used_at', null)
    const code = generateLinkCode()
    const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS).toISOString()
    const { error } = await supabase.from('whatsapp_link_codes').insert({ code_hash: hashLinkCode(code), user_id: userId, expires_at: expiresAt })
    if (error) throw new Error(`could not issue link code: ${error.message}`)
    return { code, expiresAt }
}

export async function revokeLink(userId: string): Promise<void> {
    const supabase = await db()
    const link = await getLinkForUser(userId)
    await supabase.from('whatsapp_links').update({ revoked_at: new Date().toISOString() }).eq('user_id', userId).is('revoked_at', null)
    await supabase.from('whatsapp_link_codes').update({ used_at: new Date().toISOString() }).eq('user_id', userId).is('used_at', null)
    if (link) await supabase.from('whatsapp_sessions').delete().eq('wa_id', link.waId)
}

/** `254700123456` -> `+254 ••• ••• 456`, enough to recognise without exposing the number. */
export function maskWaId(waId: string): string {
    if (waId.length < 7) return '+•••'
    return `+${waId.slice(0, 3)} ••• ••• ${waId.slice(-3)}`
}
