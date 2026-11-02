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

export function parseBefore(v: string | null): Date | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}
