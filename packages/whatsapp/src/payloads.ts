import type { Reply } from './types'

// WhatsApp Cloud API limits for interactive lists and text.
export const LIMITS = { rowTitle: 24, rowDescription: 72, button: 20, body: 1024, footer: 60, rows: 10, text: 4096 } as const

export function truncate(s: string, max: number): string {
    return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)).trimEnd() + '…'
}

/** The Graph API `messages` request body for one reply, with every limit enforced. */
export function toGraphBody(to: string, reply: Reply): Record<string, unknown> {
    const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to }
    if (reply.type === 'text') {
        return { ...base, type: 'text', text: { body: truncate(reply.body, LIMITS.text), preview_url: true } }
    }
    const rows = reply.rows.slice(0, LIMITS.rows).map((r) => ({
        id: r.id,
        title: truncate(r.title, LIMITS.rowTitle),
        ...(r.description ? { description: truncate(r.description, LIMITS.rowDescription) } : {}),
    }))
    return {
        ...base,
        type: 'interactive',
        interactive: {
            type: 'list',
            body: { text: truncate(reply.body, LIMITS.body) },
            ...(reply.footer ? { footer: { text: truncate(reply.footer, LIMITS.footer) } } : {}),
            action: { button: truncate(reply.button, LIMITS.button), sections: [{ title: 'Options', rows }] },
        },
    }
}
