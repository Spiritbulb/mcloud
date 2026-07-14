// Guard for expo-router route params. `useLocalSearchParams` can hand back the
// LITERAL string "undefined"/"null" (not JS undefined) for an absent param on
// certain navigations — a truthy string that slips past a `?? null` check and,
// for an id passed to the API, reaches Postgres as "undefined" (uuid cast error).
// `cleanParam` collapses all the "not really present" forms to null so callers
// can treat a param as present ONLY when it carries a real value.
export function cleanParam(v: string | string[] | undefined | null): string | null {
  const raw = Array.isArray(v) ? v[0] : v
  if (raw == null) return null
  const t = raw.trim()
  if (t === '' || t === 'undefined' || t === 'null') return null
  return t
}
