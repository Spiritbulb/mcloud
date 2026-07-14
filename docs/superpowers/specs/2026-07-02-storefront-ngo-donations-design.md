# NGO Donations (Sub-project 4)

**Date:** 2026-07-02
**Status:** Design approved, ready for implementation plan
**Depends on:** SP3 (per-vertical default template sets — `@mcloud/verticals`, NGO Liquid sections, vertical-aware home) DONE on branch `feat/storefront-liquid-pipeline`. This sub-project continues the same branch.

---

## 0. Context

North star: Liquid renders every vertical; sites are pages made of sections (data); commerce routes stay bespoke; React `classic` retired at the end. SP3 gave an NGO store a real informational home (mission / programs / impact / contact), all content in `stores.settings`, rendered by empty-guarded `sf-*` Liquid sections; `createStoreForUser` seeds a vertical's default pages.

**SP4 (this spec):** let an NGO store define **campaigns** (causes) and accept **real one-off donations** through the existing payment rails, with a goal progress bar and an optional dedication note. A campaign is JSON in `stores.settings.campaigns`; a donation is an `orders` row created by a new `/donate` endpoint that validates the donor-chosen amount and reuses an order-creation core extracted from the existing checkout; a new `campaigns` Liquid section renders campaigns + an inline donate action on the NGO home.

Ordered decomposition: 1) render pipeline (DONE) · 2) pages+sections data model (DONE) · 3) per-vertical default template sets (DONE) · **4) NGO donations (THIS)** · 5) page editor (admin write path + onboarding vertical picker) · 6) retire React.

**Access note:** all storefront `stores`/`orders` access is via the server-side service-role client, per the platform-wide `route_everything_no_anon` decision. SP4 adds no anon table access.

---

## 1. Goal

- NGO stores define **campaigns** in `stores.settings.campaigns` (no new tables): `{ id, title, description, image?, goalAmount?, presets?, allowCustomAmount? }`.
- A new **`campaigns` Liquid section** (empty-guarded, `sf-*` styled, SP3 pattern) renders each campaign on the NGO home with an optional **goal progress bar** and a **Donate** action (preset amounts + optional custom amount).
- A new **`POST /api/store/[slug]/donate`** endpoint validates the campaign and the donor-supplied amount, then creates a donation order via a **shared order-creation core** extracted from the existing checkout route. The order is **tagged** as a donation (`metadata.isDonation`, `metadata.campaignId`, optional `metadata.dedication`; `source='donation'`).
- Donations reuse the **existing M-Pesa / PayPal payment rails** unchanged — a donation order is created the same way a purchase order is, then handed to the same downstream payment steps.
- The **goal progress bar** sums completed donation orders per campaign (`orders` where `metadata->>campaignId` matches and `metadata->>payment_status='completed'`).

**Non-goals:** recurring / monthly giving (future SP — needs provider subscriptions + scheduling); campaign detail pages / new routes (home `campaigns` section only); a merchant admin UI to author campaigns (SP5 — campaigns are set via `settings` for now, like all SP3 NGO content); NGO-specific DB tables; changing the purchase (product) checkout's price-authority behavior.

---

## 2. Current State (grounding)

- **Checkout** `apps/storefront/app/store/[slug]/checkout/route.ts` (`POST`): server-authoritative. It **recomputes every line price from the products/product_variants rows and ignores any client-sent price** (its reason for existing — a client could otherwise pay KES 1 for a KES 50k cart). It then: dedupes on a client `idempotencyKey` (stored in `orders.metadata.idempotency_key`), upserts a guest `customers` row (matched by `mpesa_phone` within the store), inserts an `orders` row (server-generated `order_number`, server-computed `total`, `source='storefront'`, `status='pending'`), inserts `order_items`, and returns `{ orderNumber, total }`. It does NOT itself call the payment provider — the client drives payment against the returned order.
- **Payment rails** (web app, `apps/web/app/api/payments/*`): M-Pesa Daraja STK push + a public callback (`.../mpesa/callback/route.ts`) that, on `ResultCode===0`, updates the order to `status='confirmed'`, `fulfillment_status='paid'`, and `metadata.payment_status='completed'` (plus the receipt). PayPal + a manual M-Pesa-code path also exist. **These are unchanged by SP4** — a donation order flows through them exactly like a purchase order.
- **Schema (existing, no change needed):**
  - `order_items.product_id` is **nullable** (`string | null`) — a donation line can be a real `order_items` row with `product_id: null`, `title = campaign.title`, `price = amount`, `quantity = 1`, `total = amount`.
  - `orders` has `metadata: Json`, `source: string`, `tags: string[]`, `status`, `total`, `subtotal`, `currency` (default per row), `customer_id` (nullable). The callback merges into `metadata`, so donation tags added at creation survive payment.
- **SP3 storefront section system** `apps/storefront/lib/sections.ts`: `SECTION_REGISTRY` maps a section `type` → `{ templateKey, pickContext }`; `defaultHomeSections(storeType)` returns the vertical's Home section list from `@mcloud/verticals`. NGO home currently = `[mission, programs, impact, contact]`. Sections read `store.settings.*` (castStore now carries full settings through — the SP3 fix).
- **NGO home render** `apps/storefront/app/store/[slug]/page.tsx`: builds the Liquid context (`store` with full `settings`, products, collections, featured) and calls `renderPage(sections, ctx)`; the seeded page row or `defaultHomeSections(rawStore.type)` supplies the section list.
- **`@mcloud/verticals`** `packages/verticals/src/index.ts`: `VERTICALS.ngo.defaultPages[0].sections` names the NGO home section types. Adding `campaigns` to the NGO home means adding it here.
- **Campaign authoring:** for now, campaigns are written into `stores.settings.campaigns` directly (SQL / tooling), exactly as SP3 NGO content is authored. No editor UI (SP5).

---

## 3. Architecture

Five units. The one sensitive piece is the checkout refactor (Unit 1); the rest are additive.

### 3.1 Shared order-creation core (`apps/storefront/lib/orders.ts`)

Extract the provider-agnostic tail of the checkout route into one reusable function. **Price authority is NOT moved** — it stays in each caller.

```ts
export interface OrderLineInput {
  product_id: string | null
  variant_id?: string | null
  quantity: number
  price: number          // already authorized by the CALLER
  title: string
  variant_title?: string | null
  image_url?: string | null
}
export interface CreateOrderInput {
  storeId: string
  guest: { mpesaPhone?: string; email?: string; whatsapp?: string }
  lines: OrderLineInput[]           // already priced
  paymentMethod: 'mpesa' | 'paypal'
  idempotencyKey: string
  source: 'storefront' | 'donation'
  extraOrderMetadata?: Record<string, unknown>   // donation tag goes here
}
export type CreateOrderResult =
  | { error: string; status: number }
  | { error: null; orderNumber: string; total: number }

export async function createOrderWithPayment(input: CreateOrderInput): Promise<CreateOrderResult>
```

It owns exactly what both paths share: idempotency dedup (return the prior order unchanged), guest-customer upsert (matched by `mpesa_phone`), `orders` insert (server `order_number`, `total = sum(line.total)`, `source`, merged `metadata` = `{ idempotency_key, payment_method, payment_status:'pending', ...extraOrderMetadata }`), and `order_items` insert. It **never computes or second-guesses a line price** — each caller hands in already-authorized `lines`.

**Boundary invariant:** the purchase path authorizes prices by recomputing from product rows; the donation path authorizes the single line by validating the donor amount against the campaign. The core trusts the caller's prices because each caller owns its own authorization. This keeps the purchase invariant ("client never sets a product price") intact and gives donations their own honest invariant ("amount is donor-chosen, validated against the campaign").

### 3.2 Checkout refactor (`checkout/route.ts`)

Keep the price-authority block (recompute every line from products/variants) verbatim. Replace the customer-upsert + order-insert + order_items-insert + idempotency tail with a single `createOrderWithPayment({ ...priced lines..., source:'storefront' })` call. Behavior is byte-identical; the existing checkout is the refactor's safety net — its current behavior (idempotency, guest upsert, order shape) must be preserved.

### 3.3 `/donate` endpoint (`apps/storefront/app/store/[slug]/donate/route.ts`)

`POST` body: `{ campaignId, amount, guest:{ mpesaPhone?, email?, whatsapp? }, paymentMethod, idempotencyKey, dedication? }`.

Validation, in order (all failures → 400 with a clear message, except store/campaign-missing → 404):
1. Resolve the store (`getActiveStoreId(slug)`); load its `settings.campaigns`; find the campaign with `id === campaignId`. Missing store or campaign → 404.
2. `amount` is a finite number and `> 0` (and `>= minAmount` if the campaign configures one).
3. If `campaign.allowCustomAmount === false`, `amount` MUST equal one of `campaign.presets`. (If `allowCustomAmount` is absent/true, any `amount > 0` is allowed.)
4. Build ONE donation line: `{ product_id: null, quantity: 1, price: amount, total: amount (implicit), title: campaign.title, variant_id: null, image_url: campaign.image ?? null }`.
5. `createOrderWithPayment({ storeId, guest, lines:[line], paymentMethod, idempotencyKey, source:'donation', extraOrderMetadata: { isDonation:true, campaignId, ...(dedication ? { dedication } : {}) } })`.
6. Return `{ orderNumber, total }` (same shape as checkout) so the client can drive the existing payment steps unchanged.

The amount is validated **server-side** here regardless of any client-side check. `dedication` is trimmed and length-capped (e.g. ≤ 280 chars) before storing.

### 3.4 `campaigns` Liquid section (`packages/liquid/themes/classic/sections/campaigns.liquid`)

New section, empty-guarded (SP3 pattern — `{% if campaigns and campaigns.size > 0 %}`, renders nothing when absent/empty), `sf-*` styled, auto-escaped. Per campaign renders: title, description, optional image, an optional **progress bar** (`raised` / `goalAmount` with a formatted "KES X of Y" label — only when `goalAmount > 0`), and a **Donate** action. The donate action exposes the presets and (if allowed) a custom-amount input, wired to the donate island (§3.5) via `data-*` attributes (campaignId, presets, allowCustomAmount, min). The section is a pure renderer — all data (including `raised`) arrives in its context.

Manifest must be regenerated (`node scripts/build-manifest.mjs`) after adding the `.liquid`.

### 3.5 Donate client island (`apps/storefront`)

A small client component that the `campaigns` section's markup activates (progressive-enhancement, like the hero carousel / collections filter scripts, OR a mounted React island — the plan picks the lighter fit given the existing cart/checkout client). It collects: chosen amount (preset button or custom field, validated `> 0` and against `allowCustomAmount`/presets client-side), guest contact (email/phone — reuse the existing `GuestDetails` shape), optional dedication note, and payment method. It `POST`s to `/donate`, then drives the SAME downstream payment flow the cart uses today (STK push / manual M-Pesa code / PayPal) against the returned `orderNumber`. No cart involved — a donation is a single, direct action.

### 3.6 Campaign progress reader + registry wiring

- **Reader** (`apps/storefront/lib/campaigns.ts` or folded into the home route): given a store id and its `settings.campaigns`, return each campaign augmented with `raised` = `sum(orders.total)` where `metadata->>campaignId = campaign.id` AND `metadata->>payment_status = 'completed'` AND `store_id` matches. One grouped query for all campaigns on the page.
- **Registry** (`apps/storefront/lib/sections.ts`): add a `campaigns` entry → `templateKey: 'classic/sections/campaigns'`, `pickContext: (ctx) => ({ store: ctx.store, campaigns: ctx.campaigns })` where `ctx.campaigns` is the progress-augmented list. Extend `SectionType`.
- **Vertical** (`packages/verticals/src/index.ts`): add `{ type: 'campaigns' }` to `VERTICALS.ngo.defaultPages[0].sections` (placement: after `impact`, before `contact`). New NGO stores seed a home that includes campaigns; existing NGO stores' fallback gains it too.
- **Home route** (`page.tsx`): build the augmented campaigns list (via the reader) and pass it into the render context so the registry's `pickContext` can hand it to the section.

---

## 4. Components / Units

| Unit | Location | Responsibility | Depends on |
|---|---|---|---|
| Shared order core | `apps/storefront/lib/orders.ts` | `createOrderWithPayment` — idempotency, guest upsert, order+items insert, from already-priced lines | — |
| Checkout refactor | `apps/storefront/app/store/[slug]/checkout/route.ts` | Keep price authority; delegate order creation to the core | order core |
| `/donate` endpoint | `apps/storefront/app/store/[slug]/donate/route.ts` | Validate campaign + donor amount; create donation order (tagged) via core | order core, campaigns in settings |
| `campaigns.liquid` | `packages/liquid/themes/classic/sections/campaigns.liquid` | Render campaigns + progress bar + donate action; empty-guarded | `sf-*` CSS |
| Progress reader | `apps/storefront/lib/campaigns.ts` | Sum completed donations per campaign | orders schema |
| Registry + vertical + home wiring | `sections.ts`, `packages/verticals`, `page.tsx` | Register `campaigns` type; add to NGO home; pass augmented list into context | `@mcloud/verticals`, progress reader |
| Donate island | `apps/storefront` (client) | Amount + guest + dedication → `/donate` → existing payment steps | `/donate`, existing payment UI |

---

## 5. Data Flow

**Author a campaign:** set `stores.settings.campaigns = [{ id, title, description, goalAmount?, presets?, allowCustomAmount?, image? }]` (SQL/tooling for now; SP5 adds UI).

**Render NGO home with campaigns:** `GET /store/{slug}` → load store (full settings) → progress reader sums completed donations per campaign → `campaigns` augmented with `raised` → `renderPage([mission, programs, impact, campaigns, contact], ctx)` where `ctx.campaigns` is the augmented list → `campaigns.liquid` renders each with progress bar + donate action (empty-guarded → nothing if no campaigns).

**Make a donation:** donor picks campaign + amount (+ optional dedication) in the donate island → `POST /api/store/{slug}/donate { campaignId, amount, guest, paymentMethod, idempotencyKey, dedication? }` → server validates campaign + amount → `createOrderWithPayment({ source:'donation', lines:[{product_id:null, price:amount, qty:1, title:campaign.title}], extraOrderMetadata:{isDonation:true, campaignId, dedication?} })` → returns `{ orderNumber, total }` → island drives existing payment steps (STK push / M-Pesa code / PayPal) → provider callback marks the order `payment_status='completed'` → future progress-bar reads include this donation.

**Purchase (regression):** unchanged — checkout still recomputes prices from product rows and now calls the shared core with `source:'storefront'`.

## 6. Error Handling

- `/donate`: missing store/campaign → 404; non-numeric / `≤ 0` / below-min amount → 400; custom amount when `allowCustomAmount===false` and not a preset → 400. Idempotency-key reuse returns the prior order (via the core) — a double-submit does not double-charge/double-record.
- The order core surfaces provider-agnostic failures (customer/order/items insert) as `{ error, status }`; both callers pass them through.
- `campaigns.liquid` empty-guards: no `settings.campaigns` → the section renders nothing (no empty chrome). A campaign with no `goalAmount` renders without a progress bar (donate action still shown).
- Progress reader is best-effort for display: if the sum query errors, `raised` defaults to `0` (bar hidden or shows 0) — a reporting read must never break the home render.
- The checkout refactor must preserve every existing checkout error/status code.

## 7. Migration & Backwards Compatibility

- **No schema change.** Uses existing `stores.settings`, `orders` (metadata/source), `order_items` (nullable `product_id`), `customers`.
- **Purchase checkout behavior unchanged** — the refactor is a pure extraction; its tests must stay green.
- **Existing NGO store (Spiritbulb Foundation) and future NGO stores** gain the `campaigns` section on their home automatically (via the vertical's default section list + fallback). A store with no `settings.campaigns` shows nothing extra (empty-guard). Shop stores are entirely unaffected (they never render NGO sections).
- **Payment providers unchanged** — donations are orders; the callback/status/code routes treat them identically.

## 8. Testing

- **Order core** (`orders.ts` tsx/unit): given already-priced lines, produces the right order shape (server order_number, total=sum, source, merged metadata incl. extraOrderMetadata); idempotency-key reuse returns the prior order without a second insert. (DB-touching parts verified via manual smoke; the pure shaping/validation logic unit-tested.)
- **Checkout parity**: the existing checkout tests still pass after the refactor (byte-identical behavior — same order shape, same idempotency, same error codes).
- **`/donate` validation** (unit against the validation logic): campaign-not-found → 404; amount `≤ 0`/non-numeric → 400; `allowCustomAmount:false` + non-preset → 400; valid custom amount when allowed → passes; the donation line is `{product_id:null, price:amount, qty:1, title:campaign.title}` and the order carries `{isDonation:true, campaignId, dedication?}` + `source:'donation'`.
- **`campaigns.liquid` parity/guard** (liquid tsx test): renders each campaign's title/description; renders a progress bar only when `goalAmount>0` with the correct raised/goal label; renders the donate action with presets; empty `campaigns` → renders nothing.
- **Progress reader** (unit/integration): sums only `payment_status='completed'` orders matching `campaignId` + store; pending/failed donations excluded; unknown campaign → 0.
- **Registry / vertical**: `campaigns` type maps to the template key with `{store, campaigns}` pickContext; NGO default home section list includes `campaigns` in the right position; shop unaffected.
- **Manual smoke** (`run-mcloud`): on an NGO store with a campaign (goal + presets), the home renders the campaigns section with a progress bar; a donation via M-Pesa/PayPal creates a `source='donation'` order tagged with the campaignId; after marking it completed, the progress bar reflects the raised amount; `allowCustomAmount:false` rejects a non-preset amount; a shop store checkout still works (purchase regression); 0 hydration errors.

## 9. Out of Scope (this sub-project)

- Recurring / monthly donations (provider subscriptions + scheduling) — a future sub-project.
- Campaign **detail** pages / any new route — home `campaigns` section only.
- Merchant admin UI to author campaigns (vertical picker, campaign editor) — SP5.
- NGO-specific DB tables — campaigns are `stores.settings` JSON; donations are `orders` rows.
- Changing the product purchase checkout's price-authority behavior (it must remain "never trust a client-sent product price").
- Donor accounts / donation history / tax receipts / email confirmations beyond what the existing order flow already sends.
- Multi-currency donation handling beyond the store's existing currency behavior.

## 10. Open Items for the Plan

1. Confirm the exact current checkout order/`order_items` insert fields to preserve them byte-for-byte in `createOrderWithPayment` (the refactor must not alter the purchase order shape). Pin the `subtotal`/`tax`/`shipping`/`discount` values (checkout uses `subtotal=total`, others 0).
2. Confirm the donate island approach: progressive-enhancement script (like hero/collections) vs. a mounted React island reusing the existing cart/checkout payment components. Recommendation for the plan: reuse the existing payment UI/components (M-Pesa/PayPal) so donations share the tested payment steps — decide the lightest wiring that avoids duplicating provider logic.
3. Confirm the `getActiveStoreId(slug)` helper (used by checkout) is the right store resolver for `/donate`, and that donation orders don't need a `customer_id` when the guest has no phone (checkout already handles the null-phone customer case — reuse it via the core).
4. Pin the `campaigns` position in the NGO home section list (spec: after `impact`, before `contact`) and the exact campaign settings keys + `campaigns.liquid` markup/`data-*` contract the donate island reads (parity tests lock them).
5. Progress-bar "completed" definition is `metadata->>payment_status='completed'` — **confirmed provider-agnostic**: the M-Pesa Daraja callback and the PayPal capture route BOTH set `metadata.payment_status='completed'` (+ `status='confirmed'`, `fulfillment_status='paid'`). The plan should confirm the manual M-Pesa-code path sets the same field (or, if it only attaches the code without marking completed, decide whether manually-coded donations count toward the bar — likely yes once an admin confirms; the plan pins this).
