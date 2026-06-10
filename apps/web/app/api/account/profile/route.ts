import { getSession } from '@/lib/auth/server'
import { createClient } from '@/lib/server'
import { NextResponse, NextRequest } from 'next/server'

// PATCH /api/account/profile
export async function PATCH(request: NextRequest) {
    const session = await getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : null

    if (!name || name.length < 1) {
        return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('users')
        .update({ name })
        .eq('id', session.user.id)

    if (error) {
        console.error('[profile update]', error.code, error.message)
        return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
}