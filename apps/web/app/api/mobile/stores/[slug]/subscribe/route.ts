// POST /api/mobile/stores/[slug]/subscribe — verify a Google Play subscription
// purchase and grant the store Pro. Bearer-authed (WorkOS access token).
//
// Body: { purchaseToken: string, productId: string }
// The client buys the subscription natively (expo-iap), then sends us the purchase
// token. We verify it against the Google Play Developer API before granting — and
// only after we return success does the client acknowledge the purchase.

import { createClient } from '@mcloud/db/server'
import { NextResponse, type NextRequest } from 'next/server'
import { requireMobileUser, fail } from '../../../_lib'
import { verifyPlaySubscription } from '../../../_google-play'
import { planForSku } from '@/lib/plan-skus'

const HOBBY_SKU = process.env.GOOGLE_PLAY_HOBBY_SKU
const PRO_SKU = process.env.GOOGLE_PLAY_PRO_SKU

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { slug } = await params

    let purchaseToken = ''
    let productId = ''
    try {
        const body = await req.json()
        purchaseToken = body?.purchaseToken ?? ''
        productId = body?.productId ?? ''
    } catch {
        // fall through to validation
    }
    if (!purchaseToken) return fail(400, 'purchaseToken required')
    if (!HOBBY_SKU && !PRO_SKU) return fail(500, 'No Google Play SKUs configured')

    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('id, name, slug, is_pro')
        .eq('slug', slug)
        .single()

    if (!store) return fail(404, 'Store not found')

    const { data: membership } = await supabase
        .from('store_members')
        .select('role')
        .eq('store_id', store.id)
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .single()

    if (!membership) return fail(403, 'Forbidden')

    // A purchase token must not already belong to a different store.
    const { data: existing } = await supabase
        .from('store_subscriptions')
        .select('store_id')
        .eq('google_play_purchase_token', purchaseToken)
        .maybeSingle()

    if (existing && existing.store_id !== store.id) {
        return fail(409, 'Purchase already linked to another store')
    }

    // Verify the token with Google before granting anything.
    const result = await verifyPlaySubscription(purchaseToken)
    if (!result.ok) return fail(502, result.error)
    if (!result.active) return fail(400, 'Subscription is not active')

    const plan = planForSku(result.productId ?? '', { hobby: HOBBY_SKU, pro: PRO_SKU })
    if (!plan) return fail(400, 'Unexpected product')

    // Idempotent upsert keyed on the unique purchase token — safe to call twice
    // (covers a retry of an interrupted acknowledgement).
    await supabase
        .from('store_subscriptions')
        .upsert(
            {
                store_id: store.id,
                provider: 'google_play',
                google_play_purchase_token: purchaseToken,
                google_play_order_id: result.orderId,
                google_play_product_id: result.productId,
                plan,
                amount: 0,
                currency: 'KES',
                status: 'active',
                period_end: result.expiryTime,
            },
            { onConflict: 'google_play_purchase_token' }
        )

    await supabase.from('stores').update({ is_pro: true }).eq('id', store.id)

    return NextResponse.json({ ok: true, pro: true, plan, expiresAt: result.expiryTime })
}
