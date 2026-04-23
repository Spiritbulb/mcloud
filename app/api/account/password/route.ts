import { auth0 } from '@/lib/auth0'
import { NextResponse, NextRequest } from 'next/server'

// POST /api/account/password
// Delegates entirely to Auth0 — sends a password-reset email to the user.
// No passwords or M2M tokens ever touch our server.

export async function POST(request: NextRequest) {
    const session = await auth0.getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const email = session.user.email
    if (!email) return NextResponse.json({ error: 'No email on account.' }, { status: 400 })

    const res = await fetch(`https://${process.env.AUTH0_DOMAIN}/dbconnections/change_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.AUTH0_CLIENT_ID,
            email,
            connection: 'Username-Password-Authentication',
        }),
    })

    if (!res.ok) {
        console.error('[password reset]', await res.text())
        return NextResponse.json({ error: 'Failed to send reset email.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
}