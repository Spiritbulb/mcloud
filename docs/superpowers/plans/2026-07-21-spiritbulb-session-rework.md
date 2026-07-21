# Spiritbulb Session Rework (SSO PR 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace spiritbulb's presence-check `sb_session` (a raw, unrefreshed WorkOS access token in a 30-day cookie) with a real verified session: an encrypted `{accessToken, refreshToken, expiresAt}` cookie scoped to `.spiritb.uk`, server-side refresh against WorkOS, and a `/home` gate that verifies instead of noticing a cookie.

**Architecture:** All work is in the **spiritbulb repo** (`c:\Users\busie\spiritbulb`). No MCloud changes — MCloud already returns `{accessToken, refreshToken, expiresIn}` from `/api/partner/auth/verify`, which spiritbulb currently discards all but the access token of. We add a `lib/auth/session-crypto.ts` (AES-GCM seal/open via Node `crypto.webcrypto`), extend `lib/auth/session.ts` with a server-side `getSession()` that refreshes lapsed tokens by POSTing the refresh token to WorkOS's token endpoint, rewrite `verify-code` to seal the full token set, and switch `proxy.ts` + `layout.tsx` from `hasSession()` to the verified read.

**Tech Stack:** Next 16 (App Router, Turbopack), React 19, TypeScript 5, Vitest 3 (`environment: "node"`), Node `crypto.webcrypto` (no new dependency), WorkOS user-management token endpoint.

## Global Constraints

- **Repo:** all paths are under `c:\Users\busie\spiritbulb`. No MCloud/mobile changes in this PR.
- **No new runtime dependency.** AES-GCM uses Node's built-in `crypto.webcrypto`. (`vitest` already present.)
- **Cookie name stays `sb_session`** (the `SESSION_COOKIE` constant). Do not rename — the login flow, proxy, and prod cookies all use it.
- **Cookie attributes:** `httpOnly: true, secure: true, sameSite: "lax", path: "/", domain: ".spiritb.uk"`, `maxAge` = **7 days** (`60 * 60 * 24 * 7`). The `domain` gives subdomain SSO.
- **Fail closed on missing key:** if `SESSION_ENC_KEY` is unset, sealing/opening throws — never fall back to a plaintext cookie.
- **`redirect: "error"` on outbound auth fetches** (existing convention in `mcloud-client.ts`) — a 30x would drop headers/change semantics.
- **No em dashes in any user-facing copy** (periods/commas instead). Applies to any visible string.
- **Test style:** Vitest with `describe/it/expect`, `@/` alias, `global.fetch` mocked, env vars set in `beforeEach`. Match `lib/auth/mcloud-client.test.ts`.
- **`.spiritb.uk` cookies do not work on `localhost`.** For local dev the domain must be omitted; gate it on an env check (see Task 4). Tests assert the production shape.

---

## File Structure

- **Create** `lib/auth/session-crypto.ts` — `sealSession()` / `openSession()`, AES-GCM over the session JSON. Pure, no Next imports. One responsibility: encrypt/decrypt.
- **Create** `lib/auth/session-crypto.test.ts` — round-trip, tamper, missing-key.
- **Create** `lib/auth/workos-refresh.ts` — `refreshWorkOSTokens(refreshToken)`, POSTs to WorkOS's token endpoint. One responsibility: token refresh. No cookie logic.
- **Create** `lib/auth/workos-refresh.test.ts` — success, failure, network error.
- **Modify** `lib/auth/session.ts` — keep `SESSION_COOKIE`; add types `SessionData` + `sessionCookieOptions()`; add server-only `getSession()` (open → refresh-if-lapsed → reseal) and `clearSessionCookie()`. Keep `hasSession` (still used by the presence-only nav until the layout switch in Task 6).
- **Modify** `lib/auth/session.test.ts` — extend for `getSession` behavior.
- **Modify** `app/api/auth/verify-code/route.ts` — seal `{accessToken, refreshToken, expiresAt}` instead of storing the raw access token.
- **Modify** `app/api/auth/verify-code/route.test.ts` — assert the cookie is opaque (not the raw token) and decrypts to the full set.
- **Modify** `proxy.ts` — `/home` gate uses the verified read, not `hasSession()`.
- **Modify** `app/layout.tsx` — Header `signedIn` uses the verified read (supersedes the presence check shipped in `fix/header-auth-state`).
- **Modify** `.env.example` — document `SESSION_ENC_KEY` and `WORKOS_CLIENT_ID`.

---

## Task 1: Session crypto (seal/open)

**Files:**
- Create: `lib/auth/session-crypto.ts`
- Test: `lib/auth/session-crypto.test.ts`

**Interfaces:**
- Produces:
  - `type SessionData = { accessToken: string; refreshToken: string; expiresAt: number }` (`expiresAt` = epoch **ms**)
  - `sealSession(data: SessionData): Promise<string>` — returns `base64url(iv).base64url(ciphertext+tag)`
  - `openSession(sealed: string): Promise<SessionData | null>` — null on tamper/format/decrypt failure; **throws** if `SESSION_ENC_KEY` is unset/invalid.

- [ ] **Step 1: Write the failing test**

```ts
// lib/auth/session-crypto.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { sealSession, openSession, type SessionData } from "@/lib/auth/session-crypto";

// 32-byte key, base64. AES-256-GCM.
const KEY = Buffer.alloc(32, 7).toString("base64");
const sample: SessionData = { accessToken: "at_1", refreshToken: "rt_1", expiresAt: 1_800_000_000_000 };

describe("session-crypto", () => {
  beforeEach(() => { process.env.SESSION_ENC_KEY = KEY; });

  it("round-trips a session", async () => {
    const sealed = await sealSession(sample);
    expect(sealed).not.toContain("at_1"); // opaque, not the raw token
    expect(await openSession(sealed)).toEqual(sample);
  });

  it("returns null on a tampered blob", async () => {
    const sealed = await sealSession(sample);
    const tampered = sealed.slice(0, -2) + (sealed.endsWith("AA") ? "BB" : "AA");
    expect(await openSession(tampered)).toBeNull();
  });

  it("returns null on garbage input", async () => {
    expect(await openSession("not-a-real-blob")).toBeNull();
  });

  it("throws when the key is missing", async () => {
    delete process.env.SESSION_ENC_KEY;
    await expect(sealSession(sample)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run lib/auth/session-crypto.test.ts`
Expected: FAIL — cannot find module `@/lib/auth/session-crypto`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/auth/session-crypto.ts
// AES-256-GCM seal/open for the sb_session cookie. Encrypts (not just signs)
// because the payload holds a refresh token, a long-lived bearer credential.
// Uses Node's built-in webcrypto, so no runtime dependency.
import { webcrypto as crypto } from "node:crypto";

export type SessionData = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
};

function b64urlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}
function b64urlDecode(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, "base64url"));
}

async function importKey(): Promise<CryptoKey> {
  const raw = process.env.SESSION_ENC_KEY;
  if (!raw) throw new Error("SESSION_ENC_KEY is not set");
  const keyBytes = new Uint8Array(Buffer.from(raw, "base64"));
  if (keyBytes.byteLength !== 32) {
    throw new Error("SESSION_ENC_KEY must be 32 bytes (base64-encoded)");
  }
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealSession(data: SessionData): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext),
  );
  return `${b64urlEncode(iv)}.${b64urlEncode(ct)}`;
}

export async function openSession(sealed: string): Promise<SessionData | null> {
  // A missing key is a config error (throw); a bad blob is an untrusted input (null).
  const key = await importKey();
  try {
    const [ivPart, ctPart] = sealed.split(".");
    if (!ivPart || !ctPart) return null;
    const iv = b64urlDecode(ivPart);
    const ct = b64urlDecode(ctPart);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(pt)) as SessionData;
  } catch {
    return null; // tamper, truncation, or non-JSON plaintext
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run lib/auth/session-crypto.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd c:/Users/busie/spiritbulb
git add lib/auth/session-crypto.ts lib/auth/session-crypto.test.ts
git commit -m "feat(auth): AES-GCM seal/open for the session cookie"
```

---

## Task 2: WorkOS token refresh

**Files:**
- Create: `lib/auth/workos-refresh.ts`
- Test: `lib/auth/workos-refresh.test.ts`

**Interfaces:**
- Consumes: `SessionData` shape from Task 1 (uses `accessToken`, `refreshToken`, `expiresAt`).
- Produces: `refreshWorkOSTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null>` — null on any failure. `expiresAt` = `Date.now() + expires_in*1000`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/auth/workos-refresh.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { refreshWorkOSTokens } from "@/lib/auth/workos-refresh";

const realFetch = global.fetch;
beforeEach(() => { process.env.WORKOS_CLIENT_ID = "client_test"; });
afterEach(() => { global.fetch = realFetch; vi.restoreAllMocks(); });

describe("refreshWorkOSTokens", () => {
  it("exchanges a refresh token for a new pair", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ access_token: "at_new", refresh_token: "rt_new", expires_in: 300 }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;
    const before = Date.now();
    const res = await refreshWorkOSTokens("rt_old");
    expect(res?.accessToken).toBe("at_new");
    expect(res?.refreshToken).toBe("rt_new");
    expect(res!.expiresAt).toBeGreaterThanOrEqual(before + 300_000 - 1000);
  });

  it("posts to the WorkOS token endpoint with grant_type=refresh_token", async () => {
    const spy = vi.fn(async () =>
      new Response(JSON.stringify({ access_token: "a", refresh_token: "r", expires_in: 300 }), { status: 200 }),
    );
    global.fetch = spy as unknown as typeof fetch;
    await refreshWorkOSTokens("rt_old");
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toContain("api.workos.com");
    expect(String(init?.body)).toContain("grant_type=refresh_token");
    expect(String(init?.body)).toContain("rt_old");
  });

  it("returns null on a non-2xx", async () => {
    global.fetch = vi.fn(async () => new Response("{}", { status: 400 })) as unknown as typeof fetch;
    expect(await refreshWorkOSTokens("rt_old")).toBeNull();
  });

  it("returns null on a network error", async () => {
    global.fetch = vi.fn(async () => { throw new Error("network"); }) as unknown as typeof fetch;
    expect(await refreshWorkOSTokens("rt_old")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run lib/auth/workos-refresh.test.ts`
Expected: FAIL — cannot find module `@/lib/auth/workos-refresh`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/auth/workos-refresh.ts
// Server-side WorkOS token refresh. Spiritbulb is a server, so it cannot use
// mobile's client-side AuthSession.refreshAsync; it POSTs the refresh token to
// WorkOS's token endpoint directly. This hits api.workos.com, NOT MCloud, so the
// canonical-host/secret-header gotcha for the partner routes does not apply here.
import "server-only";

const TOKEN_URL = "https://api.workos.com/user_management/authenticate";

export async function refreshWorkOSTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
  const clientId = process.env.WORKOS_CLIENT_ID;
  if (!clientId) throw new Error("WORKOS_CLIENT_ID is not set");
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      redirect: "error",
    });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!d.access_token || !d.refresh_token) return null;
    return {
      accessToken: d.access_token,
      refreshToken: d.refresh_token,
      expiresAt: Date.now() + (d.expires_in ?? 0) * 1000,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run lib/auth/workos-refresh.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd c:/Users/busie/spiritbulb
git add lib/auth/workos-refresh.ts lib/auth/workos-refresh.test.ts
git commit -m "feat(auth): server-side WorkOS token refresh"
```

---

## Task 3: Session read/write helpers (`getSession`, cookie options)

**Files:**
- Modify: `lib/auth/session.ts`
- Modify: `lib/auth/session.test.ts`

**Interfaces:**
- Consumes: `SessionData`, `sealSession`, `openSession` (Task 1); `refreshWorkOSTokens` (Task 2).
- Produces (added to `lib/auth/session.ts`, keeping the existing `SESSION_COOKIE` and `hasSession` exports):
  - `sessionCookieOptions(): { httpOnly: true; secure: true; sameSite: "lax"; path: "/"; domain?: string; maxAge: number }` — includes `domain: ".spiritb.uk"` unless `SESSION_COOKIE_LOCAL === "1"`.
  - `getSession(sealed: string | undefined): Promise<{ data: SessionData; resealed?: string } | null>` — opens the cookie; if `expiresAt <= Date.now()`, refreshes and returns the new sealed string in `resealed` for the caller to write back; null if absent/invalid/refresh-failed.
  - `SESSION_MAX_AGE` constant = `60 * 60 * 24 * 7`.

Rationale for `resealed`: `lib/auth/session.ts` is imported by both middleware (`proxy.ts`, edge) and route handlers. Rather than mutate cookies inside the helper (context-dependent APIs), `getSession` returns the new blob and each caller writes it with the API available in its context.

- [ ] **Step 1: Write the failing test** (append to `lib/auth/session.test.ts`)

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SESSION_COOKIE, hasSession, getSession, sessionCookieOptions, SESSION_MAX_AGE } from "@/lib/auth/session";
import { sealSession, type SessionData } from "@/lib/auth/session-crypto";

const KEY = Buffer.alloc(32, 7).toString("base64");
const realFetch = global.fetch;

describe("getSession", () => {
  beforeEach(() => {
    process.env.SESSION_ENC_KEY = KEY;
    process.env.WORKOS_CLIENT_ID = "client_test";
    delete process.env.SESSION_COOKIE_LOCAL;
  });
  afterEach(() => { global.fetch = realFetch; vi.restoreAllMocks(); });

  it("returns null for a missing cookie", async () => {
    expect(await getSession(undefined)).toBeNull();
  });

  it("returns the data for a live session without refreshing", async () => {
    global.fetch = vi.fn(async () => { throw new Error("should not refresh"); }) as unknown as typeof fetch;
    const live: SessionData = { accessToken: "at", refreshToken: "rt", expiresAt: Date.now() + 60_000 };
    const res = await getSession(await sealSession(live));
    expect(res?.data.accessToken).toBe("at");
    expect(res?.resealed).toBeUndefined();
  });

  it("refreshes and reseals a lapsed session", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ access_token: "at2", refresh_token: "rt2", expires_in: 300 }), { status: 200 }),
    ) as unknown as typeof fetch;
    const stale: SessionData = { accessToken: "at", refreshToken: "rt", expiresAt: Date.now() - 1000 };
    const res = await getSession(await sealSession(stale));
    expect(res?.data.accessToken).toBe("at2");
    expect(typeof res?.resealed).toBe("string");
  });

  it("returns null when a lapsed session fails to refresh", async () => {
    global.fetch = vi.fn(async () => new Response("{}", { status: 400 })) as unknown as typeof fetch;
    const stale: SessionData = { accessToken: "at", refreshToken: "rt", expiresAt: Date.now() - 1000 };
    expect(await getSession(await sealSession(stale))).toBeNull();
  });

  it("scopes the cookie to .spiritb.uk in production shape", () => {
    const opts = sessionCookieOptions();
    expect(opts.domain).toBe(".spiritb.uk");
    expect(opts.maxAge).toBe(SESSION_MAX_AGE);
    expect(opts.httpOnly).toBe(true);
  });

  it("omits the domain for local dev", () => {
    process.env.SESSION_COOKIE_LOCAL = "1";
    expect(sessionCookieOptions().domain).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run lib/auth/session.test.ts`
Expected: FAIL — `getSession`/`sessionCookieOptions`/`SESSION_MAX_AGE` not exported.

- [ ] **Step 3: Write minimal implementation** (replace `lib/auth/session.ts`)

```ts
import { openSession, sealSession, type SessionData } from "@/lib/auth/session-crypto";
import { refreshWorkOSTokens } from "@/lib/auth/workos-refresh";

export const SESSION_COOKIE = "sb_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Retained: the nav's cheap presence check until layout switches to getSession.
export function hasSession(cookieValue: string | undefined): boolean {
  return typeof cookieValue === "string" && cookieValue.length > 0;
}

export function sessionCookieOptions() {
  // .spiritb.uk shares the cookie across nuru/reach/tufike/parent (subdomain SSO).
  // localhost cannot set a dotted-domain cookie, so omit it in local dev.
  const local = process.env.SESSION_COOKIE_LOCAL === "1";
  return {
    httpOnly: true as const,
    secure: true as const,
    sameSite: "lax" as const,
    path: "/",
    ...(local ? {} : { domain: ".spiritb.uk" }),
    maxAge: SESSION_MAX_AGE,
  };
}

/**
 * Open the sealed cookie and return the live session. If the access token has
 * lapsed, refresh against WorkOS and return the new sealed blob in `resealed`
 * for the caller to write back (this helper runs in both middleware and route
 * contexts, so it does not touch cookies itself). Null when there is no valid,
 * refreshable session.
 */
export async function getSession(
  sealed: string | undefined,
): Promise<{ data: SessionData; resealed?: string } | null> {
  if (!sealed) return null;
  const data = await openSession(sealed);
  if (!data) return null;
  if (data.expiresAt > Date.now()) return { data };

  const refreshed = await refreshWorkOSTokens(data.refreshToken);
  if (!refreshed) return null;
  const next: SessionData = refreshed;
  return { data: next, resealed: await sealSession(next) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run lib/auth/session.test.ts`
Expected: PASS. (The pre-existing `hasSession`/cookie-name tests still pass.)

- [ ] **Step 5: Commit**

```bash
cd c:/Users/busie/spiritbulb
git add lib/auth/session.ts lib/auth/session.test.ts
git commit -m "feat(auth): getSession with refresh + .spiritb.uk cookie options"
```

---

## Task 4: Seal the full token set at login

**Files:**
- Modify: `app/api/auth/verify-code/route.ts`
- Modify: `app/api/auth/verify-code/route.test.ts`

**Interfaces:**
- Consumes: `verifyCode` (existing, returns `{ ok, accessToken, refreshToken, expiresIn }`); `sealSession` (Task 1); `SESSION_COOKIE`, `sessionCookieOptions` (Task 3).

- [ ] **Step 1: Update the failing test** (replace the success case in `app/api/auth/verify-code/route.test.ts`)

```ts
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

vi.mock("@/lib/auth/mcloud-client", () => ({
  verifyCode: vi.fn(async () => ({ ok: true, accessToken: "at_abc", refreshToken: "rt_abc", expiresIn: 3600 })),
}));

import { POST } from "@/app/api/auth/verify-code/route";
import { verifyCode } from "@/lib/auth/mcloud-client";
import { openSession } from "@/lib/auth/session-crypto";

beforeEach(() => { process.env.SESSION_ENC_KEY = Buffer.alloc(32, 7).toString("base64"); });
afterEach(() => vi.restoreAllMocks());

function req(body: unknown) {
  return new Request("http://localhost/api/auth/verify-code", { method: "POST", body: JSON.stringify(body) });
}

describe("verify-code route", () => {
  it("sets an ENCRYPTED session cookie holding the full token set", async () => {
    const res = await POST(req({ email: "a@b.com", code: "000000" }) as never);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("sb_session=");
    expect(setCookie).not.toContain("at_abc"); // opaque, not the raw token
    expect(setCookie.toLowerCase()).toContain("httponly");
    // Extract the cookie value and confirm it decrypts to the full set.
    const value = decodeURIComponent(setCookie.split("sb_session=")[1].split(";")[0]);
    const data = await openSession(value);
    expect(data).toMatchObject({ accessToken: "at_abc", refreshToken: "rt_abc" });
    expect(data!.expiresAt).toBeGreaterThan(Date.now());
  });

  it("401s a bad code without setting a cookie", async () => {
    (verifyCode as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, error: "bad" });
    const res = await POST(req({ email: "a@b.com", code: "999999" }) as never);
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("400s missing code", async () => {
    const res = await POST(req({ email: "a@b.com" }) as never);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run app/api/auth/verify-code/route.test.ts`
Expected: FAIL — cookie still contains `at_abc` (raw token), `openSession` returns null.

- [ ] **Step 3: Write minimal implementation** (replace `app/api/auth/verify-code/route.ts`)

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCode } from "@/lib/auth/mcloud-client";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { sealSession } from "@/lib/auth/session-crypto";

export async function POST(req: NextRequest) {
  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const email = body.email?.trim() ?? "";
  const code = body.code?.trim() ?? "";
  if (!email || !code) {
    return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
  }
  const result = await verifyCode(email, code);
  if (!result.ok || !result.accessToken || !result.refreshToken) {
    return NextResponse.json({ error: result.error ?? "That code did not work." }, { status: 401 });
  }
  // Seal the FULL token set so getSession can refresh later. expiresIn is
  // seconds; store an absolute epoch-ms deadline.
  const sealed = await sealSession({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: Date.now() + (result.expiresIn ?? 0) * 1000,
  });
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, sealed, sessionCookieOptions());
  return res;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run app/api/auth/verify-code/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd c:/Users/busie/spiritbulb
git add app/api/auth/verify-code/route.ts app/api/auth/verify-code/route.test.ts
git commit -m "feat(auth): seal full WorkOS token set into the session cookie"
```

---

## Task 5: `/home` gate verifies the session

**Files:**
- Modify: `proxy.ts`
- Modify: `proxy.test.ts`

**Interfaces:**
- Consumes: `SESSION_COOKIE`, `getSession` (Task 3). Drops the `hasSession` import here.

Note: `proxy.ts` at the repo root IS the Next 16 middleware entry (Next 16 renamed `middleware.ts` to `proxy.ts`; the framework picks it up by filename, which is why nothing imports `proxy` except its test). Next's middleware runner awaits the handler, so making `proxy` `async` is safe with **no caller change** — there is no separate `middleware.ts` to update.

- [ ] **Step 1: Update the failing test** (adjust `proxy.test.ts`'s `/home` cases)

```ts
// In proxy.test.ts — the /home gate now needs a SEALED cookie, not any string.
import { describe, it, expect, beforeEach } from "vitest";
import { proxy } from "@/proxy";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { sealSession } from "@/lib/auth/session-crypto";

const KEY = Buffer.alloc(32, 7).toString("base64");
beforeEach(() => { process.env.SESSION_ENC_KEY = KEY; process.env.SESSION_COOKIE_LOCAL = "1"; });

function homeReq(cookie?: string) {
  const r = new Request("https://spiritb.uk/home");
  const nreq = new (require("next/server").NextRequest)(r);
  if (cookie) nreq.cookies.set(SESSION_COOKIE, cookie);
  return nreq;
}

describe("/home gate", () => {
  it("redirects to /login with no session", async () => {
    const res = await proxy(homeReq());
    expect(res.headers.get("location")).toContain("/login");
  });

  it("redirects to /login for an undecryptable cookie", async () => {
    const res = await proxy(homeReq("garbage"));
    expect(res.headers.get("location")).toContain("/login");
  });

  it("allows a live sealed session through", async () => {
    const sealed = await sealSession({ accessToken: "at", refreshToken: "rt", expiresAt: Date.now() + 60_000 });
    const res = await proxy(homeReq(sealed));
    expect(res.headers.get("location")).toBeNull(); // NextResponse.next(), no redirect
  });
});
```

(Keep the existing subdomain-rewrite tests; only the `/home` gate cases change. If the existing suite constructs requests differently, follow that existing pattern rather than the `require` shown here.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run proxy.test.ts`
Expected: FAIL — `proxy` is sync / gate still uses `hasSession`, so a sealed/garbage cookie is mishandled.

- [ ] **Step 3: Write minimal implementation** (modify the `/home` block in `proxy.ts`)

Change the import:
```ts
import { SESSION_COOKIE, getSession } from "@/lib/auth/session";
```
Make `proxy` async and replace the gate block:
```ts
export async function proxy(req: NextRequest) {
  // ...unchanged subdomain/rewrite logic above...

  // The hub is the only thing behind a session. Verify (decrypt + refresh),
  // do not merely check the cookie exists.
  if (pathname === "/home" || pathname.startsWith("/home/")) {
    const session = await getSession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
    // If the session was refreshed mid-request, write the new blob back.
    if (session.resealed) {
      const res = NextResponse.next();
      res.cookies.set(SESSION_COOKIE, session.resealed, sessionCookieOptions());
      return res;
    }
  }

  return NextResponse.next();
}
```
Add `sessionCookieOptions` to the import from `@/lib/auth/session`. Ensure the middleware entry awaits `proxy`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run proxy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/busie/spiritbulb
git add proxy.ts proxy.test.ts
git commit -m "feat(auth): /home gate verifies and refreshes the session"
```

---

## Task 6: Layout Header state uses the verified read

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `SESSION_COOKIE`, `getSession` (Task 3). Header prop `signedIn` is unchanged (shipped in `fix/header-auth-state`).

This supersedes the presence check the header fix put in the layout, so the nav reflects a *verified* session, consistent with the `/home` gate. (No test — `layout.tsx` is a thin server component; behavior is covered by Task 3's `getSession` tests and verified at runtime in Task 8.)

- [ ] **Step 1: Modify the layout**

Replace the `hasSession` import and usage:
```ts
import { SESSION_COOKIE, getSession } from "@/lib/auth/session";
```
```ts
  // Verified session (decrypt + refresh-if-lapsed), so the nav agrees with the
  // /home gate. We only need the boolean here; the /home route handles reseal.
  const signedIn = (await getSession((await cookies()).get(SESSION_COOKIE)?.value)) !== null;
```

- [ ] **Step 2: Typecheck**

Run: `cd c:/Users/busie/spiritbulb && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/busie/spiritbulb
git add app/layout.tsx
git commit -m "feat(auth): header state uses the verified session read"
```

---

## Task 7: Document env vars

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Append to `.env.example`**

```bash
# ── Session cookie (sb_session) ───────────────────────────────────────────────
# 32-byte AES-256-GCM key, base64-encoded. Encrypts the sb_session cookie, which
# holds the WorkOS access + refresh tokens. REQUIRED: sealing fails closed if
# unset (no plaintext-cookie fallback). Generate:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
SESSION_ENC_KEY=

# WorkOS client id, used by the server-side token refresh (api.workos.com). Must
# match the WORKOS_CLIENT_ID MCloud authenticates against (same WorkOS project).
WORKOS_CLIENT_ID=

# Local dev only: set to 1 so the session cookie omits Domit=.spiritb.uk (a dotted
# domain cannot be set on localhost). NEVER set in production.
# SESSION_COOKIE_LOCAL=1
```

Fix the typo before committing: `Domit` -> `domain`.

- [ ] **Step 2: Commit**

```bash
cd c:/Users/busie/spiritbulb
git add .env.example
git commit -m "docs(auth): document SESSION_ENC_KEY, WORKOS_CLIENT_ID, SESSION_COOKIE_LOCAL"
```

---

## Task 8: Full suite + runtime verification

**Files:** none (verification only).

- [ ] **Step 1: Run the whole test suite**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run`
Expected: all suites pass (the 4 new/changed auth suites plus the pre-existing intent/mcloud-client/request-code suites).

- [ ] **Step 2: Typecheck**

Run: `cd c:/Users/busie/spiritbulb && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Runtime drive (invoke the `verify` skill)**

Set `SESSION_ENC_KEY`, `WORKOS_CLIENT_ID`, and `SESSION_COOKIE_LOCAL=1` in `.env.local`, run `npm run dev`, then:
- Log in with a real magic code; confirm `sb_session` is set and is **opaque** (not a JWT) in devtools.
- Reload `/home`; confirm it renders (gate passes) and the Header shows Home + Sign out.
- Confirm no plaintext token is visible anywhere in the cookie.
- Kill the dev server when done (kill by port PID; `pkill -f "next dev"` is unreliable on Windows).

Expected: login works end to end; `/home` is reachable only with a valid sealed cookie.

---

## Self-Review Notes

- **Spec coverage:** §1 encrypted cookie (Tasks 1, 4), `.spiritb.uk` scope (Task 3), server-side refresh (Tasks 2, 3), `/home` gate verifies (Task 5), Header verified read (Task 6), env vars incl. `WORKOS_CLIENT_ID` (Task 7). The Header auth-state *display* and `/home` dock stub shipped separately (`fix/header-auth-state`; `/home` already exists), so they are not re-implemented here — Task 6 only upgrades the layout's read from presence to verified.
- **Out of scope (PR 2):** ticket table, mint/redeem routes, ProductPage handoff links. Not in this plan.
- **Type consistency:** `SessionData` (`expiresAt` epoch ms) is defined in Task 1 and consumed unchanged in Tasks 2, 3, 4, 5. `getSession` returns `{ data, resealed? }` in Task 3 and is consumed with that shape in Tasks 5 and 6. `sessionCookieOptions()` defined in Task 3, used in Tasks 4 and 5.
- **Known follow-up:** after this PR, the header fix's `hasSession` import in `lib/auth/session.ts` is only referenced by its own test; leave it (harmless, cheap) unless a later cleanup removes it.
