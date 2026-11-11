import { toGraphBody } from './payloads'
import type { Reply } from './types'

export interface GraphConfig {
    token: string
    phoneNumberId: string
    version?: string
    fetchImpl?: typeof fetch
}

export interface GraphClient {
    send(to: string, reply: Reply): Promise<{ ok: boolean }>
}

/**
 * Minimal WhatsApp Cloud API sender. Like `sendEmail`, `send` never throws: a failed send
 * (network, expired 24h window, bad token) is logged and reported as `{ ok: false }`.
 */
export function createGraphClient(cfg: GraphConfig): GraphClient {
    const doFetch = cfg.fetchImpl ?? fetch
    const url = `https://graph.facebook.com/${cfg.version ?? 'v21.0'}/${cfg.phoneNumberId}/messages`
    return {
        async send(to, reply) {
            try {
                const res = await doFetch(url, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(toGraphBody(to, reply)),
                })
                if (!res.ok) {
                    console.error('[whatsapp] send failed', res.status, (await res.text().catch(() => '')).slice(0, 300))
                    return { ok: false }
                }
                return { ok: true }
            } catch (e) {
                console.error('[whatsapp] send error', e)
                return { ok: false }
            }
        },
    }
}
