// Best-effort rate limiter for the unauthenticated magic-code "send" endpoint.
//
// IMPORTANT: this is in-memory and therefore PER serverless instance. On Vercel,
// requests fan out across instances, so this does NOT enforce a global limit — it
// blunts rapid repeats that land on the same warm instance (the common case for a
// single abuser or a stuck client retrying). WorkOS imposes its own Magic Auth
// rate limits as the real backstop. If distributed abuse appears, replace this
// with a Supabase/Upstash-backed counter keyed the same way.
//
// Limits: max 3 sends per key per WINDOW_MS, where key is the email and the IP.

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_HITS = 3

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

function hit(key: string, now: number): boolean {
    const b = buckets.get(key)
    if (!b || b.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
        return true
    }
    if (b.count >= MAX_HITS) return false
    b.count += 1
    return true
}

// Opportunistic cleanup so the map can't grow unbounded on a long-lived instance.
function sweep(now: number) {
    if (buckets.size < 5000) return
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
}

/**
 * Returns true if the request is allowed. Counts against BOTH the email and the IP
 * so neither a single inbox nor a single source can exceed the cap.
 */
export function allowMagicSend(email: string, ip: string): boolean {
    const now = Date.now()
    sweep(now)
    // Evaluate both so both counters advance; allowed only if both are under cap.
    const emailOk = hit(`email:${email.toLowerCase()}`, now)
    const ipOk = hit(`ip:${ip}`, now)
    return emailOk && ipOk
}
