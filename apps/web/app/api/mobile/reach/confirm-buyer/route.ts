// POST /api/mobile/reach/confirm-buyer
// Authed (bearer access token). Marks this user as rch-customer, unless
// they're already rch-vendor — customers and vendors are separate accounts,
// no exceptions, even at MVP.
import { NextResponse, type NextRequest } from 'next/server'
import { requireMobileUser, fail } from '../../_lib'
import { createClient } from '@mcloud/db/server'

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const supabase = await createClient()
    const { data: existing } = await supabase
        .from('users')
        .select('role')
        .eq('id', auth.user.id)
        .single()

    if (existing?.role === 'rch-vendor') {
        return fail(409, 'This Google account is already registered as a vendor. Use a different account to shop.')
    }

    const body = await req.json().catch(() => ({}))
const name = typeof body.name === 'string' ? body.name.trim() : ''
const mpesaPhone = typeof body.mpesaPhone === 'string' ? body.mpesaPhone.trim() : ''
if (!name || !mpesaPhone) return fail(400, 'Name and Mpesa number are required')

const { error } = await supabase
    .from('users')
    .update({ role: 'rch-customer', name, mpesa_number: mpesaPhone })
    .eq('id', auth.user.id)

    if (error) return fail(500, 'Could not confirm your account')

    return NextResponse.json({ role: 'rch-customer' }, { headers: { 'Cache-Control': 'no-store' } })
}