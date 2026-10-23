// @route-kind: admin
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@mcloud/db/server'
import { NextResponse, NextRequest } from 'next/server'
import { recordAudit } from '@/lib/audit'
import { clientIp, roleAfterAdmin } from '@/lib/audit-logic'

// 'user' is what the "Revoke admin" button sends: "not an admin any more". It is not a stored role;
// the server decides between 'client' and 'customer' (see roleAfterAdmin).
const ACCEPTED = new Set(['admin', 'user', 'client', 'customer'])

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const supabase = await createClient()

    const { id } = await params
    const { role: requested } = await request.json()

    if (typeof requested !== 'string' || !ACCEPTED.has(requested)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const { data: target } = await supabase.from('users').select('role').eq('id', id).maybeSingle()
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let role = requested
    if (role === 'user') {
        const [org, store] = await Promise.all([
            supabase.from('orgs').select('id', { count: 'exact', head: true }).eq('owner_id', id),
            supabase.from('stores').select('id', { count: 'exact', head: true }).eq('owner_id', id),
        ])
        role = roleAfterAdmin((org.count ?? 0) + (store.count ?? 0) > 0)
    }

    // Never leave the platform with no admin: nobody could undo it from the UI.
    if (target.role === 'admin' && role !== 'admin') {
        const { count } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'admin')
        if ((count ?? 0) <= 1) {
            return NextResponse.json({ error: 'This is the last admin; promote someone else first' }, { status: 409 })
        }
    }

    const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await recordAudit({
        actor: auth.user,
        action: 'user.role.set',
        targetType: 'user',
        targetId: id,
        summary: `Role ${target.role} → ${role}`,
        before: { role: target.role },
        after: { role },
        ip: clientIp(request.headers),
    })
    return NextResponse.json({ ok: true, role })
}
