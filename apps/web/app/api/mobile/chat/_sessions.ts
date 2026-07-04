// Pure helpers for chat sessions — no I/O, unit-tested. The route handlers do
// the Supabase reads/writes and lean on these for title logic + DTO shape.

const TITLE_MAX = 40

/** First user message → a short session title. Empty input → "New chat". */
export function deriveTitle(firstUserMessage: string): string {
  const t = firstUserMessage.trim()
  if (!t) return 'New chat'
  return t.length > TITLE_MAX ? t.slice(0, TITLE_MAX) + '…' : t
}

export type SessionRow = { id: string; title: string; updated_at: string }

/** Raw session row → camelCase DTO returned to the app. */
export function toSessionDTO(row: SessionRow): { id: string; title: string; updatedAt: string } {
  return { id: row.id, title: row.title, updatedAt: row.updated_at }
}
