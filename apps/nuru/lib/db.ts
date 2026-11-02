import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'
import { isDbUnavailable } from './db-logic'

export { isDbUnavailable }

let cached: NeonQueryFunction<false, false> | undefined

/** Nuru's own Neon database (not Supabase). Created on first use. */
export function db(): NeonQueryFunction<false, false> {
  return (cached ??= neon(process.env.DATABASE_URL!))
}

export const DB_UNAVAILABLE = "Nuru couldn't reach its database. Please try again."

/** The 503 every API route returns when Neon can't be reached. */
export function dbUnavailableResponse(): NextResponse {
  return NextResponse.json({ error: DB_UNAVAILABLE }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
}

/** For a route's catch: the 503 when the database was unreachable, otherwise rethrows the error. */
export function dbUnavailableOrThrow(err: unknown): NextResponse {
  if (!isDbUnavailable(err)) throw err
  console.error('[nuru] database unreachable', err)
  return dbUnavailableResponse()
}
