import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { getMobileSession, getSession } from '@mcloud/auth/standalone'
import type { AuthUser } from '@mcloud/auth/types'
import { db } from '@/lib/db'

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
  const r = rows[0]
  return { id: r.id, email: r.email, name: r.name, role: r.role, canUpload: r.can_upload }
}

/** The signed-in user from the cookie, for pages and server actions. */
export async function currentUser(): Promise<NuruUser | null> {
  const session = await getSession()
  return session?.user ? upsertUser(session.user) : null
}

/** API gate: bearer token when an Authorization header is present, otherwise the cookie. */
export async function requireUser(req: NextRequest): Promise<NuruUser | NextResponse> {
  const session = req.headers.has('authorization') ? await getMobileSession(req) : await getSession(req)
  if (!session?.user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  return upsertUser(session.user)
}

/** Server-action gate for admin-only work. */
export async function requireAdmin(): Promise<NuruUser> {
  const user = await currentUser()
  if (!user || user.role !== 'admin') throw new Error('forbidden')
  return user
}
