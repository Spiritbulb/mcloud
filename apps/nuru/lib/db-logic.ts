// Pure classification of database errors. No db or server-only imports, so it is testable offline.

const NETWORK_CODES = new Set(['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'UND_ERR_CONNECT_TIMEOUT'])

type Loose = { name?: unknown; code?: unknown; message?: unknown; cause?: unknown; errors?: unknown; sourceError?: unknown }

const asObj = (v: unknown): Loose | null => (v && typeof v === 'object' ? (v as Loose) : null)

/** A network code on the error, its cause, or any error inside an AggregateError cause. */
function hasNetworkCode(v: unknown, depth = 0): boolean {
  const o = asObj(v)
  if (!o || depth > 3) return false
  if (typeof o.code === 'string' && NETWORK_CODES.has(o.code)) return true
  if (Array.isArray(o.errors) && o.errors.some((e) => hasNetworkCode(e, depth + 1))) return true
  return hasNetworkCode(o.cause, depth + 1)
}

/**
 * True when Neon could not be reached: the HTTP driver wraps the failed fetch in a NeonDbError with
 * `sourceError` set and no SQLSTATE `code`. SQL errors (a missing column, a constraint) carry a `code`
 * and are bugs, not outages, so they return false.
 */
export function isDbUnavailable(err: unknown): boolean {
  const e = asObj(err)
  if (!e || e.name !== 'NeonDbError' || e.code != null) return false
  const src = asObj(e.sourceError)
  if (!src) return false
  return src.message === 'fetch failed' || hasNetworkCode(src)
}
