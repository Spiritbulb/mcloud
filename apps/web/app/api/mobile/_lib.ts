// Shared helpers for /api/mobile/* route handlers.
// Every mobile endpoint is bearer-authenticated (WorkOS access token) and returns
// JSON. proxy.ts already adds CORS + bypasses tenant logic for /api/*.

import { getMobileSession } from '@mcloud/auth/server'
import type { AuthUser } from '@mcloud/auth/types'
import { NextResponse, type NextRequest } from 'next/server'

/** JSON error response. */
export function fail(status: number, error: string) {
    return NextResponse.json({ error }, { status })
}

/**
 * Resolve the mobile user from the bearer token, or return a 401 response.
 * Usage:
 *   const auth = await requireMobileUser(req)
 *   if (auth instanceof NextResponse) return auth
 *   const { user } = auth
 */
export async function requireMobileUser(
    req: NextRequest,
): Promise<{ user: AuthUser } | NextResponse> {
    const session = await getMobileSession(req)
    if (!session?.user) return fail(401, 'Unauthorized')
    return { user: session.user }
}
