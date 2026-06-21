// Sanitize an untrusted `returnTo` to a same-origin relative path, defeating
// open-redirect via absolute (scheme), protocol-relative (//host), or
// backslash-normalized (/\host) URLs — including URL-encoded forms (%5C, %2F)
// that a browser normalizes at navigation time.
const DEFAULT_RETURN_TO = '/auth/post-login'

function looksLikeHost(path: string): boolean {
  // Anything a browser would treat as starting a host rather than a path.
  return !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')
}

export function sanitizeReturnTo(value: unknown, fallback: string = DEFAULT_RETURN_TO): string {
  if (typeof value !== 'string') return fallback
  if (looksLikeHost(value)) return fallback
  // Decode once so %5C (\) / %2F (/) encodings can't smuggle a host past the
  // raw checks above; a malformed escape sequence is itself rejected.
  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return fallback
  }
  if (looksLikeHost(decoded)) return fallback
  return value
}
