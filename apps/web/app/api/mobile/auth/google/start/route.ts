// POST /api/mobile/auth/google/start
// Unauthenticated by necessity (this IS how login begins). Returns the WorkOS
// authorization URL for the app to open in a browser. State is bound server-side
// via a short-lived row so the callback can look it up without cookies (mobile
// has no cookie jar shared with the browser sheet).
import { NextResponse, type NextRequest } from 'next/server'
import { WorkOS } from '@workos-inc/node'
import crypto from 'node:crypto'
import { fail } from '../../../_lib'
import { mintOAuthState } from '../../../../_handoff/oauth-state'

const workos = new WorkOS(process.env.WORKOS_API_KEY!)

export async function POST(req: NextRequest) {
    const state = crypto.randomBytes(16).toString('base64url')
    await mintOAuthState(state) // short row, ~10 min TTL, just marks "this state is legit"

    const authorizationUrl = workos.userManagement.getAuthorizationUrl({
        provider: 'GoogleOAuth',
        clientId: process.env.WORKOS_CLIENT_ID!,
        redirectUri: `${process.env.MCLOUD_WEB_ORIGIN}/api/mobile/auth/google/callback`,
        state,
    })

    return NextResponse.json({ url: authorizationUrl }, { headers: { 'Cache-Control': 'no-store' } })
}