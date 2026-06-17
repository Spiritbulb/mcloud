'use server'

// Closed-beta signup. Stores an interested email in `beta_signups`; the team
// reviews the table and manually adds approved people to the Google Group.
// No Google API / email notification by design (see the beta page).
import { createClient } from '@mcloud/db/server'

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
    const { error } = await (supabase as any).from('beta_signups').insert({ email, source })

    if (error) {
        // 23505 = unique_violation → already on the list, which is a success.
        if (error.code === '23505') return { ok: true }
        console.error('[beta signup]', error.message)
        return { ok: false, error: 'Something went wrong. Please try again.' }
    }
    return { ok: true }
}
