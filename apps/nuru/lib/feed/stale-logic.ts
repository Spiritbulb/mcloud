export function isStale(lastFetchedAt: Date | null, now: Date, maxAgeMin = 30): boolean {
  if (!lastFetchedAt) return true
  return now.getTime() - lastFetchedAt.getTime() > maxAgeMin * 60_000
}
