// Sanitize an untrusted `returnTo` to a same-origin relative path, defeating
// open-redirect via absolute (scheme), protocol-relative (//host), or
// backslash-normalized (/\host) URLs.
const DEFAULT_RETURN_TO = '/auth/post-login'

export function sanitizeReturnTo(value: unknown, fallback: string = DEFAULT_RETURN_TO): string {
  if (typeof value !== 'string') return fallback
  // Must be a root-relative path. Reject anything a browser would treat as a host.
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  if (value.startsWith('/\\')) return fallback
  return value
}
