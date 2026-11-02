'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

export async function decideWaitlist(id: string, decision: 'approved' | 'declined'): Promise<void> {
  const admin = await requireAdmin()
  if (decision !== 'approved' && decision !== 'declined') throw new Error('invalid decision')
  const sql = db()
  const rows = await sql`
    update waitlist set status = ${decision}, decided_at = now(), decided_by = ${admin.id}
    where id = ${id}
    returning kind, user_id, email`
  const row = rows[0] as { kind: string; user_id: string | null; email: string } | undefined
  if (row && decision === 'approved' && row.kind === 'uploads') {
    await sql`update users set can_upload = true where id = ${row.user_id} or lower(email) = lower(${row.email})`
  }
  revalidatePath('/admin')
}
