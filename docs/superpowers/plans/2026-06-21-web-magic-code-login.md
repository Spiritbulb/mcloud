# Web Magic-Code Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace web's AuthKit hosted-login redirect with in-app WorkOS Magic Auth (email → 6-digit code → cookie session), mirroring mobile.

**Architecture:** New web-owned routes `POST /api/auth/send-code` and `POST /api/auth/verify` drive the existing provider `sendMagicCode`/`verifyMagicCode`. A new provider method `verifyMagicCodeWeb(email, code, req)` performs the WorkOS magic-auth exchange and seals the result into the authkit-nextjs cookie via `saveSession`, keeping all WorkOS types inside the provider. The `/auth/login` and `/auth/sign-up` pages become two-step client forms; the provider's `getSignInUrl`/`getSignUpUrl` redirect branches are removed.

**Tech Stack:** Next.js (App Router), `@workos-inc/authkit-nextjs` (`saveSession`), `@mcloud/auth`, `@mcloud/ui`, React client components. Unit tests via Node's built-in `node:test` (no new dependency); cookie flow verified manually with run-mcloud.

## Global Constraints

- Provider abstraction: route handlers and UI MUST go through `@mcloud/auth` (`management`/`server`), never import `@workos-inc/*` directly. All WorkOS types stay inside `packages/auth/src/providers/workos.ts`.
- Send-code MUST always return `200 { ok: true }` (no account enumeration).
- New cookie-setting routes are same-origin POSTs and MUST NOT participate in the permissive credentialed-CORS reflection in `apps/web/proxy.ts`.
- `returnTo` MUST be sanitized to same-origin relative paths (start with `/`, not `//`, no scheme); otherwise fall back to `/auth/post-login`.
- Rate limit both send and verify per email + per IP.

---

### Task 1: `returnTo` sanitizer (pure, unit-tested)

**Files:**
- Create: `apps/web/app/api/auth/_return-to.ts`
- Test: `apps/web/app/api/auth/_return-to.test.ts`

**Interfaces:**
- Produces: `export function sanitizeReturnTo(value: unknown, fallback?: string): string` — returns `value` if it's a safe same-origin relative path, else `fallback` (default `/auth/post-login`).

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/app/api/auth/_return-to.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeReturnTo } from './_return-to.ts'

test('accepts a same-origin relative path', () => {
  assert.equal(sanitizeReturnTo('/org/acme/store'), '/org/acme/store')
})

test('rejects protocol-relative urls', () => {
  assert.equal(sanitizeReturnTo('//evil.com'), '/auth/post-login')
})

test('rejects absolute urls with a scheme', () => {
  assert.equal(sanitizeReturnTo('https://evil.com/x'), '/auth/post-login')
})

test('rejects values that do not start with a slash', () => {
  assert.equal(sanitizeReturnTo('org/acme'), '/auth/post-login')
})

test('rejects non-strings and uses the provided fallback', () => {
  assert.equal(sanitizeReturnTo(undefined, '/home'), '/home')
  assert.equal(sanitizeReturnTo(42, '/home'), '/home')
})

test('rejects backslash-escaped tricks', () => {
  assert.equal(sanitizeReturnTo('/\\evil.com'), '/auth/post-login')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types apps/web/app/api/auth/_return-to.test.ts`
Expected: FAIL — cannot find module `./_return-to.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/app/api/auth/_return-to.ts
// Sanitize an untrusted `returnTo` to a same-origin relative path, defeating
// open-redirect via absolute (scheme), protocol-relative (//host), or
// backslash-normalized (/\host) URLs.
const DEFAULT_RETURN_TO = '/auth/post-login'

export function sanitizeReturnTo(value: unknown, fallback: string = DEFAULT_RETURN_TO): string {
  if (typeof value !== 'string') return fallback
  // Must be a root-relative path. Reject anything a browser would treat as a host.
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  if (value.startsWith('/\\')) return fallback
  return value
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types apps/web/app/api/auth/_return-to.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/auth/_return-to.ts apps/web/app/api/auth/_return-to.test.ts
git commit -m "feat(auth): add returnTo sanitizer for web magic-code login"
```

---

### Task 2: Shared auth rate limiter with verify cap

**Files:**
- Create: `apps/web/app/api/_auth-ratelimit.ts` (moved + extended from `apps/web/app/api/mobile/auth/_ratelimit.ts`)
- Modify: `apps/web/app/api/mobile/auth/send-code/route.ts` (update import)
- Modify: `apps/web/app/api/mobile/auth/verify/route.ts` (add verify limit + import)
- Delete: `apps/web/app/api/mobile/auth/_ratelimit.ts`
- Test: `apps/web/app/api/_auth-ratelimit.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export function allowMagicSend(email: string, ip: string): boolean` — max 3 / 15 min per email AND per ip.
  - `export function allowMagicVerify(email: string, ip: string): boolean` — max 5 / 15 min per email AND per ip.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/app/api/_auth-ratelimit.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allowMagicSend, allowMagicVerify } from './_auth-ratelimit.ts'

test('send allows 3 then blocks the 4th for the same email', () => {
  const ip = '1.2.3.4'
  const email = `send-${Date.now()}@x.com`
  assert.equal(allowMagicSend(email, ip), true)
  assert.equal(allowMagicSend(email, `${ip}-a`), true)
  assert.equal(allowMagicSend(email, `${ip}-b`), true)
  assert.equal(allowMagicSend(email, `${ip}-c`), false) // email cap hit
})

test('verify allows 5 then blocks the 6th for the same email', () => {
  const email = `verify-${Date.now()}@x.com`
  for (let i = 0; i < 5; i++) {
    assert.equal(allowMagicVerify(email, `ip-${i}`), true)
  }
  assert.equal(allowMagicVerify(email, 'ip-x'), false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types apps/web/app/api/_auth-ratelimit.test.ts`
Expected: FAIL — cannot find module `./_auth-ratelimit.ts`.

- [ ] **Step 3: Create the shared limiter**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types apps/web/app/api/_auth-ratelimit.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Repoint the mobile send-code import and delete the old file**

In `apps/web/app/api/mobile/auth/send-code/route.ts`, replace:

```ts
import { allowMagicSend } from '../_ratelimit'
```

with:

```ts
import { allowMagicSend } from '../../_auth-ratelimit'
```

Then delete the old file:

```bash
git rm apps/web/app/api/mobile/auth/_ratelimit.ts
```

- [ ] **Step 6: Back-port the verify rate limit to the mobile verify route**

In `apps/web/app/api/mobile/auth/verify/route.ts`, add the import near the top (after the existing imports):

```ts
import { allowMagicVerify } from '../../_auth-ratelimit'
```

Then, immediately after the `if (!email || !code) return fail(400, 'Email and code are required')` line and BEFORE the `const tokens = await verifyMagicCode(...)` call, insert:

```ts
    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    if (!allowMagicVerify(email, ip)) {
        return fail(429, 'Too many attempts. Please wait a few minutes and try again.')
    }
```

- [ ] **Step 7: Typecheck the web app**

Run: `npm run build --workspace apps/web` (or the repo's typecheck if faster — see package.json scripts)
Expected: builds without the deleted-module / missing-import errors. (If `build` is heavy, at minimum `npx tsc --noEmit -p apps/web` must pass.)

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/api/_auth-ratelimit.ts apps/web/app/api/_auth-ratelimit.test.ts apps/web/app/api/mobile/auth/send-code/route.ts apps/web/app/api/mobile/auth/verify/route.ts
git commit -m "feat(auth): shared magic-code rate limiter + verify cap (web+mobile)"
```

---

### Task 3: Provider + management `verifyMagicCodeWeb`

Adds a cookie-session path to the provider so the web verify route never touches WorkOS types. `saveSession` is authkit-nextjs's documented hook for custom auth flows.

**Files:**
- Modify: `packages/auth/src/types.ts` (add method to `AuthProviderAdapter`)
- Modify: `packages/auth/src/providers/workos.ts` (implement it; import `saveSession`)
- Modify: `packages/auth/src/management.ts` (export wrapper)

**Interfaces:**
- Consumes: existing `verifyMagicCode` internals (the WorkOS `authenticateWithMagicAuth` result), `ensureLinked`, `mapUser`.
- Produces:
  - On `AuthProviderAdapter`: `verifyMagicCodeWeb(email: string, code: string, req: NextRequest): Promise<AuthUser | null>` — verifies the code, sets the auth cookie via `saveSession`, returns the mapped user (or null on bad code).
  - In `management.ts`: `export function verifyMagicCodeWeb(email: string, code: string, req: NextRequest): Promise<AuthUser | null>`.

- [ ] **Step 1: Add the method to the adapter interface**

In `packages/auth/src/types.ts`, inside `AuthProviderAdapter`, directly after the `verifyMagicCode(...)` line, add:

```ts
    /**
     * Web cookie-session variant of magic-code verification: verifies the code and
     * seals the resulting session into the provider's cookie (so withAuth() reads
     * it), returning the mapped user. Lets web do magic-code login with no OAuth
     * redirect. Returns null on an invalid/expired code.
     */
    verifyMagicCodeWeb(email: string, code: string, req: NextRequest): Promise<AuthUser | null>
```

(`NextRequest` and `AuthUser` are already imported/defined in this file — confirm the `NextRequest` import exists at the top; it does, used by other methods.)

- [ ] **Step 2: Implement it in the WorkOS provider**

In `packages/auth/src/providers/workos.ts`, add `saveSession` to the authkit import block:

```ts
import {
    authkit,
    withAuth,
    getSignInUrl,
    getSignUpUrl,
    getWorkOS,
    partitionAuthkitHeaders,
    applyResponseHeaders,
    saveSession,
} from '@workos-inc/authkit-nextjs'
```

Then add this method to the `workosProvider` object, immediately after `verifyMagicCode`:

```ts
    async verifyMagicCodeWeb(email: string, code: string, req): Promise<AuthUser | null> {
        try {
            const res = await getWorkOS().userManagement.authenticateWithMagicAuth({
                clientId: process.env.WORKOS_CLIENT_ID,
                email,
                code,
            })
            const user = await ensureLinked(res.user as WorkOSUserish)
            // Seal the WorkOS session into the authkit cookie. saveSession accepts the
            // Session shape ({ accessToken, refreshToken, user }); we pass the RAW
            // WorkOS user (res.user) so the cookie's encoded user matches what
            // withAuth() expects, while we return the MAPPED user to the app.
            await saveSession(
                { accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user },
                req,
            )
            return mapUser(user)
        } catch {
            return null
        }
    },
```

- [ ] **Step 3: Add the management wrapper**

In `packages/auth/src/management.ts`, add the `NextRequest` type import at the top:

```ts
import type { NextRequest } from 'next/server'
```

and below `verifyMagicCode`, add:

```ts
/**
 * Web variant: verify an emailed code and set the auth cookie (no OAuth redirect).
 * Returns the user, or null if the code is invalid/expired.
 */
export function verifyMagicCodeWeb(email: string, code: string, req: NextRequest): Promise<AuthUser | null> {
    return provider.verifyMagicCodeWeb(email, code, req)
}
```

Also ensure `AuthUser` is imported in `management.ts` (add to the existing `import type { LoginEvent, NativeAuthTokens } from './types'` line → `import type { AuthUser, LoginEvent, NativeAuthTokens } from './types'`).

- [ ] **Step 4: Typecheck the auth package**

Run: `npx tsc --noEmit -p packages/auth` (or `npm run build --workspace @mcloud/auth` if defined)
Expected: PASS. If `req` param needs an explicit type, annotate as `req: NextRequest` in the provider method and import `NextRequest` there (it is already imported in workos.ts via `type { NextRequest }`).

- [ ] **Step 5: Commit**

```bash
git add packages/auth/src/types.ts packages/auth/src/providers/workos.ts packages/auth/src/management.ts
git commit -m "feat(auth): add verifyMagicCodeWeb (cookie session via saveSession)"
```

---

### Task 4: `POST /api/auth/send-code` route

**Files:**
- Create: `apps/web/app/api/auth/send-code/route.ts`

**Interfaces:**
- Consumes: `sendMagicCode` (`@mcloud/auth/management`), `allowMagicSend` (Task 2).
- Produces: `POST /api/auth/send-code` `{ email }` → always `200 { ok: true }` (or `400` for malformed email, `429` when rate-limited).

- [ ] **Step 1: Write the route**

```ts
// apps/web/app/api/auth/send-code/route.ts
// POST /api/auth/send-code  { email }
// Emails a one-time magic-code (WorkOS Magic Auth) for in-app web login. Always
// 200 regardless of whether the email exists, to avoid account enumeration.
// Rate-limited per email + per IP. Same-origin form POST (no CORS needed).
import { NextResponse, type NextRequest } from 'next/server'
import { sendMagicCode } from '@mcloud/auth/management'
import { allowMagicSend } from '../../_auth-ratelimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
    let body: { email?: unknown }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!EMAIL_RE.test(email)) {
        return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'

    if (!allowMagicSend(email, ip)) {
        return NextResponse.json(
            { error: 'Too many attempts. Please wait a few minutes and try again.' },
            { status: 429 },
        )
    }

    // Don't leak whether the email exists or whether WorkOS errored — always 200.
    try {
        await sendMagicCode(email)
    } catch {
        // swallowed by design (no enumeration / no provider-detail leak)
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
```

- [ ] **Step 2: Manual smoke (deferred to Task 7)**

This route is exercised end-to-end in Task 7's manual run. No isolated test here (it has no pure logic beyond validation already covered).

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/auth/send-code/route.ts
git commit -m "feat(auth): web POST /api/auth/send-code (magic code)"
```

---

### Task 5: `POST /api/auth/verify` route

**Files:**
- Create: `apps/web/app/api/auth/verify/route.ts`

**Interfaces:**
- Consumes: `verifyMagicCodeWeb` (Task 3), `allowMagicVerify` (Task 2), `sanitizeReturnTo` (Task 1).
- Produces: `POST /api/auth/verify` `{ email, code, returnTo? }` → `200 { ok: true, next }` (cookie set) | `400` bad code | `429` rate-limited.

- [ ] **Step 1: Write the route**

```ts
// apps/web/app/api/auth/verify/route.ts
// POST /api/auth/verify  { email, code, returnTo? }
// Verifies an emailed magic-code and sets the authkit session cookie via the
// provider (verifyMagicCodeWeb → saveSession). No OAuth redirect. The client then
// navigates to `next` (sanitized returnTo, else /auth/post-login, which upserts
// the users row and routes to org/onboarding). Rate-limited per email + IP.
// Same-origin form POST; the cookie is set here so it MUST stay same-origin.
import { NextResponse, type NextRequest } from 'next/server'
import { verifyMagicCodeWeb } from '@mcloud/auth/management'
import { allowMagicVerify } from '../../_auth-ratelimit'
import { sanitizeReturnTo } from '../_return-to'

export async function POST(req: NextRequest) {
    let body: { email?: unknown; code?: unknown; returnTo?: unknown }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!email || !code) {
        return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    if (!allowMagicVerify(email, ip)) {
        return NextResponse.json(
            { error: 'Too many attempts. Please wait a few minutes and try again.' },
            { status: 429 },
        )
    }

    const user = await verifyMagicCodeWeb(email, code, req)
    if (!user) {
        return NextResponse.json(
            { error: 'That code is invalid or expired. Request a new one.' },
            { status: 400 },
        )
    }

    const next = sanitizeReturnTo(body.returnTo)
    return NextResponse.json({ ok: true, next }, { headers: { 'Cache-Control': 'no-store' } })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/auth/verify/route.ts
git commit -m "feat(auth): web POST /api/auth/verify (sets cookie, returns next)"
```

---

### Task 6: Two-step login/sign-up UI + remove redirect branches + CORS exclusion

**Files:**
- Modify: `apps/web/components/login-form.tsx` (two-step form, accepts mode + returnTo)
- Modify: `apps/web/app/auth/login/page.tsx` (pass mode="login", read returnTo)
- Modify: `apps/web/app/auth/sign-up/page.tsx` (render the form with mode="signup")
- Modify: `packages/auth/src/providers/workos.ts` (remove `getSignInUrl`/`getSignUpUrl` redirect branches)
- Modify: `apps/web/proxy.ts` (exclude `/api/auth/` from credentialed CORS reflection)

**Interfaces:**
- Consumes: `POST /api/auth/send-code`, `POST /api/auth/verify` (Tasks 4–5).
- Produces: `MagicCodeForm` rendered by both pages. No exported types other tasks depend on.

- [ ] **Step 1: Rewrite the login form as a two-step magic-code form**

```tsx
// apps/web/components/login-form.tsx
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@mcloud/ui/utils'
import { Button } from '@mcloud/ui/button'

type Mode = 'login' | 'signup'

async function postJson(url: string, data: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; next?: string; error?: string }
  return { ok: res.ok, json }
}

export function MagicCodeForm({
  className,
  mode = 'login',
  returnTo,
  onSwitch,
}: {
  className?: string
  mode?: Mode
  returnTo?: string
  onSwitch?: () => void
}) {
  const router = useRouter()
  const [step, setStep] = React.useState<'email' | 'code'>('email')
  const [email, setEmail] = React.useState('')
  const [code, setCode] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const cta = mode === 'signup' ? 'Create account' : 'Continue'

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { ok, json } = await postJson('/api/auth/send-code', { email })
    setBusy(false)
    if (!ok) {
      setError(json.error ?? 'Could not send a code. Please try again.')
      return
    }
    setStep('code')
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { ok, json } = await postJson('/api/auth/verify', { email, code, returnTo })
    if (!ok) {
      setBusy(false)
      setError(json.error ?? 'That code is invalid or expired. Request a new one.')
      return
    }
    router.push(json.next ?? '/auth/post-login')
  }

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {step === 'email' ? (
        <form onSubmit={sendCode} className="flex flex-col gap-4">
          <input
            type="email"
            required
            autoFocus
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 w-full rounded-none border border-input bg-background px-3 text-sm"
          />
          <Button type="submit" disabled={busy} className="w-full h-10 rounded-none google-button-primary">
            {busy ? 'Sending…' : cta}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code we emailed to <span className="text-foreground">{email}</span>.
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-10 w-full rounded-none border border-input bg-background px-3 text-center text-lg tracking-[0.4em]"
          />
          <Button type="submit" disabled={busy} className="w-full h-10 rounded-none google-button-primary">
            {busy ? 'Verifying…' : 'Verify'}
          </Button>
          <button
            type="button"
            onClick={() => { setStep('email'); setCode(''); setError(null) }}
            className="text-center text-sm text-muted-foreground hover:underline underline-offset-4"
          >
            Use a different email
          </button>
        </form>
      )}

      {error && <p className="text-center text-sm text-destructive">{error}</p>}

      {onSwitch && (
        <p className="text-center text-sm text-muted-foreground">
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={onSwitch}
            className="text-foreground font-medium hover:underline underline-offset-4"
          >
            {mode === 'signup' ? 'Sign in' : 'Get started free'}
          </button>
        </p>
      )}
    </div>
  )
}

// Back-compat alias: existing imports of LoginForm keep working (login mode).
export const LoginForm = (props: { className?: string; returnTo?: string; onSwitch?: () => void }) => (
  <MagicCodeForm {...props} mode="login" />
)
```

- [ ] **Step 2: Update the login page to read returnTo**

```tsx
// apps/web/app/auth/login/page.tsx
import { MagicCodeForm } from '@/components/login-form'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <MagicCodeForm mode="login" returnTo={returnTo} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update the sign-up page**

Open `apps/web/app/auth/sign-up/page.tsx`, and replace its body so it renders the form in signup mode (keep any surrounding layout/marketing copy already there; only swap the auth control). Minimum viable version:

```tsx
// apps/web/app/auth/sign-up/page.tsx
import { MagicCodeForm } from '@/components/login-form'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <MagicCodeForm mode="signup" returnTo={returnTo} />
      </div>
    </div>
  )
}
```

(If the existing sign-up page has marketing markup worth keeping, preserve it and only replace the WorkOS redirect button/link with `<MagicCodeForm mode="signup" returnTo={returnTo} />`.)

- [ ] **Step 4: Remove the WorkOS redirect branches from the provider middleware**

In `packages/auth/src/providers/workos.ts`, in the `middleware` method, delete the two redirect branches:

```ts
        if (pathname === LOGIN_URL) {
            return NextResponse.redirect(await getSignInUrl({ returnTo, redirectUri }))
        }
        if (pathname === SIGNUP_URL) {
            return NextResponse.redirect(await getSignUpUrl({ returnTo, redirectUri }))
        }
```

The pages now render in-app, so `/auth/login` and `/auth/sign-up` must fall through to normal rendering. The method body reduces to returning `NextResponse.next()`. Remove the now-unused locals (`returnTo`, `redirectUri`) and the now-unused imports `getSignInUrl`, `getSignUpUrl`, `LOGIN_URL`, `SIGNUP_URL`, and `platformCallbackUri`/`POST_LOGIN_PATH` **only if** they are unused elsewhere in the file — verify with a search before deleting each. (`POST_LOGIN_PATH` is only used here; `platformCallbackUri` is only used here. `getSignUpUrl`/`getSignInUrl` only here.)

Resulting method:

```ts
    async middleware(req: NextRequest) {
        // Magic-code login renders in-app (apps/web /auth/login, /auth/sign-up post to
        // /api/auth/*). There's no longer an OAuth redirect for these routes; let them
        // render. /auth/logout, /callback, /auth/post-login also fall through.
        return NextResponse.next()
    },
```

- [ ] **Step 5: Exclude `/api/auth/` from credentialed CORS reflection**

In `apps/web/proxy.ts`, inside the `if (pathname.startsWith('/api/'))` block, guard the reflective CORS headers so the cookie-setting web auth routes are same-origin only. Replace:

```ts
      if (origin) {
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
      }
```

with:

```ts
      // The web auth routes set the session cookie — they must NOT be callable
      // cross-origin with credentials (CSRF). They're same-origin form posts, so
      // skip the reflective CORS headers for them. Mobile/data routes (bearer auth)
      // keep the reflection.
      const isWebAuthRoute = pathname.startsWith('/api/auth/')
      if (origin && !isWebAuthRoute) {
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
      }
```

- [ ] **Step 6: Typecheck / build web**

Run: `npx tsc --noEmit -p apps/web`
Expected: PASS (no unused-import or missing-symbol errors from the removals).

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/login-form.tsx apps/web/app/auth/login/page.tsx apps/web/app/auth/sign-up/page.tsx packages/auth/src/providers/workos.ts apps/web/proxy.ts
git commit -m "feat(auth): in-app magic-code login/sign-up UI; remove AuthKit redirect; lock web auth CORS"
```

---

### Task 7: End-to-end manual verification (run-mcloud)

**Files:** none (verification only).

- [ ] **Step 1: Start the app**

Use the `run-mcloud` skill to build and launch web.

- [ ] **Step 2: Login happy path**

Navigate to `/auth/login`. Enter a real test email → submit. Confirm:
- The form advances to the code step.
- A 6-digit code arrives by email.
- Entering it logs in and lands on the org/onboarding page (via `/auth/post-login`).
- Reload a protected page (e.g. `/org`) — session persists (cookie set).

Expected: full login with no redirect to a WorkOS-hosted page at any point.

- [ ] **Step 3: Bad code path**

Repeat to the code step, enter `000000`. Expected: inline error "That code is invalid or expired. Request a new one." and the user stays on the code step.

- [ ] **Step 4: returnTo honored (same-origin) and ignored (off-origin)**

Visit `/auth/login?returnTo=/org` and complete login → lands on `/org`.
Visit `/auth/login?returnTo=https://evil.com` and complete login → lands on `/auth/post-login` (NOT evil.com).

- [ ] **Step 5: Sign-up page**

Navigate to `/auth/sign-up`, complete the flow with a NEW email → confirm a new account is created and lands on onboarding.

- [ ] **Step 6: Mobile still works (regression)**

Confirm `/api/mobile/auth/send-code` + `/verify` still function (the rate-limit refactor didn't break them) — quick curl or mobile app login.

Run (send): `curl -s -X POST <web-origin>/api/mobile/auth/send-code -H 'Content-Type: application/json' -d '{"email":"test@example.com"}'`
Expected: `{"ok":true}`.

- [ ] **Step 7: Final commit (if any verification tweaks were needed)**

Only if Steps 2–6 surfaced fixes; otherwise nothing to commit.

---

## Notes for the implementer

- Run unit tests with: `node --test --experimental-strip-types <file>` (Node ≥ 22; the repo targets Node 24 per memory). If `--experimental-strip-types` is unavailable, the CI/typecheck still covers types; the pure functions are simple enough to also verify by a quick `tsx` run.
- Do NOT import `@workos-inc/*` outside `packages/auth/src/providers/`. The cookie is set only inside the provider via `saveSession`.
- **`saveSession` argument fallback:** Task 3 passes a hand-built `Session` (`{ accessToken, refreshToken, user: res.user }`). If TS rejects `res.user` against authkit's `User` type, pass the full `AuthenticationResponse` instead — `saveSession(res, req)` is also supported (it accepts `Session | AuthenticationResponse`). Prefer that fallback over casting.
- WorkOS dashboard: no redirect-URI changes needed (we're removing redirects, not adding). Magic Auth must be enabled for the WorkOS environment (it already is — mobile uses it).
