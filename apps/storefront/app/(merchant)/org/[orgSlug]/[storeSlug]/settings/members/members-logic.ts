// Who may do what on the store Members screen. The server actions enforce the same rules; this only
// decides which controls to show. Pure, so it is tested in members-logic.test.ts.

/**
 * Store roles are owner, admin and staff. Owners manage everyone but other owners; admins manage
 * staff only. Managing covers both removing someone and editing their permissions.
 */
export function canManageMember(currentRole: string | null, memberRole: string | null): boolean {
    if (memberRole === 'owner') return false
    return currentRole === 'owner' || (currentRole === 'admin' && memberRole === 'staff')
}

/** Whole days until `expiresAt` (rounded up), or null when there is no usable date. Never negative. */
export function daysUntil(expiresAt: string | null, now: number): number | null {
    if (!expiresAt) return null
    const at = Date.parse(expiresAt)
    if (Number.isNaN(at)) return null
    return Math.max(0, Math.ceil((at - now) / 86_400_000))
}

/** "owner" -> "Owner"; blank -> "Member". */
export function roleLabel(role: string | null | undefined): string {
    if (!role) return 'Member'
    return role.charAt(0).toUpperCase() + role.slice(1)
}
