# Storefront Verticals — NGO (Deliverable A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the storefront app render an NGO site (mission / programs / impact / campaigns) and accept real donations reusing the existing payment providers, driven by `stores.type`, without breaking any existing shop.

**Architecture:** A single `Vertical` descriptor (keyed by `stores.type`) in `@mcloud/themes` decides item kinds, theme family, checkout meaning, and UI labels. NGO content is typed items (`item_type` = `program` | `campaign`) in the existing `products` table — no new content tables. A new `ngo-classic` theme owns only the page body; nav/footer are reused from the app-level `LayoutWrapper`, which becomes vertical-aware (no cart island for NGO). Donations flow through a **new dedicated `/donate` endpoint** (the existing `/checkout` recomputes prices from the DB and must keep doing so — it must NOT be taught to trust a client-supplied amount).

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript, Supabase (`@mcloud/db`), Tailwind, the `@mcloud/themes` workspace package, `@mcloud/ui`. Monorepo built with Turborepo (`turbo`). No unit-test framework exists in the repo.

## Global Constraints

- **Do not break existing shops.** All 19 current stores are `type='shop'`; the shop code path must be byte-for-byte behaviorally unchanged. `getVertical` defaults any unknown/legacy `type` to `shop`, and the shop query keeps fetching all active products (it does NOT start filtering by `item_type`). — verbatim from spec §3.2 approach (a) and §7.
- **No schema change to `stores`, `products`, or `services`.** `stores.type`, `products.item_type`, and `products.metadata` already exist and are what we use. — spec §7.
- **Donations reuse existing payment rails; no new orders table.** The donation is recorded as a normal `orders` row tagged `metadata.kind = 'donation'`. — spec §3.5, §7.
- **Price authority is sacred.** The existing `/checkout` endpoint recomputes every line price from the DB and ignores client prices by design. Donations use a SEPARATE endpoint; never make `/checkout` accept a client amount. — derived from `apps/storefront/app/api/store/[slug]/checkout/route.ts` header comment.
- **NGO theme reuses shared primitives** (nav, footer, currency, payment UI) — it only owns page layout + NGO sections; it is NOT a fork of `classic`. — spec §3.3 + user confirmation.
- **Out of scope:** merchant admin (vertical picker, relabeled editors), portfolio vertical, recurring/anonymous donations, multiple theme variants per family. — spec §9.
- **Currency:** stores use `store.currency` (KES today). Reuse the existing `Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 })` formatting pattern from `classic/StoreFront.tsx`.
- **Test tooling:** the repo has no vitest/jest. Pure-logic units are tested with a standalone script run via `npx tsx`. UI/integration is verified via `turbo run build --filter` + a documented manual smoke. Do not add a test framework.

---

## File Structure

**Create:**
- `packages/themes/src/verticals.ts` — the `Vertical` descriptor, `VERTICALS` map, `getVertical()`. Single source of truth.
- (also modified) `packages/themes/package.json` — add an explicit `"./verticals"` export so the `.ts` (non-JSX) file is importable; the wildcard `"./*": "./src/*.tsx"` would otherwise resolve `verticals` to a `.tsx` file that doesn't exist.
- `packages/themes/src/verticals.test.ts` — standalone assertions run via `npx tsx` (no framework).
- `packages/themes/src/ngo-classic/StoreFront.tsx` — NGO page body (mission hero, programs grid, impact stats, campaigns/donate section, contact).
- `packages/themes/src/ngo-classic/DonateForm.tsx` — client component: amount presets + custom amount + guest details → POST `/donate`.
- `apps/storefront/app/api/store/[slug]/donate/route.ts` — dedicated donation endpoint.

**Modify:**
- `packages/themes/src/types.ts` — add NGO prop types (`NgoProgram`, `NgoCampaign`, `NgoStoreFrontProps`); leave shop types untouched.
- `packages/themes/src/resolver.ts` — resolve theme family via `getVertical`; register `ngo-classic`.
- `packages/themes/src/index.ts` — add `ngo-classic` to `THEMES` meta + `ThemeId`.
- `apps/storefront/components/store/Storefront.tsx` — register `ngo-classic` in the dynamic-import map, select by vertical.
- `apps/storefront/app/store/[slug]/page.tsx` — branch data loading by vertical.
- `apps/storefront/lib/db-cast.ts` — add `castNgoPrograms` / `castNgoCampaigns`.
- `apps/storefront/components/store/layout-wrapper.tsx` — make vertical-aware (hide `CartIsland`/`WishlistIsland` for NGO).
- `apps/storefront/app/store/[slug]/layout.tsx` — pass the store's vertical into `LayoutWrapper`.

---

### Task 1: Vertical descriptor (the seam)

**Files:**
- Create: `packages/themes/src/verticals.ts`
- Test: `packages/themes/src/verticals.test.ts`
- Modify: `packages/themes/package.json` (add `./verticals` export)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type VerticalId = 'shop' | 'ngo'`
  - `interface Vertical { id: VerticalId; itemKinds: string[]; themeFamily: string; checkout: 'purchase' | 'donation'; labels: { itemNoun: string; itemNounPlural: string; ctaPrimary: string; checkoutVerb: string } }`
  - `const VERTICALS: Record<VerticalId, Vertical>`
  - `function getVertical(storeType: string | null | undefined): Vertical` — defaults unknown to `VERTICALS.shop`.

- [ ] **Step 1: Write the standalone test**

Create `packages/themes/src/verticals.test.ts`:

```ts
import assert from 'node:assert/strict'
import { getVertical, VERTICALS } from './verticals'

// shop is the default for unknown / legacy / null types
assert.equal(getVertical('shop').id, 'shop')
assert.equal(getVertical(null).id, 'shop')
assert.equal(getVertical(undefined).id, 'shop')
assert.equal(getVertical('totally-unknown').id, 'shop')

// ngo resolves and carries its config
const ngo = getVertical('ngo')
assert.equal(ngo.id, 'ngo')
assert.equal(ngo.themeFamily, 'ngo-classic')
assert.equal(ngo.checkout, 'donation')
assert.deepEqual(ngo.itemKinds, ['program', 'campaign'])
assert.equal(ngo.labels.ctaPrimary, 'Donate')

// shop config
assert.equal(VERTICALS.shop.themeFamily, 'classic')
assert.equal(VERTICALS.shop.checkout, 'purchase')

console.log('verticals.test.ts: all assertions passed')
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/themes && npx tsx src/verticals.test.ts`
Expected: FAIL — `Cannot find module './verticals'`.

- [ ] **Step 3: Implement the descriptor**

Create `packages/themes/src/verticals.ts`:

```ts
// The single source of truth mapping a store's `type` to how the storefront
// treats it: which item kinds it surfaces, which theme family renders it, what
// checkout means, and the UI copy. Adding a vertical (e.g. 'portfolio') is a
// new entry here plus its theme — nothing else in the app hardcodes a vertical.

export type VerticalId = 'shop' | 'ngo'

export interface Vertical {
    id: VerticalId
    /** Values of products.item_type this vertical surfaces on its storefront. */
    itemKinds: string[]
    /** Theme family prefix the resolver uses to pick components. */
    themeFamily: string
    /** What placing an order means for this vertical. */
    checkout: 'purchase' | 'donation'
    /** UI copy so themes/components don't hardcode "Add to cart" etc. */
    labels: {
        itemNoun: string
        itemNounPlural: string
        ctaPrimary: string
        checkoutVerb: string
    }
}

export const VERTICALS: Record<VerticalId, Vertical> = {
    shop: {
        id: 'shop',
        itemKinds: ['product'],
        themeFamily: 'classic',
        checkout: 'purchase',
        labels: {
            itemNoun: 'product',
            itemNounPlural: 'products',
            ctaPrimary: 'Add to cart',
            checkoutVerb: 'Checkout',
        },
    },
    ngo: {
        id: 'ngo',
        itemKinds: ['program', 'campaign'],
        themeFamily: 'ngo-classic',
        checkout: 'donation',
        labels: {
            itemNoun: 'program',
            itemNounPlural: 'programs',
            ctaPrimary: 'Donate',
            checkoutVerb: 'Give',
        },
    },
}

function isVerticalId(v: string): v is VerticalId {
    return v === 'shop' || v === 'ngo'
}

/**
 * Resolve a store's vertical from its `type` column. Unknown, legacy, or null
 * types fall back to 'shop' so existing stores and any type set before its
 * theme ships keep working.
 */
export function getVertical(storeType: string | null | undefined): Vertical {
    if (storeType && isVerticalId(storeType)) return VERTICALS[storeType]
    return VERTICALS.shop
}
```

- [ ] **Step 4: Add the `./verticals` export**

The package's export map is `{ ".", "./types", "./resolver", "./*": "./src/*.tsx" }`. The wildcard maps deep imports to `.tsx`, but `verticals.ts` has no JSX. Add an explicit entry so `@mcloud/themes/verticals` resolves. In `packages/themes/package.json`, add the line after `"./resolver"`:

```json
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types.ts",
    "./resolver": "./src/resolver.ts",
    "./verticals": "./src/verticals.ts",
    "./*": "./src/*.tsx"
  },
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/themes && npx tsx src/verticals.test.ts`
Expected: `verticals.test.ts: all assertions passed`

- [ ] **Step 6: Commit**

```bash
git add packages/themes/src/verticals.ts packages/themes/src/verticals.test.ts packages/themes/package.json
git commit -m "feat(themes): add Vertical descriptor keyed by stores.type"
```

---

### Task 2: NGO prop types

**Files:**
- Modify: `packages/themes/src/types.ts` (append; do not touch existing exports)

**Interfaces:**
- Consumes: existing `Store` interface from `types.ts`.
- Produces:
  - `interface NgoProgram { id: string; name: string; slug: string; description: string | null; images: string[] }`
  - `interface NgoCampaign { id: string; name: string; slug: string; description: string | null; images: string[]; goalAmount: number | null; donationPresets: number[]; allowCustomAmount: boolean }`
  - `interface NgoStoreFrontProps { store: Store; programs: NgoProgram[]; campaigns: NgoCampaign[] }`

- [ ] **Step 1: Add the types**

Append to `packages/themes/src/types.ts`:

```ts
// ─────────────────────────────────────────────────────────────────────────────
// NGO vertical types (Deliverable A). Content is typed items in the products
// table: item_type='program' (informational) and item_type='campaign' (accepts
// donations, with a donation pricing mode read from products.metadata).
// ─────────────────────────────────────────────────────────────────────────────

export interface NgoProgram {
    id: string
    name: string
    slug: string
    description: string | null
    images: string[]
}

export interface NgoCampaign {
    id: string
    name: string
    slug: string
    description: string | null
    images: string[]
    /** Fundraising target for a progress bar; null if none set. */
    goalAmount: number | null
    /** Suggested donation amounts (store currency). May be empty. */
    donationPresets: number[]
    /** Whether a donor may enter their own amount. */
    allowCustomAmount: boolean
}

export interface NgoStoreFrontProps {
    store: Store
    programs: NgoProgram[]
    campaigns: NgoCampaign[]
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd packages/themes && npx tsc --noEmit`
Expected: no errors (exit 0).

- [ ] **Step 3: Commit**

```bash
git add packages/themes/src/types.ts
git commit -m "feat(themes): add NGO prop types (program, campaign, storefront)"
```

---

### Task 3: NGO theme — StoreFront body

**Files:**
- Create: `packages/themes/src/ngo-classic/StoreFront.tsx`

**Interfaces:**
- Consumes: `NgoStoreFrontProps`, `NgoProgram`, `NgoCampaign` from `../types`; `getVertical` from `../verticals`; `DonateForm` from `./DonateForm` (Task 4).
- Produces: `default` export `ComponentType<NgoStoreFrontProps>`.

> Note: This task depends on `DonateForm` (Task 4). Build Task 4 first if executing strictly in order, OR stub `DonateForm` here and wire it in Task 4. This plan orders DonateForm as Task 4 because StoreFront is the consumer that defines the props DonateForm must satisfy; when implementing, create the `DonateForm` file first with the signature from Task 4's Interfaces block, then this file compiles.

- [ ] **Step 1: Implement the NGO StoreFront**

Create `packages/themes/src/ngo-classic/StoreFront.tsx`. It reuses the same `sf-*` CSS variables and `@mcloud/ui` primitives as `classic` (so the merchant's theme colors apply), but lays out NGO sections and renders no cart/product grid.

```tsx
'use client'

import { useState } from 'react'
import { HeartHandshake, Target, Users } from 'lucide-react'
import { Button } from '@mcloud/ui/button'
import { motion } from 'framer-motion'
import type { NgoStoreFrontProps, NgoCampaign } from '../types'
import DonateForm from './DonateForm'

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
    return (
        <div className="mb-8 md:mb-12">
            <div className="border-b pb-4" style={{ borderColor: 'var(--sf-foreground)' }}>
                <span className="text-[11px] uppercase tracking-[0.2em] sf-text-accent font-medium">{eyebrow}</span>
                <h2 className="sf-heading text-3xl md:text-4xl font-light tracking-tight mt-1">{title}</h2>
            </div>
        </div>
    )
}

export default function NgoStoreFront({ store, programs, campaigns }: NgoStoreFrontProps) {
    const settings = store.settings ?? {}
    const missionTitle = (settings.heroTitle as string) ?? store.name
    const missionSubtitle = (settings.heroSubtitle as string) ?? store.description ?? ''
    const heroImage = settings.heroImage as string | undefined

    // Impact stats live in settings.impactStats: [{ label, value }]. Optional.
    const impactStats = (settings.impactStats as { label: string; value: string }[] | undefined) ?? []

    const [activeCampaign, setActiveCampaign] = useState<NgoCampaign | null>(null)

    return (
        <div className="min-h-screen">
            {/* ── MISSION HERO ── */}
            <section className="relative w-full overflow-hidden">
                <div className="grid md:grid-cols-2">
                    <div className="order-2 md:order-1 flex items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 32 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full px-6 sm:px-10 md:px-14 py-12 md:py-24 max-w-xl mx-auto md:mx-0 space-y-5"
                        >
                            <div className="flex items-center gap-3">
                                <span className="h-0.5 w-9 sf-bg-accent" />
                                <span className="text-[11px] uppercase tracking-[0.2em] sf-text-accent font-medium">Our Mission</span>
                            </div>
                            <h1 className="sf-heading text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.04]">{missionTitle}</h1>
                            {missionSubtitle && (
                                <p className="text-base md:text-lg font-light max-w-md" style={{ color: 'var(--sf-foreground-subtle)' }}>{missionSubtitle}</p>
                            )}
                            {campaigns.length > 0 && (
                                <Button
                                    size="lg"
                                    className="sf-btn-primary mt-1 rounded-none"
                                    onClick={() => document.getElementById('donate')?.scrollIntoView({ behavior: 'smooth' })}
                                >
                                    <HeartHandshake className="mr-2 w-4 h-4" /> Donate
                                </Button>
                            )}
                        </motion.div>
                    </div>
                    <div className="order-1 md:order-2 relative h-[42vh] sm:h-[56vh] md:h-auto md:min-h-[70vh]">
                        {heroImage ? (
                            <img src={heroImage} alt={missionTitle} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                            <div className="sf-hero-fallback absolute inset-0" />
                        )}
                    </div>
                </div>
            </section>

            {/* ── IMPACT STATS ── */}
            {impactStats.length > 0 && (
                <section className="sf-section-muted py-12 md:py-16">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        {impactStats.map((s, i) => (
                            <div key={i} className="space-y-1">
                                <div className="sf-heading text-3xl md:text-4xl font-light sf-text-accent">{s.value}</div>
                                <div className="text-xs uppercase tracking-[0.15em]" style={{ color: 'var(--sf-foreground-subtle)' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── PROGRAMS ── */}
            {programs.length > 0 && (
                <section className="py-12 md:py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <SectionHeader eyebrow="What We Do" title="Our Programs" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            {programs.map((p) => (
                                <div key={p.id} className="sf-card overflow-hidden">
                                    <div className="relative aspect-[4/3] overflow-hidden sf-bg-muted">
                                        {p.images[0] ? (
                                            <img src={p.images[0]} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Users className="w-8 h-8" style={{ color: 'var(--sf-foreground)', opacity: 0.25 }} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 space-y-1">
                                        <h3 className="sf-heading text-lg font-normal">{p.name}</h3>
                                        {p.description && (
                                            <p className="text-sm line-clamp-3" style={{ color: 'var(--sf-foreground-subtle)' }}>{p.description}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── CAMPAIGNS / DONATE ── */}
            {campaigns.length > 0 && (
                <section id="donate" className="sf-section-muted py-12 md:py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <SectionHeader eyebrow="Support Us" title="Campaigns" />
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                            {campaigns.map((c) => (
                                <div key={c.id} className="sf-card overflow-hidden flex flex-col">
                                    <div className="relative aspect-[16/9] overflow-hidden sf-bg-muted">
                                        {c.images[0] ? (
                                            <img src={c.images[0]} alt={c.name} className="absolute inset-0 w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Target className="w-8 h-8" style={{ color: 'var(--sf-foreground)', opacity: 0.25 }} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 space-y-2 flex-1 flex flex-col">
                                        <h3 className="sf-heading text-lg font-normal">{c.name}</h3>
                                        {c.description && (
                                            <p className="text-sm line-clamp-3 flex-1" style={{ color: 'var(--sf-foreground-subtle)' }}>{c.description}</p>
                                        )}
                                        <Button className="sf-btn-primary rounded-none mt-2" onClick={() => setActiveCampaign(c)}>
                                            <HeartHandshake className="mr-2 w-4 h-4" /> Donate
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── DONATE MODAL ── */}
            {activeCampaign && (
                <DonateForm
                    storeSlug={store.slug}
                    currency={store.currency}
                    campaign={activeCampaign}
                    onClose={() => setActiveCampaign(null)}
                />
            )}
        </div>
    )
}
```

- [ ] **Step 2: Verify it compiles** (after Task 4's `DonateForm` exists)

Run: `cd packages/themes && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/themes/src/ngo-classic/StoreFront.tsx
git commit -m "feat(themes): add ngo-classic StoreFront body (mission, programs, campaigns)"
```

---

### Task 4: NGO theme — DonateForm

**Files:**
- Create: `packages/themes/src/ngo-classic/DonateForm.tsx`

**Interfaces:**
- Consumes: `NgoCampaign` from `../types`.
- Produces: `default` export component with props
  `{ storeSlug: string; currency: string; campaign: NgoCampaign; onClose: () => void }`.
  POSTs to `` `/api/store/${storeSlug}/donate` `` with body
  `{ campaignId: string; amount: number; guest: { email?: string; mpesaPhone?: string }; paymentMethod: 'mpesa' | 'paypal'; idempotencyKey: string }`
  and expects `{ orderNumber: string }` (matches the donate endpoint in Task 5).

- [ ] **Step 1: Implement DonateForm**

Create `packages/themes/src/ngo-classic/DonateForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@mcloud/ui/button'
import type { NgoCampaign } from '../types'

function formatPrice(amount: number, currency: string) {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}

export default function DonateForm({
    storeSlug, currency, campaign, onClose,
}: {
    storeSlug: string
    currency: string
    campaign: NgoCampaign
    onClose: () => void
}) {
    const [amount, setAmount] = useState<number | ''>(campaign.donationPresets[0] ?? '')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState<string | null>(null)

    async function submit() {
        setError(null)
        const value = Number(amount)
        if (!value || value <= 0) { setError('Enter a valid amount'); return }
        if (!phone.trim()) { setError('Phone number is required for M-Pesa'); return }
        setSubmitting(true)
        try {
            const res = await fetch(`/api/store/${storeSlug}/donate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignId: campaign.id,
                    amount: value,
                    guest: { mpesaPhone: phone.trim(), email: email.trim() || undefined },
                    paymentMethod: 'mpesa',
                    idempotencyKey: crypto.randomUUID(),
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Could not process donation'); return }
            setDone(data.orderNumber)
        } catch {
            setError('Network error, please try again')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="sf-card w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between">
                    <h3 className="sf-heading text-xl font-normal">Donate to {campaign.name}</h3>
                    <button onClick={onClose} aria-label="Close"><X className="w-5 h-5" /></button>
                </div>

                {done ? (
                    <div className="space-y-2 py-4 text-center">
                        <p className="text-sm">Thank you! Your donation reference is</p>
                        <p className="sf-heading text-lg sf-text-accent">{done}</p>
                        <p className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>Complete the M-Pesa prompt on your phone.</p>
                        <Button className="sf-btn-primary rounded-none mt-2 w-full" onClick={onClose}>Done</Button>
                    </div>
                ) : (
                    <>
                        {campaign.donationPresets.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {campaign.donationPresets.map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setAmount(p)}
                                        className={`sf-pill border px-3 py-1.5 text-sm ${amount === p ? 'sf-pill-active' : 'sf-pill-inactive'}`}
                                    >
                                        {formatPrice(p, currency)}
                                    </button>
                                ))}
                            </div>
                        )}
                        {campaign.allowCustomAmount && (
                            <input
                                type="number" min={1} placeholder="Other amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full border px-3 py-2 text-sm bg-transparent"
                                style={{ borderColor: 'var(--sf-foreground)' }}
                            />
                        )}
                        <input
                            type="tel" placeholder="M-Pesa phone (2547…)"
                            value={phone} onChange={(e) => setPhone(e.target.value)}
                            className="w-full border px-3 py-2 text-sm bg-transparent"
                            style={{ borderColor: 'var(--sf-foreground)' }}
                        />
                        <input
                            type="email" placeholder="Email (optional)"
                            value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full border px-3 py-2 text-sm bg-transparent"
                            style={{ borderColor: 'var(--sf-foreground)' }}
                        />
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <Button className="sf-btn-primary rounded-none w-full" disabled={submitting} onClick={submit}>
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Give ${amount ? formatPrice(Number(amount), currency) : ''}`}
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Verify the theme package compiles**

Run: `cd packages/themes && npx tsc --noEmit`
Expected: no errors (Task 3 + Task 4 now resolve each other).

- [ ] **Step 3: Commit**

```bash
git add packages/themes/src/ngo-classic/DonateForm.tsx
git commit -m "feat(themes): add DonateForm (amount presets + M-Pesa donate)"
```

---

### Task 5: Donation endpoint

**Files:**
- Create: `apps/storefront/app/api/store/[slug]/donate/route.ts`

**Interfaces:**
- Consumes: request body `{ campaignId: string; amount: number; guest: { mpesaPhone?: string; email?: string }; paymentMethod: 'mpesa' | 'paypal'; idempotencyKey: string }`; `getActiveStoreId` from `@/lib/customer-auth`; `createClient` from `@mcloud/db/server`.
- Produces: JSON `{ orderNumber: string, total: number }` (201) or `{ error: string }` (4xx/5xx). Order row is tagged `metadata.kind = 'donation'`.

**Why a new endpoint:** the existing `/checkout` route deliberately recomputes every price from the DB and ignores client-sent prices (its whole reason for existing). A donation is the one case where the client legitimately supplies the amount, but we still validate it against the item — the campaign must exist, be active, and be a donation-mode campaign in THIS store. Keeping this separate preserves the security invariant of `/checkout`.

- [ ] **Step 1: Implement the donate route**

Create `apps/storefront/app/api/store/[slug]/donate/route.ts`:

```ts
// app/api/store/[slug]/donate/route.ts
// Donation checkout for NGO stores. Unlike /checkout (which recomputes prices
// from the DB and ignores client amounts), a donation's amount is chosen by the
// donor — so we accept `amount`, but only after validating that campaignId is an
// active, donation-mode campaign in THIS store. The order is recorded exactly
// like a sale but tagged metadata.kind='donation' so reporting can tell gifts
// from purchases. Payment providers are reused unchanged.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { getActiveStoreId } from '@/lib/customer-auth'

const noStore = { 'Cache-Control': 'no-store' }

interface DonateBody {
    campaignId: string
    amount: number
    guest: { mpesaPhone?: string; email?: string }
    paymentMethod: 'mpesa' | 'paypal'
    idempotencyKey: string
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params

    let body: DonateBody
    try {
        body = (await req.json()) as DonateBody
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: noStore })
    }

    const { campaignId, amount, guest = {}, paymentMethod, idempotencyKey } = body
    const value = Math.floor(Number(amount))
    if (!campaignId || !value || value <= 0) {
        return NextResponse.json({ error: 'A valid campaign and amount are required' }, { status: 400, headers: noStore })
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        return NextResponse.json({ error: 'Missing idempotency key' }, { status: 400, headers: noStore })
    }
    const method = paymentMethod === 'paypal' ? 'paypal' : 'mpesa'

    const storeId = await getActiveStoreId(slug)
    if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: noStore })

    const admin = await createClient()

    // Idempotency: a repeat key returns the original donation.
    const { data: prior } = await admin
        .from('orders')
        .select('order_number, total')
        .eq('store_id', storeId)
        .eq('metadata->>idempotency_key', idempotencyKey)
        .maybeSingle()
    if (prior) {
        return NextResponse.json({ orderNumber: prior.order_number, total: prior.total }, { headers: noStore })
    }

    // Validate the campaign belongs to this store, is active, and is a donation
    // campaign. We do NOT trust the amount to any stored price — the donor sets it.
    const { data: campaign } = await admin
        .from('products')
        .select('id, name, item_type, is_active, metadata, images')
        .eq('store_id', storeId)
        .eq('id', campaignId)
        .maybeSingle()

    const meta = (campaign?.metadata && typeof campaign.metadata === 'object' && !Array.isArray(campaign.metadata))
        ? campaign.metadata as Record<string, unknown>
        : {}

    if (!campaign || !campaign.is_active || campaign.item_type !== 'campaign' || meta.pricingMode !== 'donation') {
        return NextResponse.json({ error: 'This campaign is not accepting donations.' }, { status: 409, headers: noStore })
    }

    const phoneKey = guest.mpesaPhone?.trim() || null
    const emailKey = guest.email?.trim() || null

    // Customer upsert, matched by mpesa_phone within the store (mirrors /checkout).
    let customerId: string
    const lookup = admin.from('customers').select('id').eq('store_id', storeId)
    const { data: existing } = await (
        phoneKey ? lookup.eq('mpesa_phone', phoneKey) : lookup.is('mpesa_phone', null)
    ).maybeSingle()

    if (existing) {
        customerId = existing.id
        if (emailKey) await admin.from('customers').update({ email: emailKey }).eq('id', customerId)
    } else {
        const { data: created, error: ce } = await admin
            .from('customers')
            .insert({ store_id: storeId, mpesa_phone: phoneKey, email: emailKey, first_name: 'Donor', last_name: '' })
            .select('id')
            .single()
        if (ce || !created) {
            return NextResponse.json({ error: 'Could not start donation' }, { status: 500, headers: noStore })
        }
        customerId = created.id
    }

    const orderNumber = `DON-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`
    const firstImage = Array.isArray(campaign.images) ? (campaign.images[0] as string | undefined) : undefined

    const { data: order, error: orderError } = await admin
        .from('orders')
        .insert({
            store_id: storeId,
            customer_id: customerId,
            order_number: orderNumber,
            status: 'pending',
            fulfillment_status: 'unfulfilled',
            subtotal: value,
            tax: 0, shipping: 0, discount: 0,
            total: value,
            currency: 'KES',
            customer_email: emailKey,
            customer_phone: phoneKey,
            source: 'storefront',
            metadata: {
                kind: 'donation',
                campaign_id: campaign.id,
                campaign_name: campaign.name,
                idempotency_key: idempotencyKey,
                payment_method: method === 'mpesa' ? 'MPESA' : 'PayPal',
                payment_status: 'pending',
                mpesa_phone: phoneKey,
            },
        })
        .select('id, order_number, total')
        .single()

    if (orderError || !order) {
        return NextResponse.json({ error: 'Could not create donation' }, { status: 500, headers: noStore })
    }

    // One order_item so the donation appears in order detail like any line.
    const { error: itemError } = await admin.from('order_items').insert({
        order_id: order.id,
        product_id: campaign.id,
        variant_id: null,
        quantity: 1,
        price: value,
        total: value,
        title: campaign.name,
        variant_title: null,
        image_url: firstImage ?? null,
    })
    if (itemError) {
        return NextResponse.json({ error: 'Could not record donation' }, { status: 500, headers: noStore })
    }

    return NextResponse.json({ orderNumber: order.order_number, total: order.total }, { status: 201, headers: noStore })
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `cd apps/storefront && npx tsc --noEmit`
Expected: no errors. (If `order_items` insert types complain about extra fields, mirror exactly the field set used in `checkout/route.ts` lines 216-218 — they insert the same shape.)

- [ ] **Step 3: Commit**

```bash
git add "apps/storefront/app/api/store/[slug]/donate/route.ts"
git commit -m "feat(storefront): add donation endpoint (validates campaign, tags order kind=donation)"
```

---

### Task 6: Resolver + theme registry (vertical-aware)

**Files:**
- Modify: `packages/themes/src/resolver.ts`
- Modify: `packages/themes/src/index.ts`

**Interfaces:**
- Consumes: `getVertical` from `./verticals`.
- Produces: `resolveTheme` unchanged signature but registers `ngo-classic`. New `THEMES` meta entry and `ThemeId` union member.

- [ ] **Step 1: Register ngo-classic in the resolver**

In `packages/themes/src/resolver.ts`, add the ngo family to the `themes` map. The NGO family only needs `StoreFront` for Deliverable A; the other page components are shop-only. Provide the ngo `StoreFront` and reuse the classic components for the rest so the `ThemeComponents` shape is satisfied (those routes aren't linked from an NGO storefront):

```ts
const themes: Record<string, () => Promise<ThemeComponents>> = {
    classic: () =>
        Promise.all([
            import('./classic/StoreFront'),
            import('./classic/ProductsPage'),
            import('./classic/CartPage'),
            import('./classic/ProductDetailPage'),
            import('./classic/BlogListPage'),
            import('./classic/BlogPostPage'),
            import('./classic/ServicesPage'),
            import('./classic/ServiceDetailsPage'),
        ]).then(([sf, pp, cp, pdp, blp, bpp, svp, sdp]) => ({
            StoreFront: sf.default,
            ProductsPage: pp.default,
            CartPage: cp.default,
            ProductDetailPage: pdp.default,
            BlogListPage: blp.default,
            BlogPostPage: bpp.default,
            ServicesPage: svp.default,
            ServiceDetailPage: sdp.default,
        })),

    'ngo-classic': () =>
        Promise.all([
            import('./ngo-classic/StoreFront'),
            import('./classic/ProductsPage'),
            import('./classic/CartPage'),
            import('./classic/ProductDetailPage'),
            import('./classic/BlogListPage'),
            import('./classic/BlogPostPage'),
            import('./classic/ServicesPage'),
            import('./classic/ServiceDetailsPage'),
        ]).then(([sf, pp, cp, pdp, blp, bpp, svp, sdp]) => ({
            StoreFront: sf.default as unknown as ThemeComponents['StoreFront'],
            ProductsPage: pp.default,
            CartPage: cp.default,
            ProductDetailPage: pdp.default,
            BlogListPage: blp.default,
            BlogPostPage: bpp.default,
            ServicesPage: svp.default,
            ServiceDetailPage: sdp.default,
        })),
}
```

> Note the `StoreFront` cast: the ngo StoreFront takes `NgoStoreFrontProps`, not `StoreFrontProps`. The `ThemeComponents.StoreFront` type stays shop-shaped for the shop path; the storefront page (Task 7) selects the ngo component through `Storefront.tsx` (Task 8) which is typed for the ngo props, so the cast here is contained to the registry. Do not change `ThemeComponents`.

- [ ] **Step 2: Add ngo-classic to index meta**

In `packages/themes/src/index.ts`:

```ts
export const THEMES: ThemeMeta[] = [
    {
        id: 'classic',
        name: 'Classic',
        description: 'Clean editorial look with sharp lines and serif headings',
        preview: { primary: '#1c2228', background: '#ffffff', accent: '#c9a96e' },
    },
    {
        id: 'ngo-classic',
        name: 'NGO Classic',
        description: 'Mission-first layout for non-profits with programs and donations',
        preview: { primary: '#1c2228', background: '#ffffff', accent: '#2e7d5b' },
    },
]

export type ThemeId = 'classic' | 'ngo-classic'
```

- [ ] **Step 3: Verify it compiles**

Run: `cd packages/themes && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/themes/src/resolver.ts packages/themes/src/index.ts
git commit -m "feat(themes): register ngo-classic family in resolver + meta"
```

---

### Task 7: Page loader — branch data fetch by vertical

**Files:**
- Modify: `apps/storefront/app/store/[slug]/page.tsx`
- Modify: `apps/storefront/lib/db-cast.ts`

**Interfaces:**
- Consumes: `getVertical` from `@mcloud/themes/verticals`; new casters `castNgoPrograms`, `castNgoCampaigns` from `@/lib/db-cast`.
- Produces: renders the ngo `StoreFront` (via `Storefront.tsx`, Task 8) with `{ store, programs, campaigns }` for ngo stores; shop path unchanged.

- [ ] **Step 1: Add NGO casters to db-cast.ts**

Append to `apps/storefront/lib/db-cast.ts`:

```ts
import type { NgoProgram, NgoCampaign } from '@mcloud/themes/types'

type RawNgoItem = {
    id: string
    name: string
    slug: string
    description: string | null
    images: unknown
    metadata: unknown
}

function toImages(raw: unknown): string[] {
    return Array.isArray(raw) ? (raw as string[]) : []
}

export function castNgoPrograms(rows: RawNgoItem[]): NgoProgram[] {
    return rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        images: toImages(r.images),
    }))
}

export function castNgoCampaigns(rows: RawNgoItem[]): NgoCampaign[] {
    return rows.map((r) => {
        const meta = (r.metadata && typeof r.metadata === 'object' && !Array.isArray(r.metadata))
            ? r.metadata as Record<string, unknown>
            : {}
        const presets = Array.isArray(meta.donationPresets)
            ? (meta.donationPresets as unknown[]).map(Number).filter((n) => Number.isFinite(n) && n > 0)
            : []
        return {
            id: r.id,
            name: r.name,
            slug: r.slug,
            description: r.description,
            images: toImages(r.images),
            goalAmount: typeof meta.goalAmount === 'number' ? meta.goalAmount : null,
            donationPresets: presets,
            allowCustomAmount: meta.allowCustomAmount !== false, // default true
        }
    })
}
```

- [ ] **Step 2: Branch the page loader by vertical**

Modify `apps/storefront/app/store/[slug]/page.tsx`. Import the vertical helper and the casters, then after loading `rawStore`, branch. Replace the existing single data-fetch block with a vertical check. Add near the top imports:

```ts
import { getVertical } from '@mcloud/themes/verticals'
import { castNgoPrograms, castNgoCampaigns } from '@/lib/db-cast'
```

Then, immediately after `if (!rawStore) notFound()` and before the shop `Promise.all`, insert the NGO branch:

```ts
    const vertical = getVertical((rawStore as { type?: string }).type)

    if (vertical.id === 'ngo') {
        const { data: rawItems } = await supabase
            .from('products')
            .select('id, name, slug, description, images, metadata, item_type')
            .eq('store_id', rawStore.id)
            .eq('is_active', true)
            .in('item_type', vertical.itemKinds)
            .order('created_at', { ascending: false })

        const items = (rawItems ?? []) as any[]
        const programs = castNgoPrograms(items.filter((i) => i.item_type === 'program'))
        const campaigns = castNgoCampaigns(items.filter((i) => i.item_type === 'campaign'))
        const store = castStore(rawStore)

        if (store?.id) incrementViews(store.id)

        const { StoreFront } = await resolveTheme(vertical.themeFamily)
        // NGO StoreFront takes NgoStoreFrontProps; the registry types it shop-shaped,
        // so pass through a cast contained to this vertical branch.
        const NgoStoreFront = StoreFront as unknown as React.ComponentType<{
            store: typeof store; programs: typeof programs; campaigns: typeof campaigns
        }>
        return <NgoStoreFront store={store} programs={programs} campaigns={campaigns} />
    }
```

Leave the entire existing shop code path (the `Promise.all`, casts, review aggregates, `<StoreFront .../>`) exactly as it is below this branch. Add `import type React from 'react'` if not already present.

> Note: the shop path still calls `resolveTheme(settings.themeId ?? 'classic')`. That's unchanged. The NGO branch calls `resolveTheme(vertical.themeFamily)` = `'ngo-classic'`.

- [ ] **Step 3: Verify it typechecks + builds**

Run: `cd apps/storefront && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/app/store/[slug]/page.tsx apps/storefront/lib/db-cast.ts
git commit -m "feat(storefront): branch storefront data loading by vertical (ngo)"
```

---

### Task 8: Theme registry component — select ngo body

**Files:**
- Modify: `apps/storefront/components/store/Storefront.tsx`

**Interfaces:**
- Consumes: dynamic import of `@mcloud/themes/ngo-classic/StoreFront`.
- Produces: `StoreFront` component that renders the ngo body when `themeId==='ngo-classic'`.

> This component is the client wrapper that `page.tsx`'s shop path uses. The NGO branch in Task 7 returns the ngo StoreFront directly from `resolveTheme`, so strictly this file only needs updating if the NGO path routes through it. Since Task 7's NGO branch renders directly, Task 8 keeps `Storefront.tsx` correct for the case where a store's `settings.themeId` is `ngo-classic` but reaches this component — register it so there's no silent fallback to `classic`.

- [ ] **Step 1: Register ngo-classic in the dynamic map**

Modify `apps/storefront/components/store/Storefront.tsx`:

```tsx
const THEMES: Record<string, React.ComponentType<any>> = {
    classic: dynamic(() => import('@mcloud/themes/classic/StoreFront'), { ssr: false, loading: Spinner }),
    'ngo-classic': dynamic(() => import('@mcloud/themes/ngo-classic/StoreFront'), { ssr: false, loading: Spinner }),
}
```

Remove the `console.log` line while here (it logs on every render).

- [ ] **Step 2: Verify it typechecks**

Run: `cd apps/storefront && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/components/store/Storefront.tsx
git commit -m "feat(storefront): register ngo-classic in theme component map"
```

---

### Task 9: Vertical-aware layout (no cart for NGO)

**Files:**
- Modify: `apps/storefront/app/store/[slug]/layout.tsx`
- Modify: `apps/storefront/components/store/layout-wrapper.tsx`

**Interfaces:**
- Consumes: `getVertical` from `@mcloud/themes/verticals`.
- Produces: `LayoutWrapper` accepts a `verticalId` prop; hides `CartIsland` + `WishlistIsland` when `verticalId==='ngo'`.

- [ ] **Step 1: Pass vertical into LayoutWrapper**

In `apps/storefront/app/store/[slug]/layout.tsx`, import the helper and compute the vertical from the loaded store, then pass it:

```ts
import { getVertical } from '@mcloud/themes/verticals'
```

The `store` is already loaded via `getStore(slug)`. Compute:

```ts
    const verticalId = getVertical((store as { type?: string } | null)?.type).id
```

and pass it to the wrapper:

```tsx
    <LayoutWrapper store={store} settings={store?.settings} cssVars={cssVars} verticalId={verticalId}>
```

- [ ] **Step 2: Make LayoutWrapper hide cart for NGO**

Modify `apps/storefront/components/store/layout-wrapper.tsx` to accept `verticalId` and conditionally render the shop-only islands:

```tsx
export default function LayoutWrapper({
    children,
    store,
    cssVars,
    settings,
    verticalId = 'shop',
}: {
    children: React.ReactNode
    store: any
    cssVars: React.CSSProperties
    settings: any
    verticalId?: string
}) {
    const pathname = usePathname()

    if (pathname.includes('/settings')) {
        return <>{children}</>
    }

    const showShopIslands = verticalId !== 'ngo'

    return (
        <div className="storefront-root" data-sf-css style={cssVars}>
            <StoreNav store={store} />
            {children}
            <StoreFooter store={store} settings={settings} />
            {showShopIslands && <CartIsland />}
            {showShopIslands && <WishlistIsland />}
            <LiquidScriptRunner />
        </div>
    )
}
```

- [ ] **Step 3: Verify it typechecks**

Run: `cd apps/storefront && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/storefront/app/store/[slug]/layout.tsx" apps/storefront/components/store/layout-wrapper.tsx
git commit -m "feat(storefront): make layout vertical-aware (hide cart/wishlist for NGO)"
```

---

### Task 10: Build verification + manual smoke

**Files:** none (verification only).

- [ ] **Step 1: Full build of the affected workspaces**

Run: `npx turbo run build --filter=@mcloud/themes --filter=storefront`
Expected: both build successfully, exit 0. If `storefront`'s turbo name differs, use the `name` field from `apps/storefront/package.json`.

- [ ] **Step 2: Re-run the vertical unit test**

Run: `cd packages/themes && npx tsx src/verticals.test.ts`
Expected: `verticals.test.ts: all assertions passed`

- [ ] **Step 3: Seed a test NGO store (SQL, via Supabase)**

Using the `commerce` project (`cuptlifacdkeagrrofni`), pick one existing test store you own and seed NGO data. Run in the Supabase SQL editor (or via MCP `execute_sql`), replacing `:store_slug`:

```sql
-- Flip a test store to the ngo vertical
update stores set type = 'ngo' where slug = ':store_slug';

-- A program (informational)
insert into products (store_id, name, slug, description, item_type, price, is_active, images, metadata)
select id, 'Clean Water Initiative', 'clean-water', 'Boreholes for rural schools.', 'program', 0, true, '[]'::jsonb, '{}'::jsonb
from stores where slug = ':store_slug';

-- A campaign (donation mode)
insert into products (store_id, name, slug, description, item_type, price, is_active, images, metadata)
select id, 'Build a Classroom', 'build-a-classroom', 'Fund a new classroom block.', 'campaign', 0, true, '[]'::jsonb,
       '{"pricingMode":"donation","donationPresets":[500,1000,2500],"goalAmount":100000,"allowCustomAmount":true}'::jsonb
from stores where slug = ':store_slug';
```

- [ ] **Step 4: Manual smoke via the run-mcloud skill**

Use the `run-mcloud` skill (or `cd apps/storefront && npm run dev`, port 3001) and open `/store/:store_slug`.
Verify:
- The NGO StoreFront renders: mission hero, the "Build a Classroom" campaign, the "Clean Water Initiative" program.
- No cart icon / cart island appears (shop islands hidden).
- Clicking **Donate** opens the DonateForm with presets 500 / 1000 / 2500.
- Flip the same store back to `type='shop'` (or open a different shop store) and confirm the shop storefront renders unchanged with its cart island — the regression check.

- [ ] **Step 5: Smoke the donation endpoint**

With the dev server running, in a second terminal:

```bash
curl -s -X POST http://localhost:3001/api/store/:store_slug/donate \
  -H 'Content-Type: application/json' \
  -d '{"campaignId":"<campaign-id-from-step-3>","amount":1000,"guest":{"mpesaPhone":"254700000000"},"paymentMethod":"mpesa","idempotencyKey":"smoke-1"}'
```

Expected: `201` with `{"orderNumber":"DON-…","total":1000}`. Re-running with the same `idempotencyKey` returns the SAME order number (idempotency). Then verify in SQL:

```sql
select order_number, total, metadata->>'kind' as kind, metadata->>'campaign_name' as campaign
from orders where metadata->>'idempotency_key' = 'smoke-1';
```

Expected: one row, `kind = 'donation'`.

- [ ] **Step 6: Reset test data (optional)**

```sql
delete from order_items where order_id in (select id from orders where metadata->>'idempotency_key' = 'smoke-1');
delete from orders where metadata->>'idempotency_key' = 'smoke-1';
delete from products where slug in ('clean-water','build-a-classroom') and store_id = (select id from stores where slug = ':store_slug');
update stores set type = 'shop' where slug = ':store_slug';
```

- [ ] **Step 7: Final commit (if any verification tweaks were needed)**

```bash
git add -A
git commit -m "chore(storefront): NGO vertical verification tweaks"
```

---

## Self-Review

**Spec coverage:**
- §3.1 Vertical descriptor → Task 1. ✓
- §3.2 Content model (typed items, metadata donation mode, shop untouched) → Task 7 (query by `itemKinds`, shop path unchanged) + Task 5 (validates `pricingMode`). ✓
- §3.3 Separate NGO theme reusing primitives → Tasks 3, 4, 6 (theme); Task 9 (reuse app-level nav/footer, drop cart). ✓
- §3.4 Data loading branch → Task 7. ✓
- §3.5 Donations reuse rails, no cart, tagged order → Task 5. ✓
- §6 Error handling (getVertical never throws; no campaigns → hide CTA; server-side amount validation) → Task 1 (default), Task 3 (conditional render), Task 5 (validation). ✓
- §7 No schema change, existing data untouched → Global Constraints + Task 7 (shop path unfiltered). ✓
- §8 Testing → Task 1 unit test + Task 10 build & smoke. ✓
- §10 Open items resolved: (1) prop shape = separate `NgoStoreFrontProps`, classic untouched (Task 2); (2) donation tag = `orders.metadata.kind='donation'` (Task 5); (3) routing = donate from home via `/donate` endpoint, no new dynamic route (Tasks 3/5); (4) primitives = nav/footer/cart are app-level in LayoutWrapper, made vertical-aware, no theme-package extraction needed (Task 9). ✓

**Placeholder scan:** No TBD/TODO. Every code step shows complete code. The one intentional cross-reference (Task 3 depends on Task 4's `DonateForm`) is called out with the build-order note and the exact signature is in Task 4's Interfaces block. ✓

**Type consistency:** `getVertical` / `VERTICALS` / `Vertical` (Task 1) used identically in Tasks 5, 7, 9. `NgoStoreFrontProps` / `NgoProgram` / `NgoCampaign` (Task 2) consumed in Tasks 3, 7. DonateForm POST body (Task 4) matches the donate endpoint body (Task 5): `{ campaignId, amount, guest:{mpesaPhone,email}, paymentMethod, idempotencyKey }` → `{ orderNumber, total }`. `metadata.kind='donation'` written in Task 5, asserted in Task 10. `verticalId` prop (Task 9) defaulted to `'shop'` for back-compat. ✓

**Deviation from spec noted:** The spec §3.4 mused about reusing `/[product-slug]` for a campaign detail route. This plan instead donates directly from the home campaign card via a modal + `/donate` endpoint (no per-campaign detail page in Deliverable A). This is simpler, fully covers "accept donations," and avoids new routing. A campaign detail page can be added later without rework. This matches spec §9's deferral spirit.
