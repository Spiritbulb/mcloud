// Pure helpers for the audit page: query-string parsing and the page window. No I/O (see audit-view.test.ts).
import { isAuditAction, type AuditAction } from '@/lib/audit-logic'
import type { BadgeTone } from '@mcloud/ui/kit/badge'

import { PAGE_SIZE, pageRange, totalPages } from '@mcloud/ui/kit/list-query'

export { PAGE_SIZE, pageRange, totalPages }

export type AuditQuery = { page: number; action: AuditAction | null; actor: string | null }

type Raw = Record<string, string | string[] | undefined>

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Untrusted search params -> a safe query. Unknown actions are dropped, not passed to the DB. */
export function parseAuditQuery(raw: Raw): AuditQuery {
    const page = Number.parseInt(first(raw.page) ?? '', 10)
    const action = first(raw.action)
    const actor = first(raw.actor)?.trim()
    return {
        page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
        action: action && isAuditAction(action) ? action : null,
        actor: actor ? actor.slice(0, 200) : null,
    }
}

/** Query string for a link, omitting defaults so URLs stay short. */
export function auditHref(q: Partial<AuditQuery>): string {
    const p = new URLSearchParams()
    if (q.page && q.page > 1) p.set('page', String(q.page))
    if (q.action) p.set('action', q.action)
    if (q.actor) p.set('actor', q.actor)
    const s = p.toString()
    return s ? `/admin/audit?${s}` : '/admin/audit'
}

/** Badge colour for an action's family, so the log scans by kind: plans and billing, status, access. */
export function auditTone(action: string): BadgeTone {
    if (action.startsWith('store.plan.') || action.startsWith('subscription.')) return 'info'
    if (action.startsWith('store.status.')) return 'warning'
    if (action.startsWith('user.role.')) return 'danger'
    return 'neutral'
}
