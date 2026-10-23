// Pure half of the admin audit log: the vocabulary and the row shape. No I/O, so it is testable
// under bare `node --test` (see audit-logic.test.ts). The insert lives in audit.ts.

export const AUDIT_ACTIONS = {
    'store.plan.grant': 'Plan granted',
    'store.plan.revoke': 'Plan revoked',
    'store.status.set': 'Store activated / suspended',
    'subscription.activate': 'Subscription activated',
    'user.role.set': 'User role changed',
    'handoff.recovery.send': 'Recovery emails sent',
} as const

export type AuditAction = keyof typeof AUDIT_ACTIONS

export function isAuditAction(value: string): value is AuditAction {
    return Object.prototype.hasOwnProperty.call(AUDIT_ACTIONS, value)
}

export type AuditEntry = {
    actor: { id: string; email?: string | null }
    action: AuditAction
    targetType?: 'store' | 'user' | 'subscription' | null
    targetId?: string | null
    summary: string
    before?: unknown
    after?: unknown
    ip?: string | null
}

export type AuditRow = {
    actor_id: string
    actor_email: string | null
    action: AuditAction
    target_type: string | null
    target_id: string | null
    summary: string
    before: unknown
    after: unknown
    ip: string | null
}

const MAX_SUMMARY = 300
const MAX_JSON = 8_000

/** JSON-safe, size-capped copy of a before/after snapshot. Oversized values become a marker. */
export function snapshot(value: unknown): unknown {
    if (value === undefined) return null
    try {
        const text = JSON.stringify(value)
        if (text === undefined) return null
        if (text.length > MAX_JSON) return { truncated: true, bytes: text.length }
        return JSON.parse(text)
    } catch {
        return { unserializable: true }
    }
}

export function buildAuditRow(e: AuditEntry): AuditRow {
    return {
        actor_id: e.actor.id,
        actor_email: e.actor.email ?? null,
        action: e.action,
        target_type: e.targetType ?? null,
        target_id: e.targetId ?? null,
        summary: e.summary.length > MAX_SUMMARY ? `${e.summary.slice(0, MAX_SUMMARY - 1)}…` : e.summary,
        before: snapshot(e.before),
        after: snapshot(e.after),
        ip: e.ip ?? null,
    }
}

/** First hop of x-forwarded-for, else x-real-ip. Informational only: never used for a decision. */
export function clientIp(headers: { get(name: string): string | null }): string | null {
    return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || null
}

/**
 * The role someone falls back to when admin is taken away. `users.role` is 'admin' | 'client'
 * (owns an org or store) | 'customer'; the old "Revoke admin" button wrote 'user', which is none
 * of them.
 */
export function roleAfterAdmin(ownsOrgOrStore: boolean): 'client' | 'customer' {
    return ownsOrgOrStore ? 'client' : 'customer'
}
