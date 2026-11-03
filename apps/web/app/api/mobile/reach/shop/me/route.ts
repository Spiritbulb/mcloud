// @route-kind: customer
// GET   /api/mobile/reach/shop/me — the signed-in shopper's profile (created on first call)
// PATCH /api/mobile/reach/shop/me — update name / M-Pesa number
import { NextResponse, type NextRequest } from 'next/server'
import { reachDb } from '@/lib/reach/db'
import { validateShopperProfile } from '@/lib/reach/shop-logic'
import type { Shopper } from '@/lib/reach/shopper'
import { fail, requireReachShopper } from '../../../_lib'

function shape(s: Shopper) {
    return { name: s.name, email: s.email, mpesaPhone: s.mpesaNumber, linked: !!s.legacyUserId }
}

export async function GET(req: NextRequest) {
    const auth = await requireReachShopper(req)
    if (auth instanceof NextResponse) return auth
    return NextResponse.json({ shopper: shape(auth.shopper) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(req: NextRequest) {
    const auth = await requireReachShopper(req)
    if (auth instanceof NextResponse) return auth

    const input = validateShopperProfile(await req.json().catch(() => null))
    if (!input.ok) return fail(400, input.error)

    const update: Record<string, string> = { updated_at: new Date().toISOString() }
    if (input.name !== undefined) update.name = input.name
    if (input.mpesaPhone !== undefined) update.mpesa_number = input.mpesaPhone

    const db = await reachDb()
    const { error } = await db.from('reach_shoppers').update(update).eq('id', auth.shopper.id)
    if (error) return fail(500, 'Could not save your details')

    const next = { ...auth.shopper, name: input.name ?? auth.shopper.name, mpesaNumber: input.mpesaPhone ?? auth.shopper.mpesaNumber }
    return NextResponse.json({ shopper: shape(next) })
}
