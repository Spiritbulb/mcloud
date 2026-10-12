// Authorization for the storefront's merchant-side server actions. These replace direct
// browser-to-Supabase writes: the browser holds no database credentials with write access, so
// every change goes through an action that proves WHO is asking and that they manage THIS store.
import 'server-only'
import { getSession } from '@mcloud/auth/server'
import { canManage, requireStoreAccessById } from '@mcloud/merchant/stores'

export type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string }

/**
 * Signed in AND an owner/admin of `storeId`. Every action starts with this and scopes its
 * queries by the returned storeId, so a manager of one store can never touch another's rows.
 */
export async function requireManagedStore(
    storeId: unknown,
): Promise<{ ok: true; storeId: string; userId: string } | { ok: false; error: string }> {
    if (typeof storeId !== 'string' || !storeId) return { ok: false, error: 'Missing store' }
    const session = await getSession()
    if (!session?.user) return { ok: false, error: 'Please sign in again.' }
    const access = await requireStoreAccessById(storeId, session.user.id)
    if (access.error === 'not_found') return { ok: false, error: 'Store not found' }
    if (access.error || !canManage(access.role)) return { ok: false, error: 'You do not have permission to change this store.' }
    return { ok: true, storeId: access.storeId, userId: session.user.id }
}
