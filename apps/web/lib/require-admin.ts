// The one platform-admin gate for API routes. `users.role = 'admin'` is read with the
// service-role client (RLS would hide it from the caller). Usage:
//
//   const auth = await requireAdmin(request)
//   if (auth instanceof NextResponse) return auth
import { getSession } from '@mcloud/auth/server'
import type { AuthUser } from '@mcloud/auth/types'
import { createClient } from '@mcloud/db/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function requireAdmin(request: NextRequest): Promise<{ user: AuthUser } | NextResponse> {
    const session = await getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createClient()
    const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single()
    if (data?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return { user: session.user }
}
