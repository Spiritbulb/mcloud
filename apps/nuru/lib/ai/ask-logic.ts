export const ASK_LIMIT_PER_DAY = 50

const MAX_QUESTION = 500

export type AskInput = { page: number; question: string }

/** A whole page in 1..pageCount and a trimmed question of 1 to 500 characters. */
export function parseAsk(body: unknown, pageCount: number): { ok: true; value: AskInput } | { ok: false; error: string } {
  const b = (body ?? {}) as { page?: unknown; question?: unknown }
  const page = b.page
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 1 || page > pageCount) {
    return { ok: false, error: 'Choose a page in this file.' }
  }
  const question = typeof b.question === 'string' ? b.question.trim() : ''
  if (question.length === 0) return { ok: false, error: 'Type a question.' }
  if (question.length > MAX_QUESTION) return { ok: false, error: 'Questions can be at most 500 characters.' }
  return { ok: true, value: { page, question } }
}
