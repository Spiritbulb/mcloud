const PREDICTION = /\b(will likely|is expected to|could soon|predict)/i
const MAX_LENGTH = 200

export function cleanWhy(s: string | null): string | null {
  if (s == null) return null
  const t = s.trim()
  if (!t || t.length > MAX_LENGTH) return null
  if (PREDICTION.test(t)) return null
  return t
}

/** Only ids that were in the batch, first answer per id, cleaned, non-null. */
export function whyUpdates(
  batchIds: number[],
  results: { id: number; why: string | null }[],
): { id: number; why: string }[] {
  const allowed = new Set(batchIds)
  const seen = new Set<number>()
  const out: { id: number; why: string }[] = []
  for (const r of results) {
    if (!allowed.has(r.id) || seen.has(r.id)) continue
    seen.add(r.id)
    const why = cleanWhy(r.why)
    if (why) out.push({ id: r.id, why })
  }
  return out
}
