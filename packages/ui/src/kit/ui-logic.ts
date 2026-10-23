// Pure helpers for the admin UI kit: deltas and chart geometry. No React, no I/O, so they are
// testable under bare `node --test` (see ui-logic.test.ts).

/** Percent change from `previous` to `current`. null when there is no baseline to compare with. */
export function percentChange(current: number, previous: number): number | null {
    if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null
    return ((current - previous) / Math.abs(previous)) * 100
}

export type DeltaTone = 'up' | 'down' | 'flat'

/** Direction of a change; anything under half a percent reads as flat. */
export function deltaTone(pct: number | null): DeltaTone {
    if (pct === null || Math.abs(pct) < 0.5) return 'flat'
    return pct > 0 ? 'up' : 'down'
}

/** "+12%", "−4%", "0%". The minus is a real minus sign, which lines up better in tabular figures. */
export function formatDelta(pct: number | null): string {
    if (pct === null) return '—'
    const r = Math.round(Math.abs(pct))
    if (r === 0) return '0%'
    return `${pct > 0 ? '+' : '−'}${r.toLocaleString('en-US')}%`
}

/**
 * SVG paths for a sparkline in a `width` x `height` box with `pad` px of breathing room.
 * `line` is the stroke; `area` is the same path closed to the baseline, for a soft fill.
 * A flat or single-point series is drawn as a level line rather than collapsing to nothing.
 */
export function sparklinePaths(
    values: number[],
    width: number,
    height: number,
    pad = 2,
): { line: string; area: string } {
    if (values.length === 0) return { line: '', area: '' }
    const max = Math.max(...values)
    const min = Math.min(...values)
    const span = max - min
    const innerW = width - pad * 2
    const innerH = height - pad * 2
    const x = (i: number) => (values.length === 1 ? width / 2 : pad + (i / (values.length - 1)) * innerW)
    // A flat series sits mid-height; otherwise the minimum rests on the baseline.
    const y = (v: number) => (span === 0 ? height / 2 : pad + innerH - ((v - min) / span) * innerH)
    const pts = values.map((v, i) => `${round(x(i))} ${round(y(v))}`)
    const line = `M${pts.join(' L')}`
    const area = `${line} L${round(x(values.length - 1))} ${height - pad} L${round(x(0))} ${height - pad} Z`
    return { line, area }
}

function round(n: number): number {
    return Math.round(n * 100) / 100
}

/** Two-letter initials for an avatar; "?" when there is no name to take them from. */
export function initials(name: string | null | undefined): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

/**
 * Compact relative time: "just now", "5m ago", "3h ago", "2d ago", then "3mo ago" / "2y ago".
 * `now` is passed in so callers control (and tests can pin) the clock; an unparseable date is "".
 */
export function timeAgo(iso: string | null | undefined, now: number): string {
    if (!iso) return ''
    const at = Date.parse(iso)
    if (Number.isNaN(at)) return ''
    const mins = Math.max(0, Math.round((now - at) / 60_000))
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.round(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.round(hours / 24)
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    return `${Math.floor(months / 12)}y ago`
}

/**
 * Width of one skeleton bar, as a percentage of its cell. Varies by row and column so a loading
 * table looks like text rather than a grid of identical blocks, but is deterministic: the same
 * cell gets the same width on every render, so nothing shimmers between frames or hydration.
 */
export function skeletonWidth(row: number, col: number): number {
    const widths = [72, 48, 86, 60, 40, 78, 54]
    return widths[(row * 3 + col * 5) % widths.length]
}

/**
 * Whether a form's draft differs from what was last saved. Compares plain data (strings, numbers,
 * booleans, null, arrays and objects); key order does not matter. Drives the save bar.
 */
export function isDirty(saved: unknown, draft: unknown): boolean {
    return !sameValue(saved, draft)
}

function sameValue(a: unknown, b: unknown): boolean {
    if (a === b) return true
    // Treat undefined and null as the same "empty" value, the way form state usually does.
    if (a == null && b == null) return true
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
    if (Array.isArray(a) !== Array.isArray(b)) return false
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => sameValue(v, b[i]))
    // Compare over the union of keys, so a missing key matches one set to undefined or null.
    const ra = a as Record<string, unknown>
    const rb = b as Record<string, unknown>
    const keys = new Set([...Object.keys(ra), ...Object.keys(rb)])
    return [...keys].every((k) => sameValue(ra[k], rb[k]))
}
