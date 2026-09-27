// POST /api/mobile/auth/google/redeem  { ticket }
import { NextResponse, type NextRequest } from 'next/server'
import { fail } from '../../../_lib'
import { redeemTicket } from '../../../../_handoff/tickets'

export async function POST(req: NextRequest) {
    let body: { ticket?: unknown }
    try {
        body = await req.json()
    } catch {
        return fail(400, 'Invalid request body')
    }

    const ticket = typeof body.ticket === 'string' ? body.ticket : ''
    if (!ticket) return fail(400, 'Ticket is required')

    const result = await redeemTicket(ticket)
    if (!result) return fail(400, 'That link has expired. Please try again.')

    return NextResponse.json(
        { accessToken: result.tokens.accessToken, refreshToken: result.tokens.refreshToken },
        { headers: { 'Cache-Control': 'no-store' } },
    )
}