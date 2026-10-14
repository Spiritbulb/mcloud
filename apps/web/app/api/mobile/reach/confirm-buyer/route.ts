// @route-kind: mobile
// POST /api/mobile/reach/confirm-buyer
import { NextResponse, type NextRequest } from 'next/server'
import { requireMobileUser, fail } from '../../_lib'
import { createClient } from '@mcloud/db/server'
import { toAppRole } from '@/lib/reach-role'

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

    // The Reach role lives in reach_users, not users.role, so any platform user can shop here.
    // Only an existing Reach VENDOR is refused: one account does not hold both Reach roles.
    const { data: existing, error: lookupError } = await supabase
        .from('reach_users')
        .select('role')
        .eq('user_id', auth.user.id)
        .maybeSingle()
    if (lookupError) return fail(500, 'Could not confirm your account')
    if (existing && existing.role !== 'buyer') {
        return fail(409, 'This account is already registered with another role. Use a different account to shop.')
    }

    const { error } = await supabase
        .from('reach_users')
        .upsert(
            { user_id: auth.user.id, role: 'buyer', name, mpesa_number: mpesaPhone, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' },
        )
    if (error) return fail(500, 'Could not confirm your account')

    return NextResponse.json({ role: toAppRole('buyer') }, { headers: { 'Cache-Control': 'no-store' } })
}
