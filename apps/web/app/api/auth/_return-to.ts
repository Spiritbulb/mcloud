// Sanitize an untrusted `returnTo` to a same-origin relative path (see sanitizeRelativePath).
import { sanitizeRelativePath } from '@mcloud/auth/routes'

const DEFAULT_RETURN_TO = '/auth/post-login'

export function sanitizeReturnTo(value: unknown, fallback: string = DEFAULT_RETURN_TO): string {
  return sanitizeRelativePath(value, fallback)
}
