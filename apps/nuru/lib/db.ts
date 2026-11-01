import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let cached: NeonQueryFunction<false, false> | undefined

/** Nuru's own Neon database (not Supabase). Created on first use. */
export function db(): NeonQueryFunction<false, false> {
  return (cached ??= neon(process.env.DATABASE_URL!))
}
