// apps/storefront/app/api/store/_analytics-ratelimit.ts
// Best-effort in-memory rate limiter for the UNAUTHENTICATED analytics beacon
// (POST /api/store/[slug]/analytics). PER serverless instance — this blunts a
// single abusive session/IP on a warm instance rather than enforcing a global
// limit. A real shopper's browser fires at most a handful of events per visit
// (view, add_to_cart, checkout_started, order_placed), so the cap is generous
// for legitimate traffic and cheap for a script hammering the open endpoint.
//
// Keys count against BOTH session_id and IP, so neither a spoofed session id
// nor a single source can alone exceed the cap.

const WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const MAX_PER_WINDOW = 60

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

function hit(key: string, now: number): boolean {
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (b.count >= MAX_PER_WINDOW) return false
  b.count += 1
  return true
}

// Opportunistic cleanup so the map can't grow unbounded on a long-lived instance.
function sweep(now: number) {
  if (buckets.size < 5000) return
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
}

/** True if an analytics event POST is allowed (max 60 / 5 min per store+session and per store+ip). */
export function allowAnalyticsEvent(storeId: string, sessionId: string | null, ip: string): boolean {
  const now = Date.now()
  sweep(now)
  const sessionOk = hit(`session:${storeId}:${sessionId ?? 'none'}`, now)
  const ipOk = hit(`ip:${storeId}:${ip}`, now)
  return sessionOk && ipOk
}
