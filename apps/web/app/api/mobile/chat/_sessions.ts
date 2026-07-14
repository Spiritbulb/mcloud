// Pure helpers for chat sessions — no I/O, unit-tested. The route handlers do
// the Supabase reads/writes and lean on these for title logic + DTO shape.

const TITLE_MAX = 40

/** First user message → a short session title. Empty input → "New chat". */
export function deriveTitle(firstUserMessage: string): string {
  const t = firstUserMessage.trim()
  if (!t) return 'New chat'
  return t.length > TITLE_MAX ? t.slice(0, TITLE_MAX) + '…' : t
}

// Guards a client-supplied sessionId before it reaches a uuid column. Without
// this, a stray "undefined"/"null"/malformed string reaches Postgres and 500s
// with "invalid input syntax for type uuid". Accepts canonical 8-4-4-4-12 hex.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isUuid(v: string | null | undefined): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

export type SessionRow = { id: string; title: string; updated_at: string }

/** Raw session row → camelCase DTO returned to the app. */
export function toSessionDTO(row: SessionRow): { id: string; title: string; updatedAt: string } {
  return { id: row.id, title: row.title, updatedAt: row.updated_at }
}
