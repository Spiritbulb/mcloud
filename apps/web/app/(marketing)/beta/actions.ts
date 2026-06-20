'use server'

// Closed-beta signup. Stores an interested email in `beta_signups`, then adds
// them to the beta@spiritbulb.org Google Group (wired to Play Console closed
// testing) via the Admin SDK Directory API. The signup still succeeds if the
// group add fails — the email is kept with group_status='error' for retry.
import { createClient } from '@mcloud/db/server'
import { addToBetaGroup, isGoogleGroupConfigured } from '../../../lib/google-group'
import { sendBetaWelcome } from '../../../lib/beta-email'

export type BetaSignupResult = { ok: true } | { ok: false; error: string }

// Pragmatic email shape check — not RFC-perfect, just enough to reject junk.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function joinBeta(input: { email: string; source?: string }): Promise<BetaSignupResult> {
    const email = input.email?.trim().toLowerCase() ?? ''
    if (!email || !EMAIL_RE.test(email)) {
        return { ok: false, error: 'Please enter a valid email address.' }
    }
    const source = input.source?.trim() || null

    const supabase = await createClient()
    // `beta_signups` isn't in the generated Database types yet (regenerate types
    // after creating the table to drop this cast). Until then, talk to the table
    // through an untyped client so the insert compiles.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // Insert the signup. The unique index is on lower(email); a returning email
    // raises 23505, which we treat as success (already on the list) and still
    // re-attempt the group add below in case a prior add failed.
    const { error } = await (supabase as any).from('beta_signups').insert({ email, source })
    if (error && error.code !== '23505') {
        console.error('[beta signup]', error.message)
        return { ok: false, error: 'Something went wrong. Please try again.' }
    }
    // A 23505 means they were already on the list; don't re-send the welcome.
    const isNewSignup = !error

    // Add to the Google Group. The signup is already recorded, so any failure
    // here is non-fatal to the user — we record it on the row for retry/audit
    // and still report success to the visitor.
    let addedToGroup = false
    if (isGoogleGroupConfigured()) {
        const result = await addToBetaGroup(email)
        addedToGroup = result.ok
        const update = result.ok
            ? { group_status: 'added', group_error: null, group_added_at: new Date().toISOString() }
            : { group_status: 'error', group_error: result.error }
        if (!result.ok) console.error('[beta group]', email, result.error)
        await (supabase as any).from('beta_signups').update(update).eq('email', email)
    }

    // Welcome email — only for a brand-new signup that made it into the group,
    // so resubmits and failed adds don't trigger mail. Best-effort; never blocks.
    if (isNewSignup && addedToGroup) {
        const mail = await sendBetaWelcome(email)
        if (!mail.ok) console.error('[beta welcome]', email, mail.error)
    }

    return { ok: true }
}
