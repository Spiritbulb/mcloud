import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { NextResponse, NextRequest } from 'next/server'

// GET /api/account
export async function GET(request: NextRequest) {
    const session = await auth0.getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createClient()
    const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, avatar_url')
        .eq('id', session.user.sub)
        .single()

    if (error || !user) {
        // Fall back to Auth0 claims if the users row doesn't exist yet
        return NextResponse.json({
            id: session.user.sub,
            name: session.user.name ?? 'Account',
            email: session.user.email ?? '',
            avatar_url: session.user.picture ?? null,
        })
    }

    return NextResponse.json(user)
}

// PATCH /api/account/profile — update name
// (handled in /api/account/profile/route.ts below)

// DELETE /api/account — delete account
export async function DELETE(request: NextRequest) {
    const session = await auth0.getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createClient()
    const userId = session.user.sub

    // Cascade-delete is handled by DB foreign keys.
    // Remove the user row — everything else follows.
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

    if (error) {
        console.error('[account delete]', error.code, error.message)
        return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
}