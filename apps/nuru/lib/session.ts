import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { getMobileSession, getSession } from '@mcloud/auth/standalone'
import type { AuthUser } from '@mcloud/auth/types'
import { db, dbUnavailableOrThrow } from '@/lib/db'

export type NuruUser = {
  id: string
  email: string
  name: string | null
  role: 'user' | 'admin'
  canUpload: boolean
}

/** Create or refresh the users row for a WorkOS identity. Approved uploads waitlist entries grant can_upload. */
async function upsertUser(auth: AuthUser): Promise<NuruUser> {
  const rows = await db()`
    insert into users (id, email, name, can_upload)
    values (${auth.id}, ${auth.email}, ${auth.name ?? null}, exists (select 1 from waitlist where lower(email) = lower(${auth.email}) and kind = 'uploads' and status = 'approved'))
    on conflict (id) do update set email = excluded.email, name = excluded.name,
      can_upload = users.can_upload or excluded.can_upload
    returning id, email, name, role, can_upload`
  return toUser(rows[0] as UserRow)
}

type UserRow = { id: string; email: string; name: string | null; role: 'user' | 'admin'; can_upload: boolean }

function toUser(r: UserRow): NuruUser {
  return { id: r.id, email: r.email, name: r.name, role: r.role, canUpload: r.can_upload }
}

/** Shared by both gates: read the row by id, and write only when the user has none yet. */
async function resolveUser(auth: AuthUser): Promise<NuruUser> {
  const rows = (await db()`select id, email, name, role, can_upload from users where id = ${auth.id}`) as UserRow[]
  return rows[0] ? toUser(rows[0]) : upsertUser(auth)
}

/** The signed-in user from the cookie, for pages and server actions. */
export async function currentUser(): Promise<NuruUser | null> {
  const session = await getSession()
  return session?.user ? resolveUser(session.user) : null
}

/**
 * API gate: bearer token when an Authorization header is present, otherwise the cookie.
 * An unreachable database is a 503 response; any other error still throws.
 */
export async function requireUser(req: NextRequest): Promise<NuruUser | NextResponse> {
  const session = req.headers.has('authorization') ? await getMobileSession(req) : await getSession(req)
  if (!session?.user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  try {
    return await resolveUser(session.user)
  } catch (err) {
    return dbUnavailableOrThrow(err)
  }
}

/** Server-action gate for admin-only work. */
export async function requireAdmin(): Promise<NuruUser> {
  const user = await currentUser()
  if (!user || user.role !== 'admin') throw new Error('forbidden')
  return user
}
