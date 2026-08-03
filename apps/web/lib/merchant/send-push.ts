// Sends a push notification to every registered device for a set of users.
// Looks up tokens from device_push_tokens, batches to Expo's push API (max 100
// messages per request per Expo's docs), and silently drops delivery errors —
// a failed push should never break the request that triggered it (e.g. order
// creation). Log failures if/when this needs observability.
import { createClient } from '@mcloud/db/server'

type PushPayload = {
    title: string
    body: string
    data?: Record<string, unknown>
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const BATCH_SIZE = 100

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    if (!userIds.length) return

    const supabase = await createClient()
    // device_push_tokens isn't in generated types yet — cast (regenerate types later).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows } = await (supabase as any)
        .from('device_push_tokens')
        .select('expo_push_token')
        .in('user_id', userIds)

    const tokens: string[] = (rows ?? []).map((r: { expo_push_token: string }) => r.expo_push_token).filter(Boolean)
    if (!tokens.length) return

    const messages = tokens.map((to) => ({
        to,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
    }))

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = messages.slice(i, i + BATCH_SIZE)
        try {
            await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(batch),
            })
        } catch {
            // best-effort — a push failure should never fail the caller's request
        }
    }
}