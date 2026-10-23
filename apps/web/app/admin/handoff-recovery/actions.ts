'use server'

import { Resend } from 'resend'
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { getStranded } from './data'
import { recoveryEmail } from './recovery-logic'
import { headers } from 'next/headers'
import { recordAudit } from '@/lib/audit'
import { clientIp } from '@/lib/audit-logic'

// Same verified sender the waitlist confirmation uses.
const FROM = 'Spiritbulb <spiritb@mcloud.co.ke>'
const MAX_PER_SEND = 50

export type SendResult = {
    ok: boolean
    error?: string
    sent: string[]
    failed: { email: string; error: string }[]
    /** Requested addresses that are no longer stranded (they got through in the meantime). */
    skipped: string[]
}

/**
 * Server actions are public POST endpoints, so the admin check lives here and not only in the
 * layout. The list of recipients is recomputed server-side: the posted emails only choose
 * from people who are genuinely stranded right now, never an arbitrary address.
 */
export async function sendRecoveryEmails(emails: string[]): Promise<SendResult> {
    const empty: SendResult = { ok: false, sent: [], failed: [], skipped: [] }

    const session = await getSession()
    if (!session?.user) return { ...empty, error: 'Not signed in' }
    const supabase = await createClient()
    const { data: me } = await supabase.from('users').select('role').eq('id', session.user.id).single()
    if (me?.role !== 'admin') return { ...empty, error: 'Forbidden' }

    if (!process.env.RESEND_API_KEY) return { ...empty, error: 'RESEND_API_KEY is not configured' }
    if (!Array.isArray(emails) || emails.length === 0) return { ...empty, error: 'Nobody selected' }
    if (emails.length > MAX_PER_SEND) return { ...empty, error: `Send at most ${MAX_PER_SEND} at a time` }

    const stranded = new Map((await getStranded()).map((s) => [s.email, s]))
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result: SendResult = { ok: true, sent: [], failed: [], skipped: [] }

    for (const raw of new Set(emails.map((e) => String(e).trim().toLowerCase()))) {
        const person = stranded.get(raw)
        if (!person) {
            result.skipped.push(raw)
            continue
        }
        const mail = recoveryEmail(person.name)
        try {
            const { error } = await resend.emails.send({ from: FROM, to: person.email, ...mail })
            if (error) result.failed.push({ email: person.email, error: error.message })
            else result.sent.push(person.email)
        } catch (err) {
            result.failed.push({ email: person.email, error: err instanceof Error ? err.message : 'Send failed' })
        }
    }
    await recordAudit({
        actor: { id: session.user.id, email: session.user.email },
        action: 'handoff.recovery.send',
        summary: `Sent ${result.sent.length} recovery email(s); ${result.failed.length} failed, ${result.skipped.length} skipped`,
        after: { sent: result.sent, failed: result.failed, skipped: result.skipped },
        ip: clientIp(await headers()),
    })
    console.info(`[handoff-recovery] by=${session.user.id} sent=${result.sent.length} failed=${result.failed.length} skipped=${result.skipped.length}`)
    return result
}
