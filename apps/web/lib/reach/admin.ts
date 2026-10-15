import { createClient } from '@mcloud/db/server'
import type { AuthUser } from '@mcloud/auth/types'
import { NextResponse, type NextRequest } from 'next/server'
import { fail, requireMobileUser } from '../../app/api/mobile/_lib'

/**
 * Gate for the Reach admin screens in the mobile app. Bearer-authenticated like every mobile route,
 * plus the platform role: `users.role = 'admin'` (the same flag that gates requireAdmin on the web).
 * Being a Reach vendor or buyer does not matter; being an admin is what counts.
 */
export async function requireReachAdmin(req: NextRequest): Promise<{ user: AuthUser } | NextResponse> {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const supabase = await createClient()
    const { data } = await supabase.from('users').select('role').eq('id', auth.user.id).single()
    if (data?.role !== 'admin') return fail(403, 'Forbidden')
    return auth
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
    const supabase = await createClient()
    const { data } = await supabase.from('users').select('role').eq('id', userId).single()
    return data?.role === 'admin'
}
