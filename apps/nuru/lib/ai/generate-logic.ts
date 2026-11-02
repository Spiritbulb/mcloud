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
