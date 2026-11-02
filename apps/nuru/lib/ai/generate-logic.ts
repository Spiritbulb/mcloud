import type { StudyOutput } from './schema'

export const MAX_DOC_CHARS = 600_000

export type FileError = 'no_text' | 'too_long' | 'generation_failed'

const MIN_TEXT_CHARS = 200

export function hasText(pages: string[]): boolean {
  let n = 0
  for (const p of pages) {
    n += p.replace(/\s/g, '').length
    if (n >= MIN_TEXT_CHARS) return true
  }
  return false
}

/** `<page n="1">…</page>` blocks, or null when the document is over MAX_DOC_CHARS. Never truncates. */
export function buildDocumentText(pages: string[]): string | null {
  const text = pages.map((p, i) => `<page n="${i + 1}">${p}</page>`).join('\n')
  return text.length > MAX_DOC_CHARS ? null : text
}

function cleanPages(pages: number[], pageCount: number): number[] {
  return [...new Set(pages.filter((p) => Number.isInteger(p) && p >= 1 && p <= pageCount))].sort((a, b) => a - b)
}

/** Drops page refs outside 1..pageCount, then any point, question or heading left uncited. */
export function cleanOutputs(o: StudyOutput, pageCount: number): StudyOutput {
  const notes = o.notes
    .map((n) => ({
      heading: n.heading,
      points: n.points.map((pt) => ({ text: pt.text, pages: cleanPages(pt.pages, pageCount) })).filter((pt) => pt.pages.length > 0),
    }))
    .filter((n) => n.points.length > 0)
  const questions = o.questions
    .map((q) => ({ question: q.question, answer: q.answer, pages: cleanPages(q.pages, pageCount) }))
    .filter((q) => q.pages.length > 0)
  return { notes, questions }
}

export function errorMessage(code: string | null): string {
  if (code === 'no_text') {
    return "This PDF has no selectable text (it may be a scan). You can still read it, but Nuru can't make notes from it yet."
  }
  if (code === 'too_long') return 'This file is too long for notes right now.'
  return "Nuru couldn't make notes for this file."
}

export function canRetry(code: string | null): boolean {
  return code === 'generation_failed'
}

/** True when no note or question survived cleaning; such a file ends `failed`, not `ready`. */
export function isEmptyOutput(o: StudyOutput): boolean {
  return o.notes.length === 0 && o.questions.length === 0
}

/** A `processing` claim older than this belongs to a function that has died (maxDuration is 300 s). */
export const STALE_PROCESSING_MS = 10 * 60 * 1000

type StatusRow = { status: 'uploaded' | 'processing' | 'ready' | 'failed'; error: string | null; claimedAt: string | null }

/** True when a `processing` row was claimed over STALE_PROCESSING_MS ago, or before claims were stamped. */
export function isStaleProcessing(row: StatusRow, now: Date): boolean {
  if (row.status !== 'processing') return false
  if (row.claimedAt === null) return true
  return now.getTime() - new Date(row.claimedAt).getTime() > STALE_PROCESSING_MS
}

/** The status to show: a stale `processing` row reads as `failed`/`generation_failed`, so it can be retried. */
export function effectiveStatus(row: StatusRow, now: Date): { status: StatusRow['status']; error: string | null } {
  return isStaleProcessing(row, now) ? { status: 'failed', error: 'generation_failed' } : { status: row.status, error: row.error }
}

/** Effective status plus the viewer's error message and retry flag, shared by the file route and page. */
export function describeFile(row: StatusRow, now: Date): {
  status: StatusRow['status']
  error: string | null
  errorMessage: string | null
  canRetry: boolean
} {
  const s = effectiveStatus(row, now)
  const failed = s.status === 'failed'
  return { ...s, errorMessage: failed ? errorMessage(s.error) : null, canRetry: failed && canRetry(s.error) }
}
