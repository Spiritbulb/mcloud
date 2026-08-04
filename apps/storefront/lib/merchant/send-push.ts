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
            const res = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(batch),
            })
            const json = await res.json().catch(() => null)
            // Expo returns { data: [{ status: 'ok' | 'error', message?, details? }, ...] }
            // one entry per message, in the same order as the batch. Log anything
            // that isn't a clean 'ok' so delivery failures are visible — this was
            // previously silent, making "no push arrived" impossible to diagnose.
            const tickets = json?.data
            if (!res.ok || !Array.isArray(tickets)) {
                console.error('[push] send request failed', res.status, json)
            } else {
                tickets.forEach((ticket: { status: string; message?: string; details?: unknown }, idx: number) => {
                    if (ticket.status !== 'ok') {
                        console.error('[push] delivery error for token', batch[idx]?.to, ticket)
                    }
                })
            }
        } catch (e) {
            console.error('[push] send request threw', e)
        }
    }
}