// POST /api/mobile/reach/confirm-buyer
import { NextResponse, type NextRequest } from 'next/server'
import { requireMobileUser, fail } from '../../_lib'
import { createClient } from '@mcloud/db/server'

// match what normalizeKenyanPhone returns
const MPESA_RE = /^0[71]\d{8}$/

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const body = await req.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const mpesaPhone = typeof body.mpesaPhone === 'string' ? body.mpesaPhone.trim() : ''
    if (name.length < 2 || name.length > 80) return fail(400, 'Enter your name')
    if (!MPESA_RE.test(mpesaPhone)) return fail(400, 'Enter a valid M-Pesa number')

    const supabase = await createClient()
    const { data: updated, error } = await supabase
        .from('users')
        .update({ role: 'rch-customer', name, mpesa_number: mpesaPhone })
        .eq('id', auth.user.id)
        .in('role', ['user', 'rch-customer'])
        .select('role')
        .maybeSingle()

    if (error) return fail(500, 'Could not confirm your account')
    if (!updated) {
        return fail(409, 'This account is already registered with another role. Use a different account to shop.')
    }

    return NextResponse.json({ role: 'rch-customer' }, { headers: { 'Cache-Control': 'no-store' } })
}