import 'server-only'
import { createClient } from '@mcloud/db/server'
import { buildAuditRow, type AuditEntry } from './audit-logic'

/**
 * Append one row to admin_audit_log. Call it AFTER the change succeeded, with what changed.
 *
 * Never throws: an audit-table problem (not migrated yet, a transient DB error) must not turn a
 * successful admin action into a 500 and tempt a retry that applies it twice. The failure is
 * logged loudly instead, so a missing log shows up in the function logs.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
    try {
        const supabase = await createClient()
        // The table is newer than the generated DB types, hence the untyped table name.
        const { error } = await (supabase as unknown as {
            from(t: string): { insert(row: unknown): PromiseLike<{ error: { message: string } | null }> }
        })
            .from('admin_audit_log')
            .insert(buildAuditRow(entry))
        if (error) console.error('[audit] insert failed', entry.action, error.message)
    } catch (err) {
        console.error('[audit] insert threw', entry.action, err)
    }
}
