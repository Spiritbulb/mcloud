// GET /api/mobile/auth/google/callback
import { NextResponse, type NextRequest } from 'next/server'
import { User, WorkOS } from '@workos-inc/node'
import { ensureUserRow } from '@mcloud/auth/callback'
import { mintTicket } from '../../../../_handoff/tickets'
import { consumeOAuthState } from '../../../../_handoff/oauth-state'
import { AuthUser } from '@mcloud/auth'

const workos = new WorkOS(process.env.WORKOS_API_KEY!)
const APP_SCHEME_CALLBACK = 'reach://auth-callback'

export async function GET(req: NextRequest) {
    const url = req.nextUrl
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const errorParam = url.searchParams.get('error')

    if (errorParam || !code || !state || !(await consumeOAuthState(state))) {
        return NextResponse.redirect(`${APP_SCHEME_CALLBACK}?error=google_oauth_failed`)
    }

    let auth
    try {
        auth = await workos.userManagement.authenticateWithCode({
            clientId: process.env.WORKOS_CLIENT_ID!,
            code,
        })
    } catch {
        return NextResponse.redirect(`${APP_SCHEME_CALLBACK}?error=google_token_exchange_failed`)
    }

    const { accessToken, refreshToken, user } = auth
    if (!accessToken || !refreshToken) {
        return NextResponse.redirect(`${APP_SCHEME_CALLBACK}?error=google_oauth_failed`)
    }

    await ensureUserRow(user as AuthUser)

    const ticketId = await mintTicket({ accessToken, refreshToken }, '/') // redirectTo unused by mobile, '/' satisfies the sanitizer

    return NextResponse.redirect(`${APP_SCHEME_CALLBACK}?ticket=${ticketId}`)
}