# Admin Panel Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Users, Stores, Orders, and Webhook Logs pages to the existing `/admin` area, with role-change and store plan/status mutations.

**Architecture:** Each page is a Next.js server component that fetches data and passes it to a client component for search/filter/mutation — matching the pattern in `apps/web/app/admin/subs/page.tsx` + `apps/web/components/subscriptions-client.tsx`. Mutations go through new admin API routes that reuse the auth pattern from `apps/web/app/api/admin/subscriptions/activate/route.ts`. Confirmation dialogs use `AlertDialog` from `@mcloud/ui/alert-dialog`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (`@mcloud/db/server` for API routes, `@mcloud/db/client` for server components), `@mcloud/ui/alert-dialog`, Tailwind CSS, Material Symbols icons.

## Global Constraints

- All admin API routes must check `session.user` exists AND `users.role === "admin"` before acting — copy the pattern from `apps/web/app/api/admin/subscriptions/activate/route.ts` exactly.
- Server components use `createClient` from `@mcloud/db/client`. API routes use `createClient` from `@mcloud/db/server` (awaited).
- No toast library is wired in the admin shell — show inline error text (`<p className="text-sm text-red-500">…</p>`) on mutation failure.
- Optimistic updates: on success, update local React state; on failure, revert and show error.
- Tailwind + Material Symbols icons (class `material-symbols-outlined`) — match style of existing admin pages.
- No pagination — all lists load server-side, client-side search only.
- Dialogs: use `AlertDialog` from `@mcloud/ui/alert-dialog` (already available — no install needed).

---

## File Map

**Created:**
- `apps/web/app/admin/users/page.tsx` — server component, fetches users
- `apps/web/components/admin/users-client.tsx` — client table + role-change dialog
- `apps/web/app/api/admin/users/[id]/role/route.ts` — PATCH role
- `apps/web/app/admin/stores/page.tsx` — server component, fetches stores + owners
- `apps/web/components/admin/stores-client.tsx` — client table + plan + status dialogs
- `apps/web/app/api/admin/stores/[id]/plan/route.ts` — PATCH is_pro
- `apps/web/app/api/admin/stores/[id]/status/route.ts` — PATCH is_active
- `apps/web/app/admin/orders/page.tsx` — server component, fetches orders
- `apps/web/components/admin/orders-client.tsx` — client table + search + status filter
- `apps/web/app/admin/webhooks/page.tsx` — server component, fetches webhook logs
- `apps/web/components/admin/webhooks-client.tsx` — client table + provider/status filter + row expand

**Modified:**
- `apps/web/components/admin/admin-nav.tsx` — remove `comingSoon`, add Orders nav item

---

### Task 1: Nav updates

**Files:**
- Modify: `apps/web/components/admin/admin-nav.tsx`

**Interfaces:**
- Produces: `ADMIN_SECTIONS` with live links for users, stores, orders, webhooks

- [ ] **Step 1: Update `ADMIN_SECTIONS` in `admin-nav.tsx`**

Replace the current `ADMIN_SECTIONS` definition (lines 39–76) with:

```typescript
export const ADMIN_SECTIONS: NavSection[] = [
    {
        id: 'overview',
        label: 'Overview',
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/admin' },
        ],
    },
    {
        id: 'platform',
        label: 'Platform',
        items: [
            { id: 'users', label: 'Users', icon: 'people', href: '/admin/users' },
            { id: 'stores', label: 'Stores', icon: 'storefront', href: '/admin/stores' },
        ],
    },
    {
        id: 'commerce',
        label: 'Commerce',
        items: [
            { id: 'subs', label: 'Subscriptions', icon: 'subscriptions', href: '/admin/subs' },
            { id: 'orders', label: 'Orders', icon: 'receipt_long', href: '/admin/orders' },
        ],
    },
    {
        id: 'content',
        label: 'Content',
        items: [
            { id: 'docs', label: 'Documentation', icon: 'article', href: '/admin/docs-editor' },
        ],
    },
    {
        id: 'system',
        label: 'System',
        items: [
            { id: 'webhooks', label: 'Webhook Logs', icon: 'webhook', href: '/admin/webhooks' },
        ],
    },
]
```

- [ ] **Step 2: Verify nav renders correctly**

Run the dev server (`npm run dev` from `apps/web` or `turbo dev --filter=web`) and navigate to `/admin`. Confirm the sidebar now shows Users, Stores, Orders, Webhooks as clickable links (no "soon" badges). Clicking each should 404 — that's expected until pages are built.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/admin/admin-nav.tsx
git commit -m "feat(admin): wire up nav items for users, stores, orders, webhooks"
```

---

### Task 2: Users API route

**Files:**
- Create: `apps/web/app/api/admin/users/[id]/role/route.ts`

**Interfaces:**
- Produces: `PATCH /api/admin/users/[id]/role` — body `{ role: "admin" | "user" }`, returns `{ ok: true }` or `{ error: string }`

- [ ] **Step 1: Create the route file**

Create `apps/web/app/api/admin/users/[id]/role/route.ts`:

```typescript
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { NextResponse, NextRequest } from 'next/server'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createClient()

    const { data: caller } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const { role } = await request.json() as { role: 'admin' | 'user' }

    if (role !== 'admin' && role !== 'user') {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Manual smoke test**

With the dev server running, open the browser console on any `/admin` page and run:

```javascript
fetch('/api/admin/users/nonexistent-id/role', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ role: 'user' })
}).then(r => r.json()).then(console.log)
```

Expected: `{ ok: true }` (or a Supabase "no rows" error, not a 401/403 since you're logged in as admin). If you get 401, your session isn't being read — check `getSession` import matches other admin routes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/admin/users/[id]/role/route.ts
git commit -m "feat(admin): PATCH /api/admin/users/[id]/role"
```

---

### Task 3: Users page

**Files:**
- Create: `apps/web/app/admin/users/page.tsx`
- Create: `apps/web/components/admin/users-client.tsx`

**Interfaces:**
- Consumes: `PATCH /api/admin/users/[id]/role` from Task 2
- Produces: `/admin/users` page rendering a searchable user table with role-change dialog

- [ ] **Step 1: Create the server page**

Create `apps/web/app/admin/users/page.tsx`:

```typescript
import type { Metadata } from "next"
import { createClient } from "@mcloud/db/client"
import UsersClient from "@/components/admin/users-client"

export const metadata: Metadata = {
    title: "Users — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

async function getUsers() {
    const supabase = createClient()
    const { data } = await supabase
        .from("users")
        .select("id, name, email, avatar_url, role, created_at")
        .order("created_at", { ascending: false })
    return data ?? []
}

export default async function UsersPage() {
    const users = await getUsers()
    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <UsersClient users={users} />
        </div>
    )
}
```

- [ ] **Step 2: Create the client component**

Create `apps/web/components/admin/users-client.tsx`:

```typescript
'use client'

import { useState } from 'react'
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@mcloud/ui/alert-dialog'

type User = {
    id: string
    name: string | null
    email: string | null
    avatar_url: string | null
    role: string
    created_at: string | null
}

function getInitials(name: string | null, email: string | null) {
    const src = name ?? email ?? '?'
    return src.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function relativeDate(iso: string | null) {
    if (!iso) return '—'
    const d = new Date(iso)
    const days = Math.floor((Date.now() - d.getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days}d ago`
    if (days < 365) return `${Math.floor(days / 30)}mo ago`
    return `${Math.floor(days / 365)}y ago`
}

export default function UsersClient({ users }: { users: User[] }) {
    const [rows, setRows] = useState(users)
    const [search, setSearch] = useState('')
    const [pending, setPending] = useState<User | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const filtered = rows.filter(u => {
        const q = search.toLowerCase()
        return (
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)
        )
    })

    async function confirmRoleChange() {
        if (!pending) return
        setLoading(true)
        setError(null)
        const newRole = pending.role === 'admin' ? 'user' : 'admin'
        const res = await fetch(`/api/admin/users/${pending.id}/role`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
        })
        if (res.ok) {
            setRows(prev => prev.map(u => u.id === pending.id ? { ...u, role: newRole } : u))
            setPending(null)
        } else {
            const body = await res.json()
            setError(body.error ?? 'Failed to update role')
        }
        setLoading(false)
    }

    return (
        <div className="max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Users</h1>
                <p className="text-sm text-muted-foreground mt-1">{rows.length} total</p>
            </div>

            <input
                type="search"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full max-w-sm h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />

            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">User</th>
                            <th className="text-left px-4 py-3 font-medium">Email</th>
                            <th className="text-left px-4 py-3 font-medium">Role</th>
                            <th className="text-left px-4 py-3 font-medium">Joined</th>
                            <th className="text-left px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map(u => (
                            <tr key={u.id} className="bg-background hover:bg-muted/40 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="store-avatar-fallback w-7 h-7 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                            {u.avatar_url
                                                ? <img src={u.avatar_url} alt={u.name ?? ''} className="w-full h-full object-cover" />
                                                : getInitials(u.name, u.email)
                                            }
                                        </div>
                                        <span className="font-medium text-foreground">{u.name ?? '—'}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{u.email ?? '—'}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        u.role === 'admin'
                                            ? 'bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]'
                                            : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground text-xs">{relativeDate(u.created_at)}</td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => { setError(null); setPending(u) }}
                                        className="text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted/60 text-foreground transition-colors"
                                    >
                                        Change role
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">
                                    No users found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AlertDialog open={!!pending} onOpenChange={open => { if (!open) setPending(null) }}>
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pending?.role === 'admin' ? 'Revoke admin access' : 'Grant admin access'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pending?.role === 'admin'
                                ? `Remove admin privileges from ${pending?.name ?? pending?.email}? They will become a regular user.`
                                : `Grant admin access to ${pending?.name ?? pending?.email}? They will have full platform access.`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={e => { e.preventDefault(); confirmRoleChange() }}
                            disabled={loading}
                            variant={pending?.role === 'admin' ? 'destructive' : 'default'}
                        >
                            {loading ? 'Saving…' : pending?.role === 'admin' ? 'Revoke admin' : 'Grant admin'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
```

- [ ] **Step 3: Verify the page renders**

Navigate to `/admin/users`. Confirm:
- User list appears with avatar, name, email, role badge, join date
- Search box filters rows as you type
- "Change role" button opens the confirmation dialog
- Confirming updates the role badge in the table without a page reload
- Cancelling closes the dialog with no change

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/users/page.tsx apps/web/components/admin/users-client.tsx
git commit -m "feat(admin): users page with role-change dialog"
```

---

### Task 4: Stores API routes

**Files:**
- Create: `apps/web/app/api/admin/stores/[id]/plan/route.ts`
- Create: `apps/web/app/api/admin/stores/[id]/status/route.ts`

**Interfaces:**
- Produces:
  - `PATCH /api/admin/stores/[id]/plan` — body `{ action: "grant" | "revoke" }`, returns `{ ok: true }` or `{ error: string }`
  - `PATCH /api/admin/stores/[id]/status` — body `{ is_active: boolean }`, returns `{ ok: true }` or `{ error: string }`

- [ ] **Step 1: Create the plan route**

Create `apps/web/app/api/admin/stores/[id]/plan/route.ts`:

```typescript
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { NextResponse, NextRequest } from 'next/server'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createClient()

    const { data: caller } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const { action } = await request.json() as { action: 'grant' | 'revoke' }

    if (action !== 'grant' && action !== 'revoke') {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (action === 'grant') {
        const { error: storeErr } = await supabase
            .from('stores')
            .update({ is_pro: true, pro_since: new Date().toISOString(), pro_expires_at: null })
            .eq('id', id)

        if (storeErr) return NextResponse.json({ error: storeErr.message }, { status: 500 })

        // Try to activate the latest subscription; if none exists, insert one
        const { data: existing } = await supabase
            .from('store_subscriptions')
            .select('id')
            .eq('store_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (existing) {
            await supabase
                .from('store_subscriptions')
                .update({ status: 'active' })
                .eq('id', existing.id)
        } else {
            // Fetch store currency for the insert
            const { data: store } = await supabase
                .from('stores')
                .select('currency')
                .eq('id', id)
                .single()

            await supabase.from('store_subscriptions').insert({
                store_id: id,
                provider: 'admin',
                status: 'active',
                amount: 0,
                currency: store?.currency ?? 'KES',
            })
        }
    } else {
        const { error: storeErr } = await supabase
            .from('stores')
            .update({ is_pro: false, pro_expires_at: new Date().toISOString() })
            .eq('id', id)

        if (storeErr) return NextResponse.json({ error: storeErr.message }, { status: 500 })

        await supabase
            .from('store_subscriptions')
            .update({ status: 'cancelled' })
            .eq('store_id', id)
            .eq('status', 'active')
    }

    return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Create the status route**

Create `apps/web/app/api/admin/stores/[id]/status/route.ts`:

```typescript
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { NextResponse, NextRequest } from 'next/server'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createClient()

    const { data: caller } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const { is_active } = await request.json() as { is_active: boolean }

    const { error } = await supabase
        .from('stores')
        .update({ is_active })
        .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Smoke test both routes in browser console**

On any `/admin` page:

```javascript
// Test status route (replace STORE_ID with a real store id from your DB)
fetch('/api/admin/stores/STORE_ID/status', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ is_active: true })
}).then(r => r.json()).then(console.log)
// Expected: { ok: true }
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/admin/stores/[id]/plan/route.ts apps/web/app/api/admin/stores/[id]/status/route.ts
git commit -m "feat(admin): PATCH stores plan and status API routes"
```

---

### Task 5: Stores page

**Files:**
- Create: `apps/web/app/admin/stores/page.tsx`
- Create: `apps/web/components/admin/stores-client.tsx`

**Interfaces:**
- Consumes: `PATCH /api/admin/stores/[id]/plan` and `PATCH /api/admin/stores/[id]/status` from Task 4
- Produces: `/admin/stores` page with searchable store table, plan management dialog, suspend/unsuspend dialog

- [ ] **Step 1: Create the server page**

Create `apps/web/app/admin/stores/page.tsx`:

```typescript
import type { Metadata } from "next"
import { createClient } from "@mcloud/db/client"
import StoresClient from "@/components/admin/stores-client"

export const metadata: Metadata = {
    title: "Stores — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

async function getStores() {
    const supabase = createClient()
    const { data } = await supabase
        .from("stores")
        .select(`
            id, name, slug, logo_url, is_pro, is_active,
            pro_since, pro_expires_at, owner_id, created_at,
            users!stores_owner_id_fkey ( name, email )
        `)
        .order("created_at", { ascending: false })

    return (data ?? []).map(row => ({
        ...row,
        owner: Array.isArray(row.users) ? row.users[0] ?? null : row.users,
    }))
}

export default async function StoresPage() {
    const stores = await getStores()
    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <StoresClient stores={stores} />
        </div>
    )
}
```

- [ ] **Step 2: Create the client component**

Create `apps/web/components/admin/stores-client.tsx`:

```typescript
'use client'

import { useState } from 'react'
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@mcloud/ui/alert-dialog'

type Store = {
    id: string
    name: string
    slug: string
    logo_url: string | null
    is_pro: boolean
    is_active: boolean | null
    pro_since: string | null
    pro_expires_at: string | null
    owner_id: string
    created_at: string | null
    owner: { name: string | null; email: string | null } | null
}

function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function StoresClient({ stores }: { stores: Store[] }) {
    const [rows, setRows] = useState(stores)
    const [search, setSearch] = useState('')
    const [planTarget, setPlanTarget] = useState<Store | null>(null)
    const [statusTarget, setStatusTarget] = useState<Store | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const filtered = rows.filter(s => {
        const q = search.toLowerCase()
        return (
            s.name.toLowerCase().includes(q) ||
            s.slug.toLowerCase().includes(q) ||
            s.owner?.email?.toLowerCase().includes(q) ||
            s.owner?.name?.toLowerCase().includes(q)
        )
    })

    async function handlePlan(action: 'grant' | 'revoke') {
        if (!planTarget) return
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/admin/stores/${planTarget.id}/plan`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
        })
        if (res.ok) {
            setRows(prev => prev.map(s =>
                s.id === planTarget.id
                    ? { ...s, is_pro: action === 'grant', pro_since: action === 'grant' ? new Date().toISOString() : s.pro_since, pro_expires_at: action === 'revoke' ? new Date().toISOString() : null }
                    : s
            ))
            setPlanTarget(null)
        } else {
            const body = await res.json()
            setError(body.error ?? 'Failed to update plan')
        }
        setLoading(false)
    }

    async function handleStatus() {
        if (!statusTarget) return
        setLoading(true)
        setError(null)
        const newActive = !statusTarget.is_active
        const res = await fetch(`/api/admin/stores/${statusTarget.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: newActive }),
        })
        if (res.ok) {
            setRows(prev => prev.map(s => s.id === statusTarget.id ? { ...s, is_active: newActive } : s))
            setStatusTarget(null)
        } else {
            const body = await res.json()
            setError(body.error ?? 'Failed to update status')
        }
        setLoading(false)
    }

    return (
        <div className="max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Stores</h1>
                <p className="text-sm text-muted-foreground mt-1">{rows.length} total</p>
            </div>

            <input
                type="search"
                placeholder="Search by name, slug, or owner…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full max-w-sm h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />

            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Store</th>
                            <th className="text-left px-4 py-3 font-medium">Owner</th>
                            <th className="text-left px-4 py-3 font-medium">Plan</th>
                            <th className="text-left px-4 py-3 font-medium">Status</th>
                            <th className="text-left px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map(s => (
                            <tr key={s.id} className="bg-background hover:bg-muted/40 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="store-avatar-fallback w-7 h-7 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                            {s.logo_url
                                                ? <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover" />
                                                : getInitials(s.name)
                                            }
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">{s.name}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{s.slug}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-foreground">{s.owner?.name ?? '—'}</p>
                                    <p className="text-xs text-muted-foreground">{s.owner?.email ?? '—'}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        s.is_pro
                                            ? 'bg-brand-container text-[rgb(var(--brand))]'
                                            : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {s.is_pro ? 'Pro' : 'Free'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        s.is_active !== false
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {s.is_active !== false ? 'Active' : 'Suspended'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => { setError(null); setPlanTarget(s) }}
                                            className="text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted/60 text-foreground transition-colors"
                                        >
                                            Manage plan
                                        </button>
                                        <button
                                            onClick={() => { setError(null); setStatusTarget(s) }}
                                            className="text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted/60 text-foreground transition-colors"
                                        >
                                            {s.is_active !== false ? 'Suspend' : 'Unsuspend'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">
                                    No stores found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Plan dialog */}
            <AlertDialog open={!!planTarget} onOpenChange={open => { if (!open) setPlanTarget(null) }}>
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Manage plan — {planTarget?.name}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Current plan: <strong>{planTarget?.is_pro ? 'Pro' : 'Free'}</strong>
                            {planTarget?.is_pro
                                ? '. Revoking Pro will cancel the active subscription and downgrade the store immediately.'
                                : '. Granting Pro will activate the store immediately with no charge recorded.'
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        {planTarget?.is_pro ? (
                            <AlertDialogAction
                                onClick={e => { e.preventDefault(); handlePlan('revoke') }}
                                disabled={loading}
                                variant="destructive"
                            >
                                {loading ? 'Revoking…' : 'Revoke Pro'}
                            </AlertDialogAction>
                        ) : (
                            <AlertDialogAction
                                onClick={e => { e.preventDefault(); handlePlan('grant') }}
                                disabled={loading}
                            >
                                {loading ? 'Granting…' : 'Grant Pro'}
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Status dialog */}
            <AlertDialog open={!!statusTarget} onOpenChange={open => { if (!open) setStatusTarget(null) }}>
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {statusTarget?.is_active !== false ? 'Suspend' : 'Unsuspend'} {statusTarget?.name}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {statusTarget?.is_active !== false
                                ? `Suspending ${statusTarget?.name} will make the store inaccessible to customers.`
                                : `Unsuspending ${statusTarget?.name} will restore access for the store and its customers.`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={e => { e.preventDefault(); handleStatus() }}
                            disabled={loading}
                            variant={statusTarget?.is_active !== false ? 'destructive' : 'default'}
                        >
                            {loading
                                ? 'Saving…'
                                : statusTarget?.is_active !== false ? 'Suspend store' : 'Unsuspend store'
                            }
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
```

- [ ] **Step 3: Verify the page**

Navigate to `/admin/stores`. Confirm:
- Store list with logo, name, slug, owner name + email, Pro badge, Active/Suspended badge
- Search filters by name, slug, and owner
- "Manage plan" dialog shows current plan and the correct action button (Grant vs Revoke)
- Confirming grant/revoke updates the Pro badge in the table
- "Suspend/Unsuspend" dialog shows correct wording
- Confirming updates the status badge in the table

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/stores/page.tsx apps/web/components/admin/stores-client.tsx
git commit -m "feat(admin): stores page with plan and status management"
```

---

### Task 6: Orders page

**Files:**
- Create: `apps/web/app/admin/orders/page.tsx`
- Create: `apps/web/components/admin/orders-client.tsx`

**Interfaces:**
- Produces: `/admin/orders` read-only cross-store order list with search and status filter

- [ ] **Step 1: Create the server page**

Create `apps/web/app/admin/orders/page.tsx`:

```typescript
import type { Metadata } from "next"
import { createClient } from "@mcloud/db/client"
import OrdersClient from "@/components/admin/orders-client"

export const metadata: Metadata = {
    title: "Orders — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

async function getOrders() {
    const supabase = createClient()
    const { data } = await supabase
        .from("orders")
        .select(`
            id, order_number, customer_email, total, currency,
            status, fulfillment_status, created_at,
            stores ( name, slug )
        `)
        .order("created_at", { ascending: false })

    return (data ?? []).map(row => ({
        ...row,
        store: Array.isArray(row.stores) ? row.stores[0] ?? null : row.stores,
    }))
}

export default async function OrdersPage() {
    const orders = await getOrders()
    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <OrdersClient orders={orders} />
        </div>
    )
}
```

- [ ] **Step 2: Create the client component**

Create `apps/web/components/admin/orders-client.tsx`:

```typescript
'use client'

import { useState } from 'react'

type Order = {
    id: string
    order_number: string
    customer_email: string | null
    total: number
    currency: string
    status: string
    fulfillment_status: string | null
    created_at: string | null
    store: { name: string; slug: string } | null
}

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    cancelled: 'bg-muted text-muted-foreground',
    refunded: 'bg-red-100 text-red-800',
}

const FULFILLMENT_COLORS: Record<string, string> = {
    unfulfilled: 'bg-yellow-100 text-yellow-800',
    fulfilled: 'bg-green-100 text-green-800',
    partial: 'bg-blue-100 text-blue-800',
}

function relativeDate(iso: string | null) {
    if (!iso) return '—'
    const d = new Date(iso)
    const days = Math.floor((Date.now() - d.getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days}d ago`
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function OrdersClient({ orders }: { orders: Order[] }) {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    const statuses = Array.from(new Set(orders.map(o => o.status)))

    const filtered = orders.filter(o => {
        const q = search.toLowerCase()
        const matchesSearch =
            o.order_number.toLowerCase().includes(q) ||
            o.customer_email?.toLowerCase().includes(q) ||
            o.store?.name.toLowerCase().includes(q)
        const matchesStatus = !statusFilter || o.status === statusFilter
        return matchesSearch && matchesStatus
    })

    return (
        <div className="max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
                <p className="text-sm text-muted-foreground mt-1">{orders.length} total</p>
            </div>

            <div className="flex items-center gap-3">
                <input
                    type="search"
                    placeholder="Search by order #, customer, or store…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full max-w-sm h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    <option value="">All statuses</option>
                    {statuses.map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Order #</th>
                            <th className="text-left px-4 py-3 font-medium">Store</th>
                            <th className="text-left px-4 py-3 font-medium">Customer</th>
                            <th className="text-left px-4 py-3 font-medium">Total</th>
                            <th className="text-left px-4 py-3 font-medium">Status</th>
                            <th className="text-left px-4 py-3 font-medium">Fulfillment</th>
                            <th className="text-left px-4 py-3 font-medium">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map(o => (
                            <tr key={o.id} className="bg-background hover:bg-muted/40 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                                <td className="px-4 py-3">
                                    {o.store ? (
                                        <a
                                            href={`/store/${o.store.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-foreground hover:text-primary hover:underline"
                                        >
                                            {o.store.name}
                                        </a>
                                    ) : '—'}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{o.customer_email ?? '—'}</td>
                                <td className="px-4 py-3 font-mono text-xs">
                                    {o.currency} {o.total.toLocaleString()}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? 'bg-muted text-muted-foreground'}`}>
                                        {o.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {o.fulfillment_status ? (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${FULFILLMENT_COLORS[o.fulfillment_status] ?? 'bg-muted text-muted-foreground'}`}>
                                            {o.fulfillment_status}
                                        </span>
                                    ) : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground text-xs">{relativeDate(o.created_at)}</td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                                    No orders found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
```

- [ ] **Step 3: Verify the page**

Navigate to `/admin/orders`. Confirm:
- Orders list with order number, store name (clickable), customer email, total, status badge, fulfillment badge, date
- Search filters as you type
- Status dropdown filters correctly
- No action buttons (read-only)

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/orders/page.tsx apps/web/components/admin/orders-client.tsx
git commit -m "feat(admin): orders page (read-only cross-store view)"
```

---

### Task 7: Webhook Logs page

**Files:**
- Create: `apps/web/app/admin/webhooks/page.tsx`
- Create: `apps/web/components/admin/webhooks-client.tsx`

**Interfaces:**
- Produces: `/admin/webhooks` read-only log viewer with provider/status filter and expandable payload rows

- [ ] **Step 1: Create the server page**

Create `apps/web/app/admin/webhooks/page.tsx`:

```typescript
import type { Metadata } from "next"
import { createClient } from "@mcloud/db/client"
import WebhooksClient from "@/components/admin/webhooks-client"

export const metadata: Metadata = {
    title: "Webhook Logs — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

async function getWebhookLogs() {
    const supabase = createClient()
    const { data } = await supabase
        .from("webhook_logs")
        .select(`
            id, provider, event_type, status, error_message,
            payload, created_at,
            stores ( name )
        `)
        .order("created_at", { ascending: false })
        .limit(500)

    return (data ?? []).map(row => ({
        ...row,
        store: Array.isArray(row.stores) ? row.stores[0] ?? null : row.stores,
    }))
}

export default async function WebhooksPage() {
    const logs = await getWebhookLogs()
    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <WebhooksClient logs={logs} />
        </div>
    )
}
```

- [ ] **Step 2: Create the client component**

Create `apps/web/components/admin/webhooks-client.tsx`:

```typescript
'use client'

import { useState } from 'react'

type WebhookLog = {
    id: string
    provider: string
    event_type: string
    status: string
    error_message: string | null
    payload: unknown
    created_at: string | null
    store: { name: string } | null
}

function relativeDate(iso: string | null) {
    if (!iso) return '—'
    const d = new Date(iso)
    const mins = Math.floor((Date.now() - d.getTime()) / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function WebhooksClient({ logs }: { logs: WebhookLog[] }) {
    const [providerFilter, setProviderFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [expanded, setExpanded] = useState<string | null>(null)

    const providers = Array.from(new Set(logs.map(l => l.provider)))
    const statuses = Array.from(new Set(logs.map(l => l.status)))

    const filtered = logs.filter(l => {
        const matchesProvider = !providerFilter || l.provider === providerFilter
        const matchesStatus = !statusFilter || l.status === statusFilter
        return matchesProvider && matchesStatus
    })

    return (
        <div className="max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Webhook Logs</h1>
                <p className="text-sm text-muted-foreground mt-1">{logs.length} most recent</p>
            </div>

            <div className="flex items-center gap-3">
                <select
                    value={providerFilter}
                    onChange={e => setProviderFilter(e.target.value)}
                    className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    <option value="">All providers</option>
                    {providers.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    <option value="">All statuses</option>
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            <th className="w-6 px-4 py-3" />
                            <th className="text-left px-4 py-3 font-medium">Provider</th>
                            <th className="text-left px-4 py-3 font-medium">Event</th>
                            <th className="text-left px-4 py-3 font-medium">Status</th>
                            <th className="text-left px-4 py-3 font-medium">Store</th>
                            <th className="text-left px-4 py-3 font-medium">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map(log => (
                            <>
                                <tr
                                    key={log.id}
                                    className="bg-background hover:bg-muted/40 transition-colors cursor-pointer"
                                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                                >
                                    <td className="px-4 py-3">
                                        <span className="material-symbols-outlined text-[14px] text-muted-foreground select-none">
                                            {expanded === log.id ? 'expand_less' : 'expand_more'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs">{log.provider}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.event_type}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            log.status === 'success'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]'
                                        }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{log.store?.name ?? '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground text-xs">{relativeDate(log.created_at)}</td>
                                </tr>
                                {expanded === log.id && (
                                    <tr key={`${log.id}-expanded`} className="bg-muted/30">
                                        <td colSpan={6} className="px-6 py-4">
                                            {log.error_message && (
                                                <p className="text-sm text-red-600 mb-3 font-medium">
                                                    Error: {log.error_message}
                                                </p>
                                            )}
                                            <pre className="text-xs font-mono bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                                                {JSON.stringify(log.payload, null, 2)}
                                            </pre>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                                    No webhook logs found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
```

- [ ] **Step 3: Verify the page**

Navigate to `/admin/webhooks`. Confirm:
- Log list with provider, event type, status badge, store name, date
- Provider and status dropdowns filter correctly
- Clicking a row expands to show payload JSON (pretty-printed) and error message if present
- Clicking again collapses

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/webhooks/page.tsx apps/web/components/admin/webhooks-client.tsx
git commit -m "feat(admin): webhook logs page with payload expand"
```

---

### Task 8: Dashboard quick links update

**Files:**
- Modify: `apps/web/app/admin/page.tsx`

**Interfaces:**
- Consumes: nothing new — just adds nav links to the dashboard
- Produces: dashboard quick links section showing all four new pages

- [ ] **Step 1: Add quick links for new pages**

In `apps/web/app/admin/page.tsx`, add four new `QuickLink` entries to the grid. Replace the existing `<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">` block (lines 56–70) with:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <QuickLink
        href="/admin/users"
        icon="people"
        label="Users"
        description="View and manage platform users and roles"
    />
    <QuickLink
        href="/admin/stores"
        icon="storefront"
        label="Stores"
        description="Manage stores, Pro plans, and active status"
    />
    <QuickLink
        href="/admin/subs"
        icon="subscriptions"
        label="Subscriptions"
        description="View and activate pending Pro subscriptions"
        badge={stats.pendingSubs > 0 ? stats.pendingSubs : undefined}
    />
    <QuickLink
        href="/admin/orders"
        icon="receipt_long"
        label="Orders"
        description="Cross-store order history and status"
    />
    <QuickLink
        href="/admin/docs-editor"
        icon="article"
        label="Documentation"
        description="Edit and manage platform documentation pages"
    />
    <QuickLink
        href="/admin/webhooks"
        icon="webhook"
        label="Webhook Logs"
        description="View recent webhook events and errors"
    />
</div>
```

- [ ] **Step 2: Verify dashboard**

Navigate to `/admin`. Confirm all six quick links appear in a 2-column grid and clicking each navigates to the correct page.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/page.tsx
git commit -m "feat(admin): add quick links for users, stores, orders, webhooks"
```
