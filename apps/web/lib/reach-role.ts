// Reach keeps its own profile (reach_users) instead of overwriting users.role. The mobile app
// still expects the legacy strings 'rch-customer' / 'rch-vendor' from /api/mobile/me, so the
// mapping lives here and nothing else needs to know the app's vocabulary.
export type ReachRole = 'buyer' | 'vendor'

export function toAppRole(role: ReachRole): 'rch-customer' | 'rch-vendor' {
    return role === 'vendor' ? 'rch-vendor' : 'rch-customer'
}

/**
 * The role /api/mobile/me reports. A Reach profile wins; otherwise the platform role, as before
 * ('user' when there is no row at all). A platform admin who is also a Reach vendor reports
 * 'rch-vendor' to the Reach app and still passes requireAdmin, which reads users.role.
 */
export function resolveMobileRole(
    platformRole: string | null | undefined,
    reachRole: string | null | undefined,
): string {
    if (reachRole === 'buyer' || reachRole === 'vendor') return toAppRole(reachRole)
    return platformRole ?? 'user'
}
