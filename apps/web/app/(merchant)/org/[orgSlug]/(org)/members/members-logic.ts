// Who may do what on the org Members screen. The server actions enforce the same rules; this only
// decides which controls to show. Pure, so it is tested in members-logic.test.ts.

export type OrgRole = 'owner' | 'admin' | 'member'

/**
 * Owners can remove anyone but another owner; admins can remove plain members; members can remove
 * no one. Only owners change roles, and never an owner's.
 */
export function memberPermissions(currentRole: string | null, memberRole: string | null): { canRemove: boolean; canChangeRole: boolean } {
    const canRemove = memberRole !== 'owner' && (currentRole === 'owner' || (currentRole === 'admin' && memberRole === 'member'))
    const canChangeRole = currentRole === 'owner' && memberRole !== 'owner'
    return { canRemove, canChangeRole }
}

export function canInvite(currentRole: string | null): boolean {
    return currentRole === 'owner' || currentRole === 'admin'
}

/** Whole days until `expiresAt` (rounded up), or null when there is no date. Never negative. */
export function daysUntil(expiresAt: string | null, now: number): number | null {
    if (!expiresAt) return null
    const at = Date.parse(expiresAt)
    if (Number.isNaN(at)) return null
    return Math.max(0, Math.ceil((at - now) / 86_400_000))
}
