const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Nairobi',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** Absolute date such as "2 Nov 2026", in Nairobi time. */
export function formatFeedDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : fmt.format(d)
}

const AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/

/** Opaque keyset cursor: "<at>|<id>", at being UTC ISO with up to microseconds. */
export function encodeCursor(at: string, id: number): string {
  return `${at}|${id}`
}

export function decodeCursor(v: string | null): { at: string; id: number } | null {
  if (!v) return null
  const parts = v.split('|')
  if (parts.length !== 2) return null
  const [at, rawId] = parts
  if (!AT.test(at) || Number.isNaN(new Date(at).getTime())) return null
  if (!/^[1-9]\d{0,15}$/.test(rawId)) return null
  const id = Number(rawId)
  return Number.isSafeInteger(id) ? { at, id } : null
}

/** The row the institution card follows: the fifth, or the last on a shorter list. -1 when empty. */
export function institutionCardIndex(shown: number): number {
  return Math.min(4, shown - 1)
}
