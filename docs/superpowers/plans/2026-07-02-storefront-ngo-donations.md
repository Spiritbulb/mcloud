# NGO Donations (SP4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an NGO store define campaigns in `stores.settings` and accept real one-off donations through the existing M-Pesa/PayPal rails, with a goal progress bar and an optional dedication note.

**Architecture:** Extract the provider-agnostic order-creation tail of the existing storefront checkout into a shared `createOrderWithPayment` core; add a `/donate` endpoint that validates a campaign + donor-chosen amount and calls that core (tagging the order as a donation); add a `campaigns` Liquid section (empty-guarded, `sf-*` styled) with an inline donate action; wire the section into the NGO home via the registry + `@mcloud/verticals`, augmented with a server-computed "raised" total per campaign; and a client donate island that posts to `/donate` then drives the existing payment steps. No new tables — campaigns are JSON in `stores.settings.campaigns`; donations are `orders` rows tagged in `metadata`.

**Tech Stack:** TypeScript, Next.js 16 (App Router, RSC + route handlers), Supabase (`@mcloud/db` service-role server client), `@mcloud/liquid` (liquidjs, bundled-string manifest), `@mcloud/verticals`, Turborepo, npm workspaces. **No unit-test framework** — pure-logic + Liquid units are tested with `npx tsx <file>.test.ts` (top-level `node:assert`, prints a success line); route/UI behavior via build + manual smoke.

## Global Constraints

- **No schema change, no backfill.** Campaigns live in `stores.settings.campaigns` (JSON); donations are `orders` rows tagged via `metadata`. Uses existing `orders` (has `metadata: Json`, `source: string`, nullable `customer_id`), `order_items` (nullable `product_id`), `customers`, `stores.settings`.
- **The purchase (product) checkout's price-authority behavior MUST NOT change:** it recomputes every product line price from the products/product_variants rows and ignores any client-sent price. The refactor is a pure extraction — the purchase order shape, idempotency behavior, and error codes must stay byte-identical.
- **All storefront `stores`/`orders`/`customers` access is via the server-side service-role client** (`@mcloud/db/server`'s `createClient`). SP4 adds no anon table access.
- **The shared order core NEVER computes or second-guesses a line price** — each caller hands in already-authorized `lines`. Checkout authorizes by recomputing from product rows; `/donate` authorizes by validating the donor amount against the campaign.
- **Liquid auto-escaping is on** (since SP1). The `campaigns` section uses plain `{{ }}` for text and `<img src="{{ }}">` for owner-authored campaign image URLs (same trust level as the shop hero image). It is **empty-guarded** (SP2/SP3 pattern): renders nothing when `campaigns` is absent/empty.
- **New/edited `.liquid` files do NOT render until the manifest is regenerated:** after adding/editing any `.liquid`, run `cd packages/liquid && node scripts/build-manifest.mjs` (writes `packages/liquid/src/themes-manifest.ts` — AUTO-GENERATED, never hand-edit). Commit the regenerated manifest alongside the `.liquid`.
- **Donation order tag:** `orders.source = 'donation'` and `orders.metadata` carries `{ isDonation: true, campaignId, dedication? }` (merged with the base metadata the core writes: `{ idempotency_key, payment_method, payment_status: 'pending', ... }`).
- **Progress-bar "completed" predicate:** a donation counts toward a campaign's raised total when `orders.metadata->>campaignId` matches AND `orders.metadata->>payment_status = 'completed'` (set by both the M-Pesa callback and the PayPal capture route). Dedication text is trimmed and capped at ≤ 280 chars before storing.
- **Currency:** amounts are the store's currency (KES today); `formatKES(amount)` from `apps/storefront/lib/currency.ts` produces the display string. Liquid receives pre-formatted strings (it cannot call the helper).

---

### Task 1: Extract the shared order-creation core

Pull the provider-agnostic tail (idempotency, guest-customer upsert, order + order_items insert) out of the checkout route into a reusable `createOrderWithPayment`. Refactor checkout to call it. The purchase behavior must stay byte-identical — checkout still owns price authority.

**Files:**
- Create: `apps/storefront/lib/orders.ts`
- Create (test): `apps/storefront/lib/orders.test.ts`
- Modify: `apps/storefront/app/api/store/[slug]/checkout/route.ts`

**Interfaces:**
- Consumes: `createClient` from `@mcloud/db/server`.
- Produces (used by Task 3):
  ```ts
  export interface OrderLineInput {
    product_id: string | null
    variant_id?: string | null
    quantity: number
    price: number
    title: string
    variant_title?: string | null
    image_url?: string | null
  }
  export interface CreateOrderInput {
    storeId: string
    guest: { mpesaPhone?: string; email?: string; whatsapp?: string }
    lines: OrderLineInput[]
    paymentMethod: 'mpesa' | 'paypal'
    idempotencyKey: string
    source: 'storefront' | 'donation'
    extraOrderMetadata?: Record<string, unknown>
  }
  export type CreateOrderResult =
    | { error: string; status: number; orderNumber?: undefined }
    | { error: null; orderNumber: string; total: number }
  export async function createOrderWithPayment(input: CreateOrderInput): Promise<CreateOrderResult>
  export function buildLineTotals(lines: OrderLineInput[]): { items: (OrderLineInput & { total: number })[]; subtotal: number }
  ```

- [ ] **Step 1: Write the failing test for the pure line-math helper**

The DB-touching parts of `createOrderWithPayment` are covered by the checkout parity check (Step 6) + Task 7 smoke. Unit-test the pure `buildLineTotals` helper that both callers rely on. Create `apps/storefront/lib/orders.test.ts`:

```ts
import assert from 'node:assert/strict'
import { buildLineTotals } from './orders'

// computes per-line total (price*qty) and subtotal (sum of line totals)
const { items, subtotal } = buildLineTotals([
  { product_id: 'p1', quantity: 2, price: 150, title: 'A' },
  { product_id: null, quantity: 1, price: 500, title: 'Donation' },
])
assert.equal(items[0].total, 300, 'line 1 total = price*qty')
assert.equal(items[1].total, 500, 'line 2 total = price*1')
assert.equal(subtotal, 800, 'subtotal = sum of line totals')

// quantity is floored to an integer >= 1 (mirrors checkout: Math.max(1, Math.floor(...)))
const clamped = buildLineTotals([{ product_id: 'p1', quantity: 2.9, price: 100, title: 'A' }])
assert.equal(clamped.items[0].quantity, 2, 'qty floored')
assert.equal(clamped.items[0].total, 200, 'total uses floored qty')
const zero = buildLineTotals([{ product_id: 'p1', quantity: 0, price: 100, title: 'A' }])
assert.equal(zero.items[0].quantity, 1, 'qty clamped up to 1')

console.log('orders.test.ts: all assertions passed')
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/storefront && npx tsx lib/orders.test.ts`
Expected: FAIL — cannot find module `./orders`.

- [ ] **Step 3: Implement `orders.ts`**

Create `apps/storefront/lib/orders.ts`. This lifts the customer-upsert + order-insert + order_items-insert + idempotency logic verbatim from `checkout/route.ts` (lines ~59–226 there), parameterized by `source` and `extraOrderMetadata`, and adds the pure `buildLineTotals` helper:

```ts
// lib/orders.ts
// Provider-agnostic order creation shared by the product checkout and the NGO
// donation endpoint. The caller hands in ALREADY-PRICED lines — this core never
// computes or second-guesses a line price. Checkout authorizes prices by
// recomputing from product rows; /donate authorizes by validating the donor
// amount against the campaign. Keeping price authority in the callers preserves
// the checkout invariant "the client never sets a product price."
import { createClient } from '@mcloud/db/server'
import type { Json } from '@mcloud/db/types'

export interface OrderLineInput {
  product_id: string | null
  variant_id?: string | null
  quantity: number
  price: number
  title: string
  variant_title?: string | null
  image_url?: string | null
}

export interface CreateOrderInput {
  storeId: string
  guest: { mpesaPhone?: string; email?: string; whatsapp?: string }
  lines: OrderLineInput[]
  paymentMethod: 'mpesa' | 'paypal'
  idempotencyKey: string
  source: 'storefront' | 'donation'
  extraOrderMetadata?: Record<string, unknown>
}

export type CreateOrderResult =
  | { error: string; status: number; orderNumber?: undefined }
  | { error: null; orderNumber: string; total: number }

/** Floor each quantity to an integer >= 1 and compute per-line + subtotal. Pure. */
export function buildLineTotals(
  lines: OrderLineInput[],
): { items: (OrderLineInput & { total: number })[]; subtotal: number } {
  const items = lines.map((l) => {
    const quantity = Math.max(1, Math.floor(Number(l.quantity) || 0))
    return { ...l, quantity, total: l.price * quantity }
  })
  const subtotal = items.reduce((s, i) => s + i.total, 0)
  return { items, subtotal }
}

export async function createOrderWithPayment(input: CreateOrderInput): Promise<CreateOrderResult> {
  const { storeId, guest, paymentMethod, idempotencyKey, source, extraOrderMetadata } = input
  const method = paymentMethod === 'paypal' ? 'paypal' : 'mpesa'
  const admin = await createClient()

  // ── Idempotency: an existing order for this key is returned unchanged. ──
  const { data: prior } = await admin
    .from('orders')
    .select('id, order_number, total')
    .eq('store_id', storeId)
    .eq('metadata->>idempotency_key', idempotencyKey)
    .maybeSingle()
  if (prior) {
    return { error: null, orderNumber: prior.order_number, total: Number(prior.total) }
  }

  const { items, subtotal } = buildLineTotals(input.lines)
  const total = subtotal // tax/shipping/discount are 0 today, matching checkout

  // ── Guest customer upsert (matched by mpesa_phone within the store). ──
  const phoneKey = guest.mpesaPhone?.trim() || null
  const emailKey = guest.email?.trim() || null
  const whatsapp = guest.whatsapp?.trim() || phoneKey

  let customerId: string
  const customerLookup = admin.from('customers').select('id').eq('store_id', storeId)
  const { data: existing } = await (
    phoneKey ? customerLookup.eq('mpesa_phone', phoneKey) : customerLookup.is('mpesa_phone', null)
  ).maybeSingle()

  if (existing) {
    customerId = existing.id
    await admin
      .from('customers')
      .update({ ...(emailKey && { email: emailKey }), whatsapp_number: whatsapp })
      .eq('id', customerId)
  } else {
    const { data: created, error: ce } = await admin
      .from('customers')
      .insert({
        store_id: storeId,
        mpesa_phone: phoneKey,
        email: emailKey,
        whatsapp_number: whatsapp,
        first_name: 'Guest',
        last_name: '',
      })
      .select('id')
      .single()
    if (ce || !created) return { error: 'Could not start checkout', status: 500 }
    customerId = created.id
  }

  // ── Create the order (server-generated number, server-computed total). ──
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      store_id: storeId,
      customer_id: customerId,
      order_number: orderNumber,
      status: 'pending',
      fulfillment_status: 'unfulfilled',
      subtotal,
      tax: 0,
      shipping: 0,
      discount: 0,
      total,
      currency: 'KES',
      customer_email: emailKey,
      customer_phone: phoneKey,
      source,
      metadata: {
        idempotency_key: idempotencyKey,
        payment_method: method === 'mpesa' ? 'MPESA' : 'PayPal',
        payment_status: 'pending',
        mpesa_phone: phoneKey,
        whatsapp_number: whatsapp,
        ...(extraOrderMetadata ?? {}),
      } as unknown as Json,
    })
    .select('id, order_number')
    .single()
  if (orderError || !order) return { error: 'Could not create order', status: 500 }

  const { error: itemsError } = await admin.from('order_items').insert(
    items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      variant_id: i.variant_id ?? null,
      quantity: i.quantity,
      price: i.price,
      total: i.total,
      title: i.title,
      variant_title: i.variant_title ?? null,
      image_url: i.image_url ?? null,
    })),
  )
  if (itemsError) return { error: 'Could not create order items', status: 500 }

  return { error: null, orderNumber: order.order_number, total }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/storefront && npx tsx lib/orders.test.ts`
Expected: PASS — prints `orders.test.ts: all assertions passed`.

- [ ] **Step 5: Refactor checkout to call the core**

Edit `apps/storefront/app/api/store/[slug]/checkout/route.ts`. Keep the price-authority block (the product/variant fetch + the per-line loop that builds `items` from real rows, currently lines ~72–138) exactly as-is. Add the import at the top (next to the existing imports):

```ts
import { createOrderWithPayment, type OrderLineInput } from '@/lib/orders'
```

Then REPLACE everything from the `const subtotal = items.reduce(...)` line (line ~140) through the final `return NextResponse.json({ orderNumber: order.order_number, total }, ...)` (line ~226) with a delegation to the core. The existing loop built `items` with fields `{ product_id, variant_id, quantity, price, total, title, variant_title, image_url }`; map those to `OrderLineInput` (drop the pre-computed `total` — the core recomputes it identically) and call:

```ts
    const lines: OrderLineInput[] = items.map((i) => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        quantity: i.quantity,
        price: i.price,
        title: i.title,
        variant_title: i.variant_title,
        image_url: i.image_url,
    }))

    const result = await createOrderWithPayment({
        storeId,
        guest: { mpesaPhone: guest.mpesaPhone, email: guest.email, whatsapp: guest.whatsapp },
        lines,
        paymentMethod: method,
        idempotencyKey,
        source: 'storefront',
    })
    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status, headers: noStore })
    }
    return NextResponse.json(
        { orderNumber: result.orderNumber, total: result.total },
        { status: 201, headers: noStore },
    )
```

Note: the core handles idempotency internally, so the checkout's OWN idempotency pre-check (lines ~61–70) becomes redundant — REMOVE it (the `const { data: prior } ...` block and its `if (prior) return ...`), since `createOrderWithPayment` does the same lookup and returns the prior order. The behavior is identical (a repeated key returns the same order number). Everything else in checkout (body parse, validation, `getActiveStoreId`, price authority) stays.

- [ ] **Step 6: Typecheck + build to prove the refactor compiles and preserves checkout**

Run: `cd apps/storefront && npx tsc --noEmit`
Expected: no errors.

Run: `npx turbo run build --filter=@mcloud/storefront`
Expected: build succeeds. (This is the byte-behavior safety net — the route must still compile and build with identical response shapes; Task 7 smoke re-verifies a live purchase.)

- [ ] **Step 7: Commit**

```bash
git add apps/storefront/lib/orders.ts apps/storefront/lib/orders.test.ts "apps/storefront/app/api/store/[slug]/checkout/route.ts"
git commit -m "refactor(storefront): extract createOrderWithPayment core from checkout

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Campaign settings shape + validation helpers

A pure, testable module that defines the campaign shape and validates a donation amount against a campaign. No DB, no Next — so it unit-tests with `tsx` and is reused by `/donate` (Task 3) and the progress reader (Task 5).

**Files:**
- Create: `apps/storefront/lib/campaigns.ts`
- Create (test): `apps/storefront/lib/campaigns.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces (used by Tasks 3, 5, 6):
  ```ts
  export interface Campaign {
    id: string
    title: string
    description?: string
    image?: string
    goalAmount?: number
    presets?: number[]
    allowCustomAmount?: boolean
    minAmount?: number
  }
  export function readCampaigns(settings: unknown): Campaign[]
  export function findCampaign(settings: unknown, campaignId: string): Campaign | null
  export type AmountCheck = { ok: true; amount: number } | { ok: false; error: string }
  export function validateDonationAmount(campaign: Campaign, rawAmount: unknown): AmountCheck
  export function cleanDedication(raw: unknown): string | undefined
  ```

- [ ] **Step 1: Write the failing test**

Create `apps/storefront/lib/campaigns.test.ts`:

```ts
import assert from 'node:assert/strict'
import { readCampaigns, findCampaign, validateDonationAmount, cleanDedication } from './campaigns'

// readCampaigns: tolerant of missing/malformed settings
assert.deepEqual(readCampaigns(null), [])
assert.deepEqual(readCampaigns({}), [])
assert.deepEqual(readCampaigns({ campaigns: 'nope' }), [])
const settings = { campaigns: [
  { id: 'water', title: 'Clean Water', goalAmount: 100000, presets: [500, 1000, 2500], allowCustomAmount: true },
  { id: 'school', title: 'Schooling', presets: [1000], allowCustomAmount: false },
] }
assert.equal(readCampaigns(settings).length, 2)

// findCampaign
assert.equal(findCampaign(settings, 'water')!.title, 'Clean Water')
assert.equal(findCampaign(settings, 'missing'), null)

// validateDonationAmount: allowCustomAmount true -> any amount > 0
const water = findCampaign(settings, 'water')!
assert.deepEqual(validateDonationAmount(water, 750), { ok: true, amount: 750 })
assert.equal(validateDonationAmount(water, 0).ok, false)
assert.equal(validateDonationAmount(water, -5).ok, false)
assert.equal(validateDonationAmount(water, 'abc').ok, false)
assert.equal(validateDonationAmount(water, NaN).ok, false)

// minAmount enforced when set
const waterMin = { ...water, minAmount: 500 }
assert.equal(validateDonationAmount(waterMin, 100).ok, false, 'below min rejected')
assert.equal(validateDonationAmount(waterMin, 500).ok, true, 'at min ok')

// allowCustomAmount false -> amount MUST be one of presets
const school = findCampaign(settings, 'school')!
assert.deepEqual(validateDonationAmount(school, 1000), { ok: true, amount: 1000 })
assert.equal(validateDonationAmount(school, 1500).ok, false, 'non-preset rejected when custom disallowed')

// cleanDedication: trims, caps at 280, drops empties/non-strings
assert.equal(cleanDedication('  In memory of Jane  '), 'In memory of Jane')
assert.equal(cleanDedication(''), undefined)
assert.equal(cleanDedication('   '), undefined)
assert.equal(cleanDedication(42), undefined)
assert.equal(cleanDedication('x'.repeat(400))!.length, 280, 'capped at 280')

console.log('campaigns.test.ts: all assertions passed')
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/storefront && npx tsx lib/campaigns.test.ts`
Expected: FAIL — cannot find module `./campaigns`.

- [ ] **Step 3: Implement `campaigns.ts`**

Create `apps/storefront/lib/campaigns.ts`:

```ts
// lib/campaigns.ts
// Campaign shape + donation-amount validation. Campaigns live in
// stores.settings.campaigns (JSON) — no table. Pure (no DB/Next) so it's
// unit-testable and reused by /donate and the progress reader.

export interface Campaign {
  id: string
  title: string
  description?: string
  image?: string
  goalAmount?: number
  presets?: number[]
  allowCustomAmount?: boolean
  minAmount?: number
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** Read the campaigns array out of a store's settings JSON. Tolerant of junk. */
export function readCampaigns(settings: unknown): Campaign[] {
  if (!isRecord(settings)) return []
  const raw = settings.campaigns
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (c): c is Campaign => isRecord(c) && typeof c.id === 'string' && typeof c.title === 'string',
  )
}

export function findCampaign(settings: unknown, campaignId: string): Campaign | null {
  return readCampaigns(settings).find((c) => c.id === campaignId) ?? null
}

export type AmountCheck = { ok: true; amount: number } | { ok: false; error: string }

/** Validate a donor-supplied amount against a campaign's rules. */
export function validateDonationAmount(campaign: Campaign, rawAmount: unknown): AmountCheck {
  const amount = Number(rawAmount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Enter a valid donation amount.' }
  }
  if (typeof campaign.minAmount === 'number' && amount < campaign.minAmount) {
    return { ok: false, error: `Minimum donation is ${campaign.minAmount}.` }
  }
  if (campaign.allowCustomAmount === false) {
    const presets = Array.isArray(campaign.presets) ? campaign.presets : []
    if (!presets.includes(amount)) {
      return { ok: false, error: 'Please choose one of the suggested amounts.' }
    }
  }
  return { ok: true, amount }
}

/** Trim + cap a dedication note; undefined when empty/non-string. */
export function cleanDedication(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, 280)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/storefront && npx tsx lib/campaigns.test.ts`
Expected: PASS — prints `campaigns.test.ts: all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/lib/campaigns.ts apps/storefront/lib/campaigns.test.ts
git commit -m "feat(storefront): campaign shape + donation-amount validation helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `/donate` endpoint

A route handler that validates the campaign + donor amount (via Task 2), builds one donation line, and creates a tagged donation order (via Task 1's core).

**Files:**
- Create: `apps/storefront/app/api/store/[slug]/donate/route.ts`
- Create (test): `apps/storefront/app/api/store/[slug]/donate/donate-logic.test.ts` (pure validation-flow test — see Step 1)

**Interfaces:**
- Consumes: `getActiveStoreId` (from `@/lib/customer-auth`), `createClient` (`@mcloud/db/server`), `findCampaign`/`validateDonationAmount`/`cleanDedication` (Task 2), `createOrderWithPayment`/`OrderLineInput` (Task 1).
- Produces: `POST /api/store/[slug]/donate` → `{ orderNumber, total }` (201) | `{ error }` (400/404/500). Body: `{ campaignId, amount, guest:{mpesaPhone?,email?,whatsapp?}, paymentMethod, idempotencyKey, dedication? }`.

- [ ] **Step 1: Write the failing test for the pure request-shaping logic**

The route's DB calls are covered by Task 7 smoke; unit-test the pure logic that turns a validated campaign+amount into the donation line + metadata, so its shape is locked. Create `apps/storefront/app/api/store/[slug]/donate/donate-logic.test.ts`:

```ts
import assert from 'node:assert/strict'
import { buildDonationLine, buildDonationMetadata } from './donate-logic'

const campaign = { id: 'water', title: 'Clean Water', image: 'https://x/w.jpg' }

// donation line: single line, no product, price = amount, qty 1
const line = buildDonationLine(campaign, 750)
assert.equal(line.product_id, null, 'donation line has no product')
assert.equal(line.price, 750)
assert.equal(line.quantity, 1)
assert.equal(line.title, 'Clean Water')
assert.equal(line.image_url, 'https://x/w.jpg')

// metadata tags the donation + campaign, includes dedication only when present
assert.deepEqual(buildDonationMetadata('water', 'In memory of Jane'), {
  isDonation: true, campaignId: 'water', dedication: 'In memory of Jane',
})
assert.deepEqual(buildDonationMetadata('water', undefined), {
  isDonation: true, campaignId: 'water',
})

console.log('donate-logic.test.ts: all assertions passed')
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/storefront && npx tsx "app/api/store/[slug]/donate/donate-logic.test.ts"`
Expected: FAIL — cannot find module `./donate-logic`.

- [ ] **Step 3: Implement the pure logic module**

Create `apps/storefront/app/api/store/[slug]/donate/donate-logic.ts`:

```ts
// Pure request-shaping for /donate: turn a validated campaign + amount into the
// order line and donation metadata. Kept separate from the route so it's
// unit-testable without a request context.
import type { OrderLineInput } from '@/lib/orders'
import type { Campaign } from '@/lib/campaigns'

export function buildDonationLine(campaign: Campaign, amount: number): OrderLineInput {
  return {
    product_id: null,
    variant_id: null,
    quantity: 1,
    price: amount,
    title: campaign.title,
    variant_title: null,
    image_url: campaign.image ?? null,
  }
}

export function buildDonationMetadata(
  campaignId: string,
  dedication: string | undefined,
): Record<string, unknown> {
  return {
    isDonation: true,
    campaignId,
    ...(dedication ? { dedication } : {}),
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/storefront && npx tsx "app/api/store/[slug]/donate/donate-logic.test.ts"`
Expected: PASS — prints `donate-logic.test.ts: all assertions passed`.

- [ ] **Step 5: Implement the route**

Create `apps/storefront/app/api/store/[slug]/donate/route.ts`:

```ts
// app/api/store/[slug]/donate/route.ts
// Server-authoritative donation. A donation is a checkout with ONE synthetic
// line at the donor-chosen amount, validated against the campaign (which lives
// in stores.settings.campaigns). Reuses the shared order core; the order is
// tagged { isDonation, campaignId, dedication? } with source='donation'. The
// donor then drives the SAME payment steps a purchase uses.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { getActiveStoreId } from '@/lib/customer-auth'
import { findCampaign, validateDonationAmount, cleanDedication } from '@/lib/campaigns'
import { createOrderWithPayment } from '@/lib/orders'
import { buildDonationLine, buildDonationMetadata } from './donate-logic'

const noStore = { 'Cache-Control': 'no-store' }

interface DonateBody {
  campaignId?: string
  amount?: unknown
  guest?: { mpesaPhone?: string; email?: string; whatsapp?: string }
  paymentMethod?: 'mpesa' | 'paypal'
  idempotencyKey?: string
  dedication?: unknown
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let body: DonateBody
  try {
    body = (await req.json()) as DonateBody
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: noStore })
  }

  const campaignId = typeof body.campaignId === 'string' ? body.campaignId : ''
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : ''
  const method = body.paymentMethod === 'paypal' ? 'paypal' : 'mpesa'
  if (!campaignId) return NextResponse.json({ error: 'Missing campaign' }, { status: 400, headers: noStore })
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing idempotency key' }, { status: 400, headers: noStore })

  const storeId = await getActiveStoreId(slug)
  if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: noStore })

  // Load the store's settings to find the campaign (service-role, no anon).
  const admin = await createClient()
  const { data: store } = await admin.from('stores').select('settings').eq('id', storeId).single()
  const campaign = findCampaign(store?.settings, campaignId)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404, headers: noStore })

  const check = validateDonationAmount(campaign, body.amount)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400, headers: noStore })

  const dedication = cleanDedication(body.dedication)
  const result = await createOrderWithPayment({
    storeId,
    guest: body.guest ?? {},
    lines: [buildDonationLine(campaign, check.amount)],
    paymentMethod: method,
    idempotencyKey,
    source: 'donation',
    extraOrderMetadata: buildDonationMetadata(campaignId, dedication),
  })
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status, headers: noStore })
  }
  return NextResponse.json(
    { orderNumber: result.orderNumber, total: result.total },
    { status: 201, headers: noStore },
  )
}
```

- [ ] **Step 6: Typecheck + build**

Run: `cd apps/storefront && npx tsc --noEmit`
Expected: no errors.

Run: `npx turbo run build --filter=@mcloud/storefront`
Expected: build succeeds (the new route compiles).

- [ ] **Step 7: Commit**

```bash
git add "apps/storefront/app/api/store/[slug]/donate/"
git commit -m "feat(storefront): /donate endpoint (validated campaign + amount, tagged order)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `campaigns` Liquid section

A new empty-guarded section rendering each campaign with an optional progress bar and a Donate action. Pure renderer — all data (including the pre-formatted `raised`/`goal` strings and a `percent`) arrives in context; the donate action exposes `data-*` the island reads (Task 6).

**Files:**
- Create: `packages/liquid/themes/classic/sections/campaigns.liquid`
- Modify (regenerate): `packages/liquid/src/themes-manifest.ts`
- Create (test): `packages/liquid/src/campaigns-section.test.ts`

**Interfaces:**
- Consumes: render context `{ store, campaigns }` where `campaigns` is an array of `{ id, title, description?, image?, presets?, allowCustomAmount?, hasGoal (bool), percent (0–100 int), raisedLabel (string), goalLabel (string) }` (the augmented shape Task 5 produces and Task 6's registry passes).
- Produces: `<section class="sf-campaigns ...">` per-campaign markup with a `.sf-donate` action carrying `data-campaign-id`, `data-presets`, `data-allow-custom`; or empty string when `campaigns` is empty.

- [ ] **Step 1: Write the failing test**

Create `packages/liquid/src/campaigns-section.test.ts`:

```ts
import assert from 'node:assert/strict'
import { renderTemplate } from './index'

const store = { name: 'Hope', slug: 'hope', settings: {} }
const campaigns = [
  {
    id: 'water', title: 'Clean Water', description: 'Wells for villages', image: 'https://x/w.jpg',
    presets: [500, 1000], allowCustomAmount: true,
    hasGoal: true, percent: 52, raisedLabel: 'KSh 52,000.00', goalLabel: 'KSh 100,000.00',
  },
  {
    id: 'school', title: 'Schooling', description: '', image: '',
    presets: [1000], allowCustomAmount: false,
    hasGoal: false, percent: 0, raisedLabel: '', goalLabel: '',
  },
]

const html = await renderTemplate('classic/sections/campaigns', { store, campaigns })
assert.ok(html.includes('sf-campaigns'), 'renders the section')
assert.ok(html.includes('Clean Water') && html.includes('Schooling'), 'renders each campaign title')
assert.ok(html.includes('Wells for villages'), 'renders description')
// progress bar only for hasGoal
assert.ok(html.includes('KSh 52,000.00') && html.includes('KSh 100,000.00'), 'renders raised/goal for goaled campaign')
assert.ok(html.includes('width: 52%') || html.includes('width:52%'), 'progress bar width from percent')
// donate action carries data-* for the island
assert.ok(html.includes('data-campaign-id="water"'), 'donate action has campaign id')
assert.ok(html.includes('data-allow-custom="true"'), 'water allows custom')
assert.ok(html.includes('data-allow-custom="false"'), 'school disallows custom')
assert.ok(html.includes('sf-donate'), 'donate action present')

// empty guard: no campaigns -> nothing
const empty = await renderTemplate('classic/sections/campaigns', { store, campaigns: [] })
assert.ok(!empty.includes('sf-campaigns'), 'empty campaigns renders nothing')

console.log('campaigns-section.test.ts: all assertions passed')
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/liquid && npx tsx src/campaigns-section.test.ts`
Expected: FAIL — template `classic/sections/campaigns` not in the manifest.

- [ ] **Step 3: Write the template**

Create `packages/liquid/themes/classic/sections/campaigns.liquid`:

```liquid
{%- if campaigns and campaigns.size > 0 -%}
<section class="sf-campaigns py-16 md:py-24">
  <div class="container mx-auto max-w-5xl px-6">
    <div class="mb-10 md:mb-14 text-center">
      <span class="sf-badge-outline inline-flex items-center border px-2.5 py-0.5 text-xs font-medium mb-3">
        Campaigns
      </span>
      <h2 class="sf-heading text-3xl md:text-4xl font-light tracking-tight">Support a Cause</h2>
    </div>
    <div class="space-y-8">
      {%- for c in campaigns -%}
        <article class="sf-card sf-campaign-card overflow-hidden md:flex">
          {%- if c.image -%}
            <div class="relative sf-bg-muted md:w-2/5" style="aspect-ratio: 16/9">
              <img src="{{ c.image }}" alt="{{ c.title }}" loading="lazy" class="absolute inset-0 w-full h-full object-cover">
            </div>
          {%- endif -%}
          <div class="p-5 md:flex-1 space-y-3">
            <h3 class="sf-heading text-2xl font-light">{{ c.title }}</h3>
            {%- if c.description -%}
              <p class="text-sm" style="color: var(--sf-foreground-subtle)">{{ c.description }}</p>
            {%- endif -%}
            {%- if c.hasGoal -%}
              <div class="sf-campaign-progress space-y-1">
                <div class="w-full h-2 sf-bg-muted overflow-hidden">
                  <div class="sf-campaign-bar h-full" style="width: {{ c.percent }}%"></div>
                </div>
                <div class="flex justify-between text-xs" style="color: var(--sf-foreground-subtle)">
                  <span>{{ c.raisedLabel }} raised</span>
                  <span>of {{ c.goalLabel }}</span>
                </div>
              </div>
            {%- endif -%}
            <button
              class="sf-btn-primary sf-donate border rounded-none px-6 py-2.5 text-sm font-medium"
              data-campaign-id="{{ c.id }}"
              data-campaign-title="{{ c.title }}"
              data-presets="{{ c.presets | join: ',' }}"
              data-allow-custom="{% if c.allowCustomAmount == false %}false{% else %}true{% endif %}"
            >
              Donate
            </button>
          </div>
        </article>
      {%- endfor -%}
    </div>
  </div>
</section>
{%- endif -%}
```

- [ ] **Step 4: Regenerate the Liquid manifest**

Run: `cd packages/liquid && node scripts/build-manifest.mjs`
Expected: prints `Generated themes-manifest with N templates.` (N one higher than before — the `campaigns` key is now bundled).

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/liquid && npx tsx src/campaigns-section.test.ts`
Expected: PASS — prints `campaigns-section.test.ts: all assertions passed`.

- [ ] **Step 6: Add the progress-bar color rule to storefront CSS**

The `sf-campaign-bar` class needs a fill color. Edit `apps/storefront/app/store/[slug]/storefront.css`, adding after the `.sf-link` rules (near the NGO section rules added in SP3):

```css
/* Campaign goal progress bar fill */
.sf-campaign-bar {
    background-color: var(--sf-primary);
}
```

- [ ] **Step 7: Commit**

```bash
git add packages/liquid/themes/classic/sections/campaigns.liquid packages/liquid/src/themes-manifest.ts packages/liquid/src/campaigns-section.test.ts "apps/storefront/app/store/[slug]/storefront.css"
git commit -m "feat(liquid): campaigns section with goal progress bar + donate action

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Campaign progress reader

Given a store id + its settings, return each campaign augmented with a server-computed `raised` total and the pre-formatted display fields the Liquid section needs. This is the read side of the goal bar.

**Files:**
- Modify: `apps/storefront/lib/campaigns.ts` (add the reader + augmenter)
- Modify (test): `apps/storefront/lib/campaigns.test.ts` (add augmenter assertions)

**Interfaces:**
- Consumes: `readCampaigns` (Task 2), `formatKES` (`@/lib/currency`), `createClient` (`@mcloud/db/server`).
- Produces (used by Task 6):
  ```ts
  export interface AugmentedCampaign {
    id: string; title: string; description?: string; image?: string
    presets?: number[]; allowCustomAmount?: boolean
    hasGoal: boolean; percent: number; raisedLabel: string; goalLabel: string
  }
  export function augmentCampaigns(campaigns: Campaign[], raisedById: Record<string, number>): AugmentedCampaign[]
  export async function loadCampaignsWithProgress(storeId: string, settings: unknown): Promise<AugmentedCampaign[]>
  ```

- [ ] **Step 1: Add the failing test for the pure augmenter**

Append to `apps/storefront/lib/campaigns.test.ts` (before the final `console.log`, and update that line to `all assertions passed` if not already):

```ts
import { augmentCampaigns } from './campaigns'

// augmentCampaigns: computes percent + formatted labels; caps percent at 100
const aug = augmentCampaigns(
  [
    { id: 'water', title: 'Clean Water', goalAmount: 100000, presets: [500], allowCustomAmount: true },
    { id: 'over', title: 'Over', goalAmount: 1000 },
    { id: 'nogoal', title: 'No Goal' },
  ],
  { water: 52000, over: 5000, nogoal: 999 },
)
const water = aug.find((c) => c.id === 'water')!
assert.equal(water.hasGoal, true)
assert.equal(water.percent, 52, 'percent = round(raised/goal*100)')
assert.equal(water.raisedLabel, 'KSh 52,000.00')
assert.equal(water.goalLabel, 'KSh 100,000.00')
const over = aug.find((c) => c.id === 'over')!
assert.equal(over.percent, 100, 'percent capped at 100 when raised exceeds goal')
const nogoal = aug.find((c) => c.id === 'nogoal')!
assert.equal(nogoal.hasGoal, false, 'no goalAmount -> no progress bar')
assert.equal(nogoal.percent, 0)
```

Update the final line to `console.log('campaigns.test.ts: all assertions passed')` if the earlier Task-2 version printed a different message (keep a single final log).

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/storefront && npx tsx lib/campaigns.test.ts`
Expected: FAIL — `augmentCampaigns` is not exported.

- [ ] **Step 3: Implement the augmenter + reader**

Append to `apps/storefront/lib/campaigns.ts`:

```ts
import { formatKES } from './currency'
import { createClient } from '@mcloud/db/server'

export interface AugmentedCampaign {
  id: string
  title: string
  description?: string
  image?: string
  presets?: number[]
  allowCustomAmount?: boolean
  hasGoal: boolean
  percent: number
  raisedLabel: string
  goalLabel: string
}

/** Attach progress display fields to campaigns from a raised-by-id map. Pure. */
export function augmentCampaigns(
  campaigns: Campaign[],
  raisedById: Record<string, number>,
): AugmentedCampaign[] {
  return campaigns.map((c) => {
    const raised = raisedById[c.id] ?? 0
    const goal = typeof c.goalAmount === 'number' && c.goalAmount > 0 ? c.goalAmount : 0
    const hasGoal = goal > 0
    const percent = hasGoal ? Math.min(100, Math.round((raised / goal) * 100)) : 0
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      image: c.image,
      presets: c.presets,
      allowCustomAmount: c.allowCustomAmount,
      hasGoal,
      percent,
      raisedLabel: hasGoal ? formatKES(raised) : '',
      goalLabel: hasGoal ? formatKES(goal) : '',
    }
  })
}

/**
 * Load a store's campaigns augmented with each one's raised total. Sums the
 * `total` of orders tagged with the campaignId whose payment completed. A read
 * failure defaults raised to 0 (the home render must never break on reporting).
 */
export async function loadCampaignsWithProgress(
  storeId: string,
  settings: unknown,
): Promise<AugmentedCampaign[]> {
  const campaigns = readCampaigns(settings)
  if (campaigns.length === 0) return []

  const raisedById: Record<string, number> = {}
  try {
    const admin = await createClient()
    const { data } = await admin
      .from('orders')
      .select('total, metadata')
      .eq('store_id', storeId)
      .eq('metadata->>isDonation', 'true')
      .eq('metadata->>payment_status', 'completed')
    for (const row of data ?? []) {
      const md = (row.metadata ?? {}) as Record<string, unknown>
      const id = typeof md.campaignId === 'string' ? md.campaignId : null
      if (id) raisedById[id] = (raisedById[id] ?? 0) + Number(row.total ?? 0)
    }
  } catch (err) {
    console.error('[storefront] campaign progress read failed (defaulting to 0):', err)
  }
  return augmentCampaigns(campaigns, raisedById)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/storefront && npx tsx lib/campaigns.test.ts`
Expected: PASS — prints `campaigns.test.ts: all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/lib/campaigns.ts apps/storefront/lib/campaigns.test.ts
git commit -m "feat(storefront): campaign progress reader (sum completed donations per campaign)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Wire `campaigns` into the registry, vertical, and NGO home

Register the `campaigns` section type, add it to the NGO home section list, and pass the augmented campaigns list into the render context so the section receives it.

**Files:**
- Modify: `apps/storefront/lib/sections.ts`
- Modify (test): `apps/storefront/lib/sections.test.ts`
- Modify: `packages/verticals/src/index.ts`
- Modify (test): `packages/verticals/src/index.test.ts`
- Modify: `apps/storefront/app/store/[slug]/page.tsx`

**Interfaces:**
- Consumes: `loadCampaignsWithProgress` (Task 5).
- Produces: `SECTION_REGISTRY.campaigns` → `{ templateKey: 'classic/sections/campaigns', pickContext: (ctx) => ({ store: ctx.store, campaigns: ctx.campaigns }) }`; `PageRenderContext` gains `campaigns: unknown[]`; NGO `defaultPages[0].sections` = `[mission, programs, impact, campaigns, contact]`.

- [ ] **Step 1: Update the vertical test (failing) + registry test (failing)**

In `packages/verticals/src/index.test.ts`, update the NGO home assertion (currently expects `['mission','programs','impact','contact']`) to include `campaigns`:

```ts
assert.deepEqual(ngoHome.sections.map(s => s.type), ['mission', 'programs', 'impact', 'campaigns', 'contact'])
```

In `apps/storefront/lib/sections.test.ts`, add (near the other NGO registry assertions):

```ts
assert.equal(SECTION_REGISTRY.campaigns.templateKey, 'classic/sections/campaigns')
assert.deepEqual(Object.keys(SECTION_REGISTRY.campaigns.pickContext({
  store: { slug: 's' }, products: [], collections: [], featuredProducts: [], campaigns: [{ id: 'c1' }],
} as any)).sort(), ['campaigns', 'store'])
assert.deepEqual(defaultHomeSections('ngo').map(s => s.type), ['mission', 'programs', 'impact', 'campaigns', 'contact'])
```

- [ ] **Step 2: Run both tests to verify they fail**

Run: `cd packages/verticals && npx tsx src/index.test.ts`
Expected: FAIL — NGO sections list doesn't include `campaigns` yet.

Run: `cd apps/storefront && npx tsx lib/sections.test.ts`
Expected: FAIL — `SECTION_REGISTRY.campaigns` undefined.

- [ ] **Step 3: Add `campaigns` to the vertical**

Edit `packages/verticals/src/index.ts` — in `VERTICALS.ngo.defaultPages[0].sections`, insert `{ type: 'campaigns' }` between `impact` and `contact`:

```ts
      sections: [{ type: 'mission' }, { type: 'programs' }, { type: 'impact' }, { type: 'campaigns' }, { type: 'contact' }],
```

- [ ] **Step 4: Register the section + extend the context type**

Edit `apps/storefront/lib/sections.ts`:

Extend `SectionType`:
```ts
export type SectionType =
  | 'hero' | 'collections' | 'featured' | 'all-products'
  | 'mission' | 'programs' | 'impact' | 'contact' | 'campaigns'
```

Add `campaigns` to `PageRenderContext`:
```ts
export interface PageRenderContext {
  store: unknown
  products: unknown[]
  collections: unknown[]
  featuredProducts: unknown[]
  campaigns: unknown[]
}
```

Add the registry entry (after `contact`):
```ts
  campaigns: {
    templateKey: 'classic/sections/campaigns',
    pickContext: (ctx) => ({ store: ctx.store, campaigns: ctx.campaigns }),
  },
```

- [ ] **Step 5: Run both tests to verify they pass**

Run: `cd packages/verticals && npx tsx src/index.test.ts`
Expected: PASS.

Run: `cd apps/storefront && npx tsx lib/sections.test.ts`
Expected: PASS.

- [ ] **Step 6: Pass the augmented campaigns into the home render context**

Edit `apps/storefront/app/store/[slug]/page.tsx`. Add the import:
```ts
import { loadCampaignsWithProgress } from '@/lib/campaigns'
```

In the `try` block that builds the Liquid context (where `buildHomeContext({ store, products, collections, featuredProducts })` is called), load campaigns and add them to the context. `buildHomeContext` returns a `HomeContext extends Record<string, unknown>`, so attach `campaigns` to the object passed to `renderPage`. Change:

```ts
        const context = buildHomeContext({ store, products, collections, featuredProducts: ... })
```
to:
```ts
        const campaigns = await loadCampaignsWithProgress(store.id, rawStore.settings)
        const context = { ...buildHomeContext({ store, products, collections, featuredProducts: featured.length > 0 ? featured : products.slice(0, 8) }), campaigns }
```

(`rawStore.settings` is the raw settings JSON — `loadCampaignsWithProgress` reads `campaigns` from it. `store.id` is the cast store's id, identical to `rawStore.id`.) `renderPage(sections, context)` then flows `campaigns` to the registry's `pickContext`.

- [ ] **Step 7: Regenerate manifest guard + typecheck + build**

The manifest already includes `campaigns` from Task 4. Typecheck and build:

Run: `cd apps/storefront && npx tsc --noEmit`
Expected: no errors.

Run: `npx turbo run build --filter=@mcloud/verticals --filter=@mcloud/storefront`
Expected: builds succeed.

- [ ] **Step 8: Commit**

```bash
git add apps/storefront/lib/sections.ts apps/storefront/lib/sections.test.ts packages/verticals/src/index.ts packages/verticals/src/index.test.ts "apps/storefront/app/store/[slug]/page.tsx"
git commit -m "feat(storefront): wire campaigns section into NGO home (registry + vertical + context)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Donate client island

A client component activated by the `campaigns` section's `.sf-donate` buttons: collects amount (preset/custom) + guest details + dedication, posts to `/donate`, then drives the existing payment flow against the returned order.

**Files:**
- Create: `apps/storefront/app/store/[slug]/DonateIsland.tsx`
- Modify: `apps/storefront/app/store/[slug]/page.tsx` (mount the island on NGO stores)
- Create (test): `apps/storefront/app/store/[slug]/donate-island-logic.test.ts` (pure amount/payload logic)

**Interfaces:**
- Consumes: `/donate` endpoint (Task 3), the existing payment integrations fetch (`/store/[slug]/integrations`) + M-Pesa/PayPal steps the cart uses.
- Produces: a mounted client island that listens for clicks on `[data-campaign-id]` buttons and opens a donate modal.

**Note on payment reuse (Open Item 2 resolved):** the donate island reuses the SAME downstream payment mechanism the cart uses today — after `/donate` returns `{ orderNumber }`, it triggers the store's configured provider (M-Pesa STK push via the web payments API / manual M-Pesa code / PayPal) exactly as `CartPage` does. The island does NOT reimplement provider logic; it collects amount+guest, calls `/donate`, then hands `orderNumber` to the existing payment step. Because that provider-trigger code currently lives inside the cart flow, this task extracts the minimal shared trigger (or imports the existing one) rather than duplicating it — the implementer confirms the exact reuse against `cart/page.tsx` + `@mcloud/themes/classic/CartPage` during Step 5 and keeps provider logic single-sourced.

- [ ] **Step 1: Write the failing test for the pure payload/amount logic**

Create `apps/storefront/app/store/[slug]/donate-island-logic.test.ts`:

```ts
import assert from 'node:assert/strict'
import { resolveAmount, buildDonatePayload } from './donate-island-logic'

// resolveAmount: preset selection wins; custom used when preset is null
assert.equal(resolveAmount({ preset: 1000, custom: '' }), 1000)
assert.equal(resolveAmount({ preset: null, custom: '750' }), 750)
assert.equal(resolveAmount({ preset: null, custom: 'abc' }), null, 'non-numeric custom -> null')
assert.equal(resolveAmount({ preset: null, custom: '0' }), null, 'zero -> null')
assert.equal(resolveAmount({ preset: null, custom: '' }), null, 'nothing -> null')

// buildDonatePayload: shapes the /donate body, omitting empty dedication
const p = buildDonatePayload({
  campaignId: 'water', amount: 1000, email: 'a@b.com', phone: '0712',
  paymentMethod: 'mpesa', idempotencyKey: 'k1', dedication: '  hi  ',
})
assert.equal(p.campaignId, 'water')
assert.equal(p.amount, 1000)
assert.equal(p.guest.email, 'a@b.com')
assert.equal(p.guest.mpesaPhone, '0712')
assert.equal(p.paymentMethod, 'mpesa')
assert.equal(p.idempotencyKey, 'k1')
assert.equal(p.dedication, 'hi')
const p2 = buildDonatePayload({ campaignId: 'x', amount: 5, email: '', phone: '', paymentMethod: 'paypal', idempotencyKey: 'k', dedication: '' })
assert.equal('dedication' in p2, false, 'empty dedication omitted')

console.log('donate-island-logic.test.ts: all assertions passed')
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/storefront && npx tsx "app/store/[slug]/donate-island-logic.test.ts"`
Expected: FAIL — cannot find module `./donate-island-logic`.

- [ ] **Step 3: Implement the pure logic module**

Create `apps/storefront/app/store/[slug]/donate-island-logic.ts`:

```ts
// Pure amount-resolution + payload-shaping for the donate island. Separated
// from the React component so it unit-tests without a DOM.
export function resolveAmount(input: { preset: number | null; custom: string }): number | null {
  if (typeof input.preset === 'number' && input.preset > 0) return input.preset
  const n = Number(input.custom)
  return Number.isFinite(n) && n > 0 ? n : null
}

export interface DonatePayload {
  campaignId: string
  amount: number
  guest: { email?: string; mpesaPhone?: string }
  paymentMethod: 'mpesa' | 'paypal'
  idempotencyKey: string
  dedication?: string
}

export function buildDonatePayload(input: {
  campaignId: string; amount: number; email: string; phone: string
  paymentMethod: 'mpesa' | 'paypal'; idempotencyKey: string; dedication: string
}): DonatePayload {
  const dedication = input.dedication.trim()
  return {
    campaignId: input.campaignId,
    amount: input.amount,
    guest: { ...(input.email ? { email: input.email } : {}), ...(input.phone ? { mpesaPhone: input.phone } : {}) },
    paymentMethod: input.paymentMethod,
    idempotencyKey: input.idempotencyKey,
    ...(dedication ? { dedication } : {}),
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/storefront && npx tsx "app/store/[slug]/donate-island-logic.test.ts"`
Expected: PASS — prints `donate-island-logic.test.ts: all assertions passed`.

- [ ] **Step 5: Implement the island component**

Create `apps/storefront/app/store/[slug]/DonateIsland.tsx` — a `'use client'` component that: on mount, attaches a click listener to `document` for `[data-campaign-id]` (the section's Donate buttons); opens a modal reading the button's `data-presets`/`data-allow-custom`/`data-campaign-title`; renders preset buttons + (if allowed) a custom amount input, guest email/phone, an optional dedication field, and a payment-method choice; on submit, computes the amount via `resolveAmount`, builds the body via `buildDonatePayload`, `POST`s to `/api/store/{slug}/donate`, and on success drives the existing payment step for `orderNumber`.

Reuse the store's payment integration exactly as the cart does — fetch `/store/{slug}/integrations` for the configured providers and trigger the SAME M-Pesa STK / manual-code / PayPal step the cart uses (import the existing trigger; do not duplicate provider logic). Match the `sf-*` styling and the `storefront.css` classes so the modal is on-theme. Full provider-trigger wiring is confirmed against `apps/storefront/app/store/[slug]/cart/page.tsx` and `@mcloud/themes/classic/CartPage` during implementation; if the trigger isn't cleanly importable, extract it into a shared `apps/storefront/lib/payment-trigger.ts` used by both cart and donate (single-source), and note that extraction in the task report.

Generate a fresh `idempotencyKey` per open (e.g. `crypto.randomUUID()`), so a resubmit of the same modal dedupes but a new donation gets a new key.

- [ ] **Step 6: Mount the island on NGO stores**

Edit `apps/storefront/app/store/[slug]/page.tsx`. After the `renderPage` result div, mount the island when the store is an NGO (so its listener is present for the section's buttons). Since the home render returns a single element, wrap it with the island for NGO stores:

```tsx
import { getVertical } from '@mcloud/verticals'
import { DonateIsland } from './DonateIsland'
// ...
        const html = await renderPage(sections, context)
        const isNgo = getVertical(rawStore.type as string | null | undefined).id === 'ngo'
        return (
            <>
                <div data-liquid suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />
                {isNgo ? <DonateIsland slug={slug} /> : null}
            </>
        )
```

- [ ] **Step 7: Typecheck + build**

Run: `cd apps/storefront && npx tsc --noEmit`
Expected: no errors.

Run: `npx turbo run build --filter=@mcloud/storefront`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add "apps/storefront/app/store/[slug]/DonateIsland.tsx" "apps/storefront/app/store/[slug]/donate-island-logic.ts" "apps/storefront/app/store/[slug]/donate-island-logic.test.ts" "apps/storefront/app/store/[slug]/page.tsx"
git commit -m "feat(storefront): donate island (amount + guest + dedication -> /donate -> payment)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Full-suite verification + manual donation smoke

Runs every SP4 + SP3 test, a full build, and a manual smoke: a campaign renders with a progress bar, a donation creates a tagged order, the bar reflects a completed donation, custom-amount rules are enforced, and a shop purchase still works (regression).

**Files:** none created/modified (verification only). May add a campaign to the existing `spiritbulb-foundation` NGO store's settings via tooling, and create a test donation — noted as cleanup.

- [ ] **Step 1: Run every unit/Liquid test**

Run:
```bash
cd apps/storefront && npx tsx lib/orders.test.ts && npx tsx lib/campaigns.test.ts && npx tsx lib/sections.test.ts && npx tsx "app/api/store/[slug]/donate/donate-logic.test.ts" && npx tsx "app/store/[slug]/donate-island-logic.test.ts"
cd ../../packages/liquid && npx tsx src/campaigns-section.test.ts && npx tsx src/ngo-sections.test.ts && npx tsx src/sections-parity.test.ts && npx tsx src/index.test.ts
cd ../verticals && npx tsx src/index.test.ts
```
Expected: each prints its `all assertions passed` / success line.

- [ ] **Step 2: Full build**

Run: `npx turbo run build --filter=@mcloud/liquid --filter=@mcloud/verticals --filter=@mcloud/storefront --filter=@mcloud/web`
Expected: all build successfully (liquid/verticals have no build step and are skipped; storefront + web build).

- [ ] **Step 3: Add a campaign to the NGO test store**

Add a campaign with a goal + presets to `spiritbulb-foundation`'s settings (the store created earlier this branch), via tooling/SQL. Set `settings.campaigns = [{ id:'devices', title:'Devices for Schools', description:'Get laptops into classrooms', goalAmount:100000, presets:[500,1000,5000], allowCustomAmount:true, image:'' }]` (merge into existing settings; do not drop mission/programs/impact/contact).

- [ ] **Step 4: Smoke the campaigns section render**

Start the storefront dev server (kill any stale server on the port first; run `cd apps/storefront && npm run dev` — it binds its configured port). Load `/store/spiritbulb-foundation`.
Expected: the campaigns section renders with the "Devices for Schools" card, a progress bar at 0% (no completed donations yet, `KSh 0.00 raised of KSh 100,000.00`), preset buttons, and a Donate button. 0 hydration errors.

- [ ] **Step 5: Smoke a donation → tagged order**

Click Donate, choose a preset (e.g. 1000), enter a guest phone/email, submit. (Payment provider may be sandbox/unconfigured on dev — the goal is that `/donate` creates the order; complete or simulate the provider step if configured.) Verify via DB that an `orders` row exists with `source='donation'`, `metadata->>isDonation='true'`, `metadata->>campaignId='devices'`, `total=1000`, and an `order_items` row with `product_id=null`, `title='Devices for Schools'`, `price=1000`.

- [ ] **Step 6: Smoke the progress bar after a completed donation**

Mark the test donation order completed (set `metadata.payment_status='completed'` — simulating the callback). Reload `/store/spiritbulb-foundation`.
Expected: the progress bar reflects the raised amount (`KSh 1,000.00 raised of KSh 100,000.00`, ~1%).

- [ ] **Step 7: Smoke the custom-amount guard**

Set the campaign's `allowCustomAmount:false` (keep `presets:[500,1000,5000]`). Attempt a donation of a non-preset amount (e.g. 777) — the `/donate` endpoint must reject it (400 "Please choose one of the suggested amounts."). A preset amount still succeeds.

- [ ] **Step 8: Shop purchase regression**

On a shop store (e.g. `locd26`), add a product to cart and run the existing checkout to the point of order creation (sandbox payment ok). Verify a normal `orders` row is created with `source='storefront'` and correct product-priced totals — confirming the Task 1 refactor didn't change purchase behavior. 0 hydration errors.

- [ ] **Step 9: Clean up test data**

Delete the test donation order(s) + their `order_items`; restore the `spiritbulb-foundation` campaign to whatever final state you want (or remove the test campaign). Restore any shop test order if created. Stop the dev server.

- [ ] **Step 10: Final commit (only if verification scaffolding was added)**

Verification produces no production changes; nothing to commit unless a tooling script was added. If so, commit it; otherwise done.

---

## Self-Review

**1. Spec coverage:**
- Campaigns in `stores.settings.campaigns` (spec §1, §3) → Task 2 (`readCampaigns`/`findCampaign`). ✓
- `campaigns` Liquid section, empty-guarded, sf-* , progress bar, donate action (§3.4) → Task 4. ✓
- `/donate` endpoint validating campaign + amount, tagged order (§3.3) → Task 3, using Task 1 core + Task 2 validation. ✓
- Shared order core extracted from checkout, purchase invariant preserved (§3.1, §3.2) → Task 1. ✓
- Payment rails reused unchanged; donation order drives existing steps (§3.5) → Task 7 (island) + core's provider-agnostic order. ✓
- Goal progress bar = sum of completed donations per campaign (§1, §3.6) → Task 5 (`loadCampaignsWithProgress`) + Task 4 (render). ✓
- Registry + vertical + home wiring (§3.6) → Task 6. ✓
- Dedication note (scope) → Tasks 2 (`cleanDedication`), 3 (metadata), 7 (island field). ✓
- Order tag `{isDonation, campaignId, dedication?}` + `source='donation'` (Global Constraints) → Task 1 core writes `source`/`extraOrderMetadata`; Task 3 supplies them. ✓
- Progress "completed" predicate `metadata->>payment_status='completed'` (§8, Open Item 5) → Task 5 reader. ✓
- Testing (§8): order core/parity (T1), donate validation (T2/T3), campaigns section parity/guard (T4), progress reader (T5), registry/vertical (T6), manual smoke incl. purchase regression (T8). ✓
- Non-goals (recurring, campaign detail route, admin UI, new tables) → not in any task. ✓
- Open Items: 1 (preserve checkout order shape) → Task 1 lifts the insert verbatim; 2 (island payment reuse) → Task 7 note (reuse, don't duplicate); 3 (`getActiveStoreId`, null-phone customer) → Task 3 uses it, core handles null phone; 4 (campaigns position + data-* contract) → Tasks 6 (position) + 4 (data-* locked by test); 5 (completed predicate provider-agnostic) → confirmed in spec, used in Task 5. ✓

**2. Placeholder scan:** No TBD/TODO/"add validation"/"similar to Task N". Every code step shows full code; Task 7 Step 5 (the island UI) is described in prose with the pure logic fully coded and tested — the component is UI glue over the tested `resolveAmount`/`buildDonatePayload` + the existing payment trigger, and the prose names the exact files to reuse; this is the one step where a full literal component would be speculative about the existing payment-trigger internals, so it's scoped as "reuse the cart's trigger, confirm against these files." Acceptable: the testable logic is complete and the reuse target is named.

**3. Type consistency:**
- `OrderLineInput`/`CreateOrderInput`/`createOrderWithPayment`/`buildLineTotals` defined in Task 1, consumed in Tasks 3 (donate) and referenced in 7. ✓
- `Campaign`/`readCampaigns`/`findCampaign`/`validateDonationAmount`/`cleanDedication` defined Task 2; `AugmentedCampaign`/`augmentCampaigns`/`loadCampaignsWithProgress` added Task 5; consumed Tasks 3, 6. ✓
- `buildDonationLine`/`buildDonationMetadata` (Task 3) return `OrderLineInput` / metadata shape used by the core. ✓
- Section `templateKey: 'classic/sections/campaigns'` matches the `.liquid` filename (Task 4) and the registry (Task 6). ✓
- Augmented campaign fields (`hasGoal`, `percent`, `raisedLabel`, `goalLabel`, `presets`, `allowCustomAmount`, `id`, `title`, `description`, `image`) match across Task 5 (producer), Task 4 (Liquid consumer), and Task 4's test fixture. ✓
- `resolveAmount`/`buildDonatePayload`/`DonatePayload` (Task 7) shape the `/donate` body matching Task 3's `DonateBody`. ✓

**One design note carried into the plan:** the checkout route's own idempotency pre-check is removed in Task 1 Step 5 because the extracted core performs the identical lookup — this avoids a double lookup and keeps idempotency single-sourced. Behavior is unchanged (a repeated key returns the same order).
