// Shared shapes for the WhatsApp bot. No I/O lives in this package's logic files.

/** What a merchant sent: free text, or a tap on a list row (Meta calls it an interactive reply). */
export type BotInput =
    | { kind: 'text'; text: string }
    | { kind: 'reply'; id: string; title: string }

export interface ListRow {
    id: string
    title: string
    description?: string
}

/** A message we send. Only text and interactive lists are used (no templates in v1). */
export type Reply =
    | { type: 'text'; body: string }
    | { type: 'list'; body: string; button: string; rows: ListRow[]; footer?: string }

export interface Inbound {
    /** Meta message id (`wamid...`), used to make retries idempotent. */
    id: string
    /** Sender's WhatsApp id: the phone number as digits, no plus. */
    from: string
    input: BotInput | { kind: 'unsupported' }
}
