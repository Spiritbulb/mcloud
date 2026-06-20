// POST /api/mobile/stores/[slug]/subscribe — start a Pro subscription for a store
// from the mobile app. Bearer-authed (WorkOS access token). Mirrors the former web
// /api/store/[slug]/subscribe flow; this is the surface we'll wire Google Play
// billing into for testing. For now it initializes a Paystack transaction and
// returns a checkout URL.

import { createClient } from '@mcloud/db/server'
import { NextResponse, type NextRequest } from 'next/server'
import { requireMobileUser, fail } from '../../../_lib'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!

const PLANS = {
    hobby: { code: 'PLN_10bmosuhh7p4zhw', amount: 149900 }, // KES 1499 in kobo
    pro: { code: 'PLN_ob4j8tgco6e63b0', amount: 249900 },   // KES 2499 in kobo
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { slug } = await params

    let plan: 'hobby' | 'pro' = 'pro'
    try {
        const body = await req.json()
        if (body?.plan) plan = body.plan
    } catch {
        // No body — default to 'pro'
    }

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
    if (store.is_pro) return fail(400, 'Already subscribed')

    const selectedPlan = PLANS[plan] ?? PLANS.pro

    let paystackRes: Response
    try {
        paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: user.email,
                amount: selectedPlan.amount,
                plan: selectedPlan.code,
                currency: 'KES',
                metadata: {
                    store_id: store.id,
                    store_slug: slug,
                    plan_tier: plan,
                    user_id: user.id,
                },
            }),
        })
    } catch (err) {
        console.error('[mobile subscribe] Paystack fetch failed:', err)
        return fail(502, 'Could not reach Paystack')
    }

    const rawText = await paystackRes.text()
    if (!rawText) {
        console.error('[mobile subscribe] Paystack empty response', paystackRes.status)
        return fail(502, 'Paystack returned an empty response')
    }

    let paystackData: any
    try {
        paystackData = JSON.parse(rawText)
    } catch {
        console.error('[mobile subscribe] Paystack non-JSON:', paystackRes.status, rawText)
        return fail(502, 'Unexpected response from Paystack')
    }

    if (!paystackData.status) {
        console.error('[mobile subscribe] Paystack error:', paystackData.message)
        return fail(502, paystackData.message)
    }

    await supabase.from('store_subscriptions').insert({
        store_id: store.id,
        paystack_reference: paystackData.data.reference,
        amount: selectedPlan.amount / 100,
        currency: 'KES',
        plan,
        status: 'pending',
    })

    return NextResponse.json({ url: paystackData.data.authorization_url })
}
