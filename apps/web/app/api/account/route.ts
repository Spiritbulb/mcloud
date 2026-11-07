// @route-kind: session — acts only on the caller's own user row
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { NextResponse, NextRequest } from 'next/server'
import { deleteUserAccount } from '@mcloud/merchant/account-deletion'

// GET /api/account
export async function GET(request: NextRequest) {
    const session = await getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createClient()
    const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, avatar_url')
        .eq('id', session.user.id)
        .single()

    if (error || !user) {
        // Fall back to the session user's claims if the users row doesn't exist yet
        return NextResponse.json({
            id: session.user.id,
            name: session.user.name ?? 'Account',
            email: session.user.email ?? '',
            avatar_url: session.user.avatarUrl ?? null,
        })
    }

    return NextResponse.json(user)
}

// PATCH /api/account/profile — update name
// (handled in /api/account/profile/route.ts below)

// DELETE /api/account — delete account
export async function DELETE(request: NextRequest) {
    const session = await getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createClient()
    const userId = session.user.id

    // One transaction in the database; refuses, changing nothing, when an org has nobody to take it
    // over. (Every foreign key to users is NO ACTION, so a plain delete of the row cannot work.)
    const deleted = await deleteUserAccount(supabase, userId)
    if (deleted.message) return NextResponse.json({ error: deleted.message }, { status: deleted.result ? 409 : 500 })

    return NextResponse.json({ ok: true })
}