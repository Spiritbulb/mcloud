// @route-kind: partner
// POST /api/partner/waitlist  { email, product, wantsUpdates? }   (header: x-partner-secret)
// Partner (spiritb.uk) counterpart for the ecosystem waitlist. Upserts into
// the waitlist table tagged by product, sends a confirmation via Resend.
// Rate limit is a plain count against the waitlist table itself (no separate
// ratelimit module exists for partner routes yet).
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { SPIRITBULB_FROM, sendEmail } from '@mcloud/mail'
import { waitlistEmail } from '@mcloud/mail/templates'
import { fail, requirePartnerSecret } from '../_lib'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const KNOWN_PRODUCTS = new Set(['mcloud', 'reach', 'tufike', 'nuru'])
const RATE_LIMIT_WINDOW_MIN = 10
const RATE_LIMIT_MAX_ATTEMPTS = 5

const PRODUCT_LABEL: Record<string, string> = {
    mcloud: 'Menengai Cloud',
    reach: 'Reach',
    tufike: 'Tufike',
    nuru: 'Nuru',
}

export async function POST(req: NextRequest) {
    const denied = requirePartnerSecret(req)
    if (denied) return denied

    let body: { email?: unknown; product?: unknown; wantsUpdates?: unknown }
    try {
        body = await req.json()
    } catch {
        return fail(400, 'Invalid request body')
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!EMAIL_RE.test(email)) return fail(400, 'Enter a valid email address')

    const product = typeof body.product === 'string' ? body.product.trim().toLowerCase() : ''
    if (!KNOWN_PRODUCTS.has(product)) return fail(400, 'Unknown product')

    const wantsUpdates = body.wantsUpdates !== false

    const supabase = await createClient()

    // Simple in-table rate limit: too many attempts for this email recently.
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000).toISOString()
    const { count } = await supabase
        .from('waitlist')
        .select('id', { count: 'exact', head: true })
        .eq('email', email)
        .gte('created_at', windowStart)

    if ((count ?? 0) >= RATE_LIMIT_MAX_ATTEMPTS) {
        return fail(429, 'Too many attempts. Please wait a few minutes and try again.')
    }

    const { error: upsertError } = await supabase
        .from('waitlist')
        .upsert(
            { email, product, wants_updates: wantsUpdates },
            { onConflict: 'email,product' }
        )

    if (upsertError) {
        return fail(500, 'Could not join the waitlist. Please try again.')
    }

    // Best-effort confirmation — a failed email shouldn't undo the signup.
    await sendEmail({
        from: SPIRITBULB_FROM,
        to: email,
        ...waitlistEmail({ productLabel: PRODUCT_LABEL[product] ?? product }),
    })

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}