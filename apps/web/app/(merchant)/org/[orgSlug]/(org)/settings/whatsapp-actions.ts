'use server'

import { getSession } from '@mcloud/auth/server'
import { formatLinkCode } from '@mcloud/whatsapp'
import { getWhatsAppConfig, waMeDigits } from '@/lib/whatsapp/config'
import { issueLinkCode, revokeLink } from '@/lib/whatsapp/whatsapp-store'

export type StartLinkResult =
    | { error: string }
    | { error: null; code: string; expiresAt: string; number: string | null; deepLink: string | null }

/** A one-time code for the signed-in user. The link belongs to the person, not to this org. */
export async function startWhatsAppLink(): Promise<StartLinkResult> {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }
    const cfg = getWhatsAppConfig()
    if (!cfg) return { error: 'WhatsApp is not set up on this platform yet.' }

    try {
        const { code, expiresAt } = await issueLinkCode(session.user.id)
        const digits = waMeDigits(cfg.businessNumber)
        return {
            error: null,
            code: formatLinkCode(code),
            expiresAt,
            number: cfg.businessNumber,
            deepLink: digits ? `https://wa.me/${digits}?text=${encodeURIComponent(`LINK ${code}`)}` : null,
        }
    } catch (e) {
        console.error('[whatsapp] startWhatsAppLink failed', e)
        return { error: 'Could not create a code. Please try again.' }
    }
}

export async function disconnectWhatsApp(): Promise<{ error: string | null }> {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }
    try {
        await revokeLink(session.user.id)
        return { error: null }
    } catch (e) {
        console.error('[whatsapp] disconnectWhatsApp failed', e)
        return { error: 'Could not disconnect. Please try again.' }
    }
}
