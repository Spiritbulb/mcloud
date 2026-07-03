// POST /api/beta/join  { email, source? }
// Public, cross-origin endpoint that adds an email to the beta@spiritbulb.org
// Google Group (wired to Play Console closed testing) and returns the Play
// opt-in URL. Mirrors the /beta page's joinBeta server action, but callable from
// other origins (e.g. spiritbulb.org/nuru). CORS reflection is added by proxy.ts
// for all /api/* routes. The signup is recorded in beta_signups; a group-add
// failure is non-fatal (kept for retry), same as the on-site action.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { addToBetaGroup, isGoogleGroupConfigured } from '../../../../lib/google-group'
import { allowMagicSend } from '../../_auth-ratelimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// One shared closed-testing group covers every mcloud beta app; the opt-in URL
// is per-app. Nuru's Play testing link:
const NURU_OPT_IN_URL = 'https://play.google.com/apps/testing/co.ke.mcloud.nuru'

export async function POST(req: NextRequest) {
    let body: { email?: unknown; source?: unknown }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!EMAIL_RE.test(email)) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }
    const source = typeof body.source === 'string' ? body.source.trim() || null : null

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    if (!allowMagicSend(email, ip)) {
        return NextResponse.json(
            { error: 'Too many attempts. Please wait a few minutes and try again.' },
            { status: 429 },
        )
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('beta_signups').insert({ email, source })
    if (error && error.code !== '23505') {
        console.error('[beta join]', error.message)
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
    }

    // Already on the list — give them the link directly, no duplicate group add.
    if (error?.code === '23505') {
        return NextResponse.json({ ok: true, optInUrl: NURU_OPT_IN_URL }, { headers: { 'Cache-Control': 'no-store' } })
    }

    // Add to the Google Group. Non-fatal on failure — the signup is recorded, so
    // we store the error on the row for retry and still return the link.
    if (isGoogleGroupConfigured()) {
        const result = await addToBetaGroup(email)
        const update = result.ok
            ? { group_status: 'added', group_error: null, group_added_at: new Date().toISOString() }
            : { group_status: 'error', group_error: result.error }
        if (!result.ok) console.error('[beta join group]', email, result.error)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('beta_signups').update(update).eq('email', email)
    }

    return NextResponse.json({ ok: true, optInUrl: NURU_OPT_IN_URL }, { headers: { 'Cache-Control': 'no-store' } })
}
