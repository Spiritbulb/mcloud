// POST /api/mobile/push-token — store the caller's Expo push token. Idempotent:
// upsert on the token so a device re-registering refreshes its row + owner.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { fail, requireMobileUser } from '../_lib'

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const body = (await req.json().catch(() => null)) as
        | { token?: string; platform?: string }
        | null
    const token = body?.token?.trim()
    if (!token) return fail(400, 'Missing token')

    const supabase = await createClient()
    // device_push_tokens isn't in generated types yet — cast (regenerate types later).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from('device_push_tokens')
        .upsert(
            { user_id: auth.user.id, expo_push_token: token, platform: body?.platform ?? null, updated_at: new Date().toISOString() },
            { onConflict: 'expo_push_token' },
        )
    if (error) return fail(500, error.message)
    return NextResponse.json({ ok: true })
}
