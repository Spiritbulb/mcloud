// lib/auth/format.ts
// Small presentation helpers for login-history entries, shared by provider adapters.

/** Best-effort human-readable device string from a User-Agent. */
export function formatDevice(ua: string): string {
    if (!ua) return 'Unknown device'
    const browser =
        ua.includes('Edg/') ? 'Edge' :
            ua.includes('Chrome') ? 'Chrome' :
                ua.includes('Firefox') ? 'Firefox' :
                    ua.includes('Safari') ? 'Safari' : 'Browser'
    const os =
        ua.includes('iPhone') ? 'iPhone' :
            ua.includes('iPad') ? 'iPad' :
                ua.includes('Android') ? 'Android' :
                    ua.includes('Macintosh') ? 'macOS' :
                        ua.includes('Windows') ? 'Windows' :
                            ua.includes('Linux') ? 'Linux' : 'Unknown OS'
    return `${browser} on ${os}`
}

/** "Just now" / "5m ago" / "3h ago" / "2d ago" / date, from an ISO timestamp. */
export function formatRelativeTime(dateStr?: string): string {
    if (!dateStr) return 'Unknown'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
}
