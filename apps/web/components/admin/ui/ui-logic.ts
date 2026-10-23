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
