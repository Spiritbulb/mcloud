import 'server-only'
import { db } from '@/lib/db'

/**
 * Single-flight guard for ingestion. Neon HTTP gives every query its own session,
 * so an advisory lock would not survive; a row with an expiry does.
 */
export async function withFeedLease<T>(fn: () => Promise<T>): Promise<T | 'busy'> {
  const got = await db()`
    update locks set until = now() + interval '5 minutes'
    where name = 'feed' and until < now() returning name`
  if (got.length === 0) return 'busy'
  try {
    return await fn()
  } finally {
    await db()`update locks set until = 'epoch' where name = 'feed'`
  }
}
