// GET /api/cron/reconcile-subscriptions — daily Vercel Cron job.
//
// Re-verifies every active Google Play subscription against the Play API and sets
// stores.is_pro from the *current* truth, revoking Pro once a cancelled sub has
// actually expired. Self-healing: a skipped run only delays revocation; the next
// run recomputes everything. Idempotent.
//
// Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`.

import { createClient } from '@mcloud/db/server'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyPlaySubscription } from '../../mobile/_google-play'

export const maxDuration = 60

export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET
    if (!secret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }
    if (req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: subs, error } = await supabase
        .from('store_subscriptions')
        .select('id, store_id, google_play_purchase_token')
        .eq('provider', 'google_play')
        .eq('status', 'active')

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let checked = 0
    let revoked = 0
    let errors = 0

    for (const sub of subs ?? []) {
        const token = sub.google_play_purchase_token
        if (!token) continue
        checked++

        const result = await verifyPlaySubscription(token)
        if (!result.ok) {
            // Transient Play error — leave the row untouched; next run retries.
            console.error('[reconcile] verify failed for sub', sub.id, result.error)
            errors++
            continue
        }

        await supabase
            .from('store_subscriptions')
            .update({
                status: result.active ? 'active' : 'expired',
                period_end: result.expiryTime,
            })
            .eq('id', sub.id)

        await supabase
            .from('stores')
            .update({ is_pro: result.active })
            .eq('id', sub.store_id)

        if (!result.active) revoked++
    }

    return NextResponse.json({ checked, revoked, errors })
}
