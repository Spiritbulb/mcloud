// apps/web/app/api/_auth-ratelimit.ts
// Best-effort in-memory rate limiter for the UNAUTHENTICATED magic-code endpoints
// (web + mobile). PER serverless instance — on Vercel requests fan out, so this
// blunts rapid repeats on a warm instance rather than enforcing a global limit;
// WorkOS Magic Auth's own limits are the real backstop. Swap to Upstash/Supabase
// (keyed the same way) if distributed abuse appears.
//
// Keys count against BOTH email and IP, so neither a single inbox nor a single
// source can exceed the cap. Send and verify have separate caps.

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const SEND_MAX = 3
const VERIFY_MAX = 5

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

function hit(key: string, max: number, now: number): boolean {
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (b.count >= max) return false
  b.count += 1
  return true
}

// Opportunistic cleanup so the map can't grow unbounded on a long-lived instance.
function sweep(now: number) {
  if (buckets.size < 5000) return
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
}

function allow(prefix: string, email: string, ip: string, max: number): boolean {
  const now = Date.now()
  sweep(now)
  // Evaluate both so both counters advance; allowed only if both are under cap.
  const emailOk = hit(`${prefix}:email:${email.toLowerCase()}`, max, now)
  const ipOk = hit(`${prefix}:ip:${ip}`, max, now)
  return emailOk && ipOk
}

/** True if a magic-code SEND is allowed (max 3 / 15 min per email and per ip). */
export function allowMagicSend(email: string, ip: string): boolean {
  return allow('send', email, ip, SEND_MAX)
}

/** True if a magic-code VERIFY attempt is allowed (max 5 / 15 min per email and per ip). */
export function allowMagicVerify(email: string, ip: string): boolean {
  return allow('verify', email, ip, VERIFY_MAX)
}
