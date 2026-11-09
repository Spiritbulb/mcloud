import type { Inbound } from './types'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)

/**
 * Flatten Meta's webhook payload (`entry[].changes[].value.messages[]`) into the messages
 * we care about. Delivery/read `statuses` are ignored, and anything malformed is skipped
 * rather than thrown: the caller has already acknowledged the request.
 */
export function parseInbound(payload: unknown): Inbound[] {
    const out: Inbound[] = []
    if (!isObj(payload)) return out
    for (const entry of arr(payload.entry)) {
        if (!isObj(entry)) continue
        for (const change of arr(entry.changes)) {
            if (!isObj(change) || !isObj(change.value)) continue
            for (const m of arr(change.value.messages)) {
                if (!isObj(m)) continue
                const id = str(m.id)
                const from = str(m.from)
                if (!id || !from) continue
                out.push({ id, from, input: parseInput(m) })
            }
        }
    }
    return out
}

function parseInput(m: Obj): Inbound['input'] {
    if (m.type === 'text' && isObj(m.text)) {
        const body = str(m.text.body)
        return body ? { kind: 'text', text: body } : { kind: 'unsupported' }
    }
    if (m.type === 'interactive' && isObj(m.interactive)) {
        const i = m.interactive
        const r = isObj(i.list_reply) ? i.list_reply : isObj(i.button_reply) ? i.button_reply : null
        const id = r ? str(r.id) : null
        if (r && id) return { kind: 'reply', id, title: str(r.title) ?? '' }
    }
    return { kind: 'unsupported' }
}
