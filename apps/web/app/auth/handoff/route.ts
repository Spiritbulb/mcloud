// GET /auth/handoff?ticket=... — redeem an SSO handoff ticket.
// Atomically consumes the ticket, opens the sealed WorkOS token pair, establishes
// the normal MCloud cookie session (saveSession, via createSessionFromTokens), and
// 302s to the ticket's redirect_to. Any failure (unknown/expired/used ticket, or an
// unopenable pair) redirects to the login page with no diagnostic and no ticket echo.
import { NextResponse, type NextRequest } from 'next/server'
import { redeemTicket } from '../../api/_handoff/tickets'
import { createSessionFromTokens } from '@mcloud/auth/server'
import { ensureUserRow } from '@mcloud/auth/callback'

// `handoff=failed` is the loop breaker: /auth/login normally bounces straight back to the
// spiritb handoff, which mints a new ticket and lands here again. With this flag the login
// page stops and shows an error instead of repeating the cycle until the browser gives up.
const LOGIN = '/auth/login?handoff=failed'

export async function GET(req: NextRequest) {
    const ticket = req.nextUrl.searchParams.get('ticket') ?? ''
    const loginUrl = new URL(LOGIN, req.nextUrl.origin)
    if (!ticket) return NextResponse.redirect(loginUrl)

    const redeemed = await redeemTicket(ticket)
    if (!redeemed) return NextResponse.redirect(loginUrl)

    // Establish the cookie session FIRST. saveSession (inside createSessionFromTokens)
    // writes the authkit cookie via Next's request-scoped cookies() store, exactly as
    // /api/auth/verify does (that route calls verifyMagicCodeWeb -> saveSession then
    // returns a plain response with NO manual cookie attach). Next flushes those
    // cookie writes onto whatever response we return, so the redirect below carries
    // the session cookie automatically.
    const user = await createSessionFromTokens(redeemed.tokens, req)
    if (!user) return NextResponse.redirect(loginUrl)

    // Mirror the identity into `users` before anything FKs to it (org/store creation).
    // Spiritbulb's Google sign-in talks to WorkOS directly and never touches MCloud, so
    // this handoff is the first time MCloud sees that person. Idempotent; a failure here
    // must not strand a signed-in user on the login page, so log and carry on.
    try {
        await ensureUserRow(user)
    } catch (err) {
        console.error('[handoff] ensureUserRow failed', err)
    }

    // redeemTicket already sanitized redirect_to at mint; resolve against our origin.
    const dest = new URL(redeemed.redirectTo, req.nextUrl.origin)
    return NextResponse.redirect(dest)
}
