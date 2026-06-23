'use server'

// Closed-beta signup. Stores an interested email in `beta_signups`, then adds
// them to the beta@spiritbulb.org Google Group (wired to Play Console closed
// testing) via the Admin SDK Directory API. The signup still succeeds if the
// group add fails — the email is kept with group_status='error' for retry.
import { createClient } from '@mcloud/db/server'
import { addToBetaGroup, isGoogleGroupConfigured } from '../../../lib/google-group'

export type BetaSignupResult = { ok: true; optInUrl: string | null } | { ok: false; error: string }

// Pragmatic email shape check — not RFC-perfect, just enough to reject junk.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function joinBeta(input: { email: string; source?: string }): Promise<BetaSignupResult> {
    const email = input.email?.trim().toLowerCase() ?? ''
    if (!email || !EMAIL_RE.test(email)) {
        return { ok: false, error: 'Please enter a valid email address.' }
    }
    const source = input.source?.trim() || null
    const optInUrl = process.env.BETA_PLAY_OPT_IN_URL || null

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('beta_signups').insert({ email, source })
    if (error && error.code !== '23505') {
        console.error('[beta signup]', error.message)
        return { ok: false, error: 'Something went wrong. Please try again.' }
    }
    // Already on the list — skip group add and give them the link directly.
    if (error?.code === '23505') {
        return { ok: true, optInUrl }
    }

    // Add to the Google Group. The signup is already recorded, so any failure
    // here is non-fatal to the user — we record it on the row for retry/audit
    // and still report success to the visitor.
    if (isGoogleGroupConfigured()) {
        const result = await addToBetaGroup(email)
        const update = result.ok
            ? { group_status: 'added', group_error: null, group_added_at: new Date().toISOString() }
            : { group_status: 'error', group_error: result.error }
        if (!result.ok) console.error('[beta group]', email, result.error)
        await (supabase as any).from('beta_signups').update(update).eq('email', email)
    }

    return { ok: true, optInUrl }
}
