// The one place the platform sends email. Server-only: it reads RESEND_API_KEY.
//
// sendEmail never throws. Almost every email is a side effect of something that already
// happened (an order was paid, a wallet was credited), and a mail outage must not fail or
// roll back that. Callers that need to report failures (handoff recovery) read the result.
import { Resend } from 'resend'
import type { Email } from './templates'

export type { Email } from './templates'

/** Verified senders on the mcloud.co.ke domain in Resend. */
export const PLATFORM_FROM = 'Menengai Cloud <noreply@mcloud.co.ke>'
export const SPIRITBULB_FROM = 'Spiritbulb <spiritb@mcloud.co.ke>'

export type SendResult = { ok: true; id: string } | { ok: false; error: string }

let client: Resend | null = null

export function mailConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY)
}

export async function sendEmail(
    email: Email & {
        to: string | string[]
        from?: string
        replyTo?: string
        /**
         * Resend drops a repeat send with the same key for 24 hours. Use one for event
         * notifications (`order-paid/<orderId>`) so a retried webhook cannot email twice.
         */
        idempotencyKey?: string
    },
): Promise<SendResult> {
    const { to, from = PLATFORM_FROM, replyTo, idempotencyKey, subject, html, text } = email
    const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean)
    if (!recipients.length) return { ok: false, error: 'No recipient' }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
        console.warn(`[mail] RESEND_API_KEY is not configured; not sending "${subject}"`)
        return { ok: false, error: 'RESEND_API_KEY is not configured' }
    }
    client ??= new Resend(apiKey)

    try {
        const { data, error } = await client.emails.send(
            { from, to: recipients, subject, html, text, ...(replyTo ? { replyTo } : {}) },
            idempotencyKey ? { idempotencyKey } : undefined,
        )
        if (error || !data) {
            console.error(`[mail] send failed: "${subject}"`, error?.message)
            return { ok: false, error: error?.message ?? 'Send failed' }
        }
        return { ok: true, id: data.id }
    } catch (err) {
        console.error(`[mail] send threw: "${subject}"`, err)
        return { ok: false, error: err instanceof Error ? err.message : 'Send failed' }
    }
}
