import 'server-only'
import { listIdentityUsers } from '@mcloud/auth/management'
import { createClient } from '@mcloud/db/server'
import { pickStranded, type Stranded } from './recovery-logic'

/** Identity-provider users that MCloud has no `users` row for (see recovery-logic.ts). */
export async function getStranded(): Promise<Stranded[]> {
    const [people, supabase] = await Promise.all([listIdentityUsers(), createClient()])
    const { data, error } = await supabase.from('users').select('id')
    if (error) throw new Error(`users lookup failed: ${error.message}`)
    return pickStranded(people, new Set((data ?? []).map((r) => r.id)), Date.now())
}
