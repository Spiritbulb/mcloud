# SP5 — Vertical-aware merchant admin: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An NGO merchant can author their whole site (mission, programs, impact, contact, campaigns) from the admin with no SQL, sees a nav and Overview that match their vertical, and never reads the word "store".

**Architecture:** The `Vertical` descriptor (`packages/verticals`) already carries `commerce: boolean`. Everything here keys off it. The settings nav becomes a function of the vertical; a new Content page edits `stores.settings` through the **existing** `updateStoreSettings` server action (session-authorized, `canManage`-gated, service-role — no new write path); the Overview swaps commerce tiles for donation tiles when `!commerce`. All list/validation logic is extracted as pure functions so it is testable.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Supabase, Tailwind v4, `node:assert` tests run with `tsx`.

**Spec:** `docs/superpowers/specs/2026-07-14-merchant-vertical-admin-design.md`
**Branch:** `feat/merchant-vertical-admin` (already created, off `main` @ `92bf0c8`)

## Global Constraints

- **Copy-only rename.** Merchant-facing strings say **"site"**, never "store"/"shop". Do **not** rename the `stores` table, `store_id` columns, `[storeSlug]` route segments, `apps/storefront`, `useStoreHref`, or any component filename/identifier. Identifiers keep `store`.
- **No new write path.** All `stores.settings` writes go through `updateStoreSettings(slug, patch)` in `settings/actions.ts`. Do not add anon-key table writes.
- **Gate on `vertical.commerce`, never on `type === 'ngo'`.** A future third vertical must inherit correct behaviour without touching these files.
- **Tests are `node:assert` scripts run with `tsx`**, not vitest. No `describe`/`it` blocks. A test passes by executing without throwing. Run one with: `npx tsx <path>`.
- **Campaign `id` is generated once and never edited.** Orders carry `metadata.campaignId`; changing an id orphans every donation that campaign received.
- **No em dashes in user-facing copy.** Use periods or commas.

---

## File Structure

**Create:**
- `packages/verticals/src/nav.ts` — `sectionsFor(vertical)`, pure, no React.
- `packages/verticals/src/nav.test.ts` — tests for the above.
- `apps/web/lib/content-draft.ts` — pure draft/validation/serialization for the Content editor.
- `apps/web/lib/content-draft.test.ts` — tests for the above.
- `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/content/page.tsx` — server page.
- `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/content/content-client.tsx` — the editor.
- `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/content/campaign-card.tsx` — one campaign row.

**Modify:**
- `packages/verticals/src/index.ts` — re-export `sectionsFor`.
- `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/settings-shell.tsx` — `SECTIONS` → `sectionsFor(vertical)`.
- `apps/web/lib/store-data.ts:161` — **add `type` to the `getStoreOverview` store select** (it currently omits it, so the Overview cannot tell which vertical it is).
- `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/settings-home-client.tsx` — NGO tile variant.
- Route guards on hidden tabs: `settings/products/page.tsx`, `settings/services/page.tsx`, `settings/customers/page.tsx`.

---

## Task 1: `sectionsFor(vertical)` — vertical-aware nav model

**Files:**
- Create: `packages/verticals/src/nav.ts`
- Test: `packages/verticals/src/nav.test.ts`
- Modify: `packages/verticals/src/index.ts`

**Interfaces:**
- Consumes: `Vertical`, `getVertical` from `packages/verticals/src/index.ts`.
- Produces: `sectionsFor(vertical: Vertical): NavSection[]`, and the `NavSection` / `NavTab` types. Task 2 imports `sectionsFor`.

This lives in `packages/verticals` (not the web app) because it is pure data about a vertical, and keeping it out of the React file makes it testable with `tsx`.

- [ ] **Step 1: Write the failing test**

Create `packages/verticals/src/nav.test.ts`:

```ts
import assert from 'node:assert/strict'
import { VERTICALS } from './index'
import { sectionsFor } from './nav'

const shop = sectionsFor(VERTICALS.shop)
const ngo = sectionsFor(VERTICALS.ngo)

const ids = (secs: ReturnType<typeof sectionsFor>) => secs.map((s) => s.id)
const tabIds = (secs: ReturnType<typeof sectionsFor>) => secs.flatMap((s) => s.tabs.map((t) => t.id))

// Shop keeps the commerce surface.
assert.ok(ids(shop).includes('catalog'), 'shop has catalog')
assert.ok(tabIds(shop).includes('products'), 'shop has products')
assert.ok(tabIds(shop).includes('customers'), 'shop has customers')
assert.ok(!tabIds(shop).includes('content'), 'shop has no content tab')

// NGO hides catalog + customers, gains content.
assert.ok(!ids(ngo).includes('catalog'), 'ngo hides catalog')
assert.ok(!tabIds(ngo).includes('products'), 'ngo hides products')
assert.ok(!tabIds(ngo).includes('services'), 'ngo hides services')
assert.ok(!tabIds(ngo).includes('customers'), 'ngo hides customers')
assert.ok(tabIds(ngo).includes('content'), 'ngo has content')

// NGO keeps orders (donations ARE orders) but under a donations group.
assert.ok(tabIds(ngo).includes('orders'), 'ngo keeps orders')
assert.ok(ids(ngo).includes('donations'), 'ngo groups them under donations')

// Both keep the vertical-neutral groups.
for (const secs of [shop, ngo]) {
  assert.ok(ids(secs).includes('site'), 'has site group')
  assert.ok(ids(secs).includes('advanced'), 'has advanced')
  assert.ok(ids(secs).includes('account'), 'has account')
  assert.ok(tabIds(secs).includes('home'), 'has overview')
  assert.ok(tabIds(secs).includes('general'), 'has general')
  assert.ok(tabIds(secs).includes('appearance'), 'has design')
}

// Copy rule: no merchant-facing label says Store or Shop.
for (const secs of [shop, ngo]) {
  for (const s of secs) {
    assert.ok(!/store|shop/i.test(s.label), `group label "${s.label}" must not say store/shop`)
    for (const t of s.tabs) {
      assert.ok(!/store|shop/i.test(t.label), `tab label "${t.label}" must not say store/shop`)
    }
  }
}

console.log('nav.test.ts OK')
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx packages/verticals/src/nav.test.ts`
Expected: FAIL — `Cannot find module './nav'`.

- [ ] **Step 3: Implement `sectionsFor`**

Create `packages/verticals/src/nav.ts`:

```ts
// Nav model for the merchant admin, derived from the vertical. Pure data (no
// React) so it is unit-testable and so the web app is not the only consumer.
//
// Gate on vertical.commerce, never on id === 'ngo': a future vertical must
// inherit correct behaviour without editing this file.

import type { Vertical } from './index'

export type NavSubTab = { readonly id: string; readonly label: string }

export type NavTab = {
  readonly id: string
  readonly label: string
  readonly icon: string
  readonly beta?: boolean
  readonly pro?: boolean
  readonly subTabs?: readonly NavSubTab[]
}

export type NavSection = {
  readonly id: string
  readonly label: string
  readonly tabs: readonly NavTab[]
}

/** Groups every vertical shows, in order, around the vertical-specific middle. */
const SITE: NavSection = {
  id: 'site',
  label: 'Site',
  tabs: [
    { id: 'home', label: 'Overview', icon: 'home' },
    { id: 'general', label: 'General', icon: 'storefront' },
    { id: 'appearance', label: 'Design', icon: 'dashboard_customize' },
  ],
}

const ADVANCED: NavSection = {
  id: 'advanced',
  label: 'Advanced',
  tabs: [
    { id: 'members', label: 'Members', icon: 'group', pro: true },
    { id: 'domain', label: 'Domain', icon: 'language', pro: true },
    {
      id: 'integrations',
      label: 'Integrations',
      icon: 'link',
      pro: true,
      subTabs: [
        { id: 'payments', label: 'Payments' },
        { id: 'notifications', label: 'Notifications' },
        { id: 'social', label: 'Socials' },
      ],
    },
  ],
}

const ACCOUNT: NavSection = {
  id: 'account',
  label: 'Account',
  tabs: [{ id: 'billing', label: 'Billing', icon: 'credit_card' }],
}

/** Commerce verticals: sell things, so they get a catalog and a commerce group. */
const CATALOG: NavSection = {
  id: 'catalog',
  label: 'Catalog',
  tabs: [
    { id: 'products', label: 'Products', icon: 'inventory_2' },
    { id: 'services', label: 'Services', icon: 'home_repair_service' },
  ],
}

const COMMERCE: NavSection = {
  id: 'commerce',
  label: 'Commerce',
  tabs: [
    { id: 'orders', label: 'Orders', icon: 'receipt_long' },
    { id: 'analytics', label: 'Analytics', icon: 'bar_chart' },
    { id: 'customers', label: 'Customers', icon: 'person', beta: true, pro: true },
    { id: 'blog', label: 'Blog', icon: 'article' },
  ],
}

/**
 * Non-commerce verticals: no catalog, no customer accounts. Donations ARE
 * orders (tagged metadata.isDonation), so the orders tab stays, relabelled.
 */
const CONTENT: NavSection = {
  id: 'content',
  label: 'Content',
  tabs: [{ id: 'content', label: 'Content', icon: 'edit_note' }],
}

const DONATIONS: NavSection = {
  id: 'donations',
  label: 'Donations',
  tabs: [
    { id: 'orders', label: 'Donations', icon: 'volunteer_activism' },
    { id: 'analytics', label: 'Analytics', icon: 'bar_chart' },
    { id: 'blog', label: 'Blog', icon: 'article' },
  ],
}

/** The admin nav for a vertical. */
export function sectionsFor(vertical: Vertical): NavSection[] {
  return vertical.commerce
    ? [SITE, CATALOG, COMMERCE, ADVANCED, ACCOUNT]
    : [SITE, CONTENT, DONATIONS, ADVANCED, ACCOUNT]
}

/** Every tab id any vertical can show. Keeps routing/active-tab exhaustive. */
export const ALL_TAB_IDS = [
  'home', 'general', 'appearance',
  'products', 'services',
  'orders', 'analytics', 'customers', 'blog',
  'content',
  'members', 'domain', 'integrations',
  'billing',
] as const

export type TabId = (typeof ALL_TAB_IDS)[number]
```

- [ ] **Step 4: Re-export from the package index**

In `packages/verticals/src/index.ts`, append:

```ts
export { sectionsFor, ALL_TAB_IDS } from './nav'
export type { NavSection, NavTab, NavSubTab, TabId } from './nav'
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx tsx packages/verticals/src/nav.test.ts`
Expected: PASS, prints `nav.test.ts OK`.

Also re-run the existing descriptor test so the re-export did not break it:
Run: `npx tsx packages/verticals/src/index.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/verticals/src/nav.ts packages/verticals/src/nav.test.ts packages/verticals/src/index.ts
git commit -m "feat(verticals): sectionsFor(vertical) — vertical-aware admin nav model"
```

---

## Task 2: Wire the nav into the settings shell

**Files:**
- Modify: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/settings-shell.tsx:17-75`
- Modify: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/settings-nav.tsx:7` (import `TabId` from the package instead of the shell)

**Interfaces:**
- Consumes: `sectionsFor`, `TabId`, `NavSection` from `@mcloud/verticals` (Task 1).
- Produces: the shell renders the vertical's nav. No new exports.

**Context:** `getStoreSettingsData` selects `stores.*`, so `initialStore.type` is **already available** — no data change needed here (unlike the Overview, Task 5). `settings-nav.tsx` currently imports `TabId` from `./settings-shell`; point it at the package so the type has one home.

- [ ] **Step 1: Replace the static SECTIONS with the vertical's**

In `settings-shell.tsx`, delete the whole `SECTIONS` const (lines 17-71) and the two lines after it (`const ALL_TABS = ...`, `export type TabId = ...`). Replace with:

```ts
import { getVertical, sectionsFor, ALL_TAB_IDS } from '@mcloud/verticals'
import type { NavSection, TabId } from '@mcloud/verticals'

export type { TabId }
```

Keep the existing `import type { NavSection, NavStore } from './settings-nav'` working by removing `NavSection` from it (it now comes from the package) — leave `NavStore`.

- [ ] **Step 2: Derive the sections inside the component**

Inside `SettingsShell`, after `const store = initialStore`, add:

```ts
// The nav is a function of the vertical: an NGO has no catalog or customer
// accounts, but does have Content and Donations. store.type comes through
// because getStoreSettingsData selects stores.*.
const vertical = getVertical(store?.type)
const SECTIONS: NavSection[] = sectionsFor(vertical)
const ALL_TABS = SECTIONS.flatMap((s) => s.tabs)
```

The existing `activeId` / `activeLabel` blocks (lines 104-115) already read `ALL_TABS` and now resolve against the vertical's tabs unchanged.

- [ ] **Step 3: Point settings-nav at the package type**

In `settings-nav.tsx`, change line 7 from `import type { TabId } from './settings-shell'` to:

```ts
import type { TabId } from '@mcloud/verticals'
```

Delete its local `type SubTab`, `type Tab`, and `type NavSection` declarations (lines 13-28) and import them instead:

```ts
import type { NavSection } from '@mcloud/verticals'
```

Keep `NavUser` and `NavStore` — they are nav-component concerns, not vertical concerns. Ensure `NavSection` is still exported from `settings-nav.tsx` if other files import it from there (`git grep "from './settings-nav'"` to check; re-export if so: `export type { NavSection } from '@mcloud/verticals'`).

- [ ] **Step 4: Verify the web app typechecks and builds**

Run: `npx turbo build --filter=@mcloud/web`
Expected: PASS. A failure here almost certainly means a file still imports `TabId`/`NavSection` from the old location — `git grep -n "TabId\|NavSection" -- apps/web` and repoint it.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(merchant\)/org/\[orgSlug\]/\[storeSlug\]/settings/settings-shell.tsx apps/web/app/\(merchant\)/org/\[orgSlug\]/\[storeSlug\]/settings/settings-nav.tsx
git commit -m "feat(web): settings nav renders the store's vertical (Site/Content/Donations for NGO)"
```

---

## Task 3: `content-draft.ts` — pure draft, validation, serialization

**Files:**
- Create: `apps/web/lib/content-draft.ts`
- Test: `apps/web/lib/content-draft.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces — Task 4's client imports all of these:
  - `type CampaignDraft = { id: string; title: string; description: string; image: string; goalAmount: string; presets: string; allowCustomAmount: boolean; minAmount: string }` (form fields are **strings**; numbers are parsed at save)
  - `type ProgramDraft = { title: string; description: string; image: string }`
  - `type StatDraft = { label: string; value: string }`
  - `type NgoDraft = { missionHeadline: string; mission: string; programs: ProgramDraft[]; impactStats: StatDraft[]; contact: { address: string; email: string; phone: string }; campaigns: CampaignDraft[] }`
  - `newCampaignId(existing: string[]): string`
  - `draftFromSettings(settings: unknown): NgoDraft`
  - `validateDraft(draft: NgoDraft): string[]` — human-readable errors, empty = valid
  - `settingsFromDraft(draft: NgoDraft, prev: Record<string, unknown>): Record<string, unknown>`

**Why this is a separate file:** it is the only logic in SP5 that can silently corrupt a live site, and it is the only part testable without a browser. Two failure modes are real and verified against the running code:
1. `readCampaigns` **drops** any campaign whose `title` is not a non-empty string. It vanishes from the site with no error.
2. `validateDonationAmount` rejects **every** amount when `allowCustomAmount === false` and `presets` is empty. The campaign cannot receive money.

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/content-draft.test.ts`:

```ts
import assert from 'node:assert/strict'
import {
  newCampaignId,
  draftFromSettings,
  validateDraft,
  settingsFromDraft,
  type NgoDraft,
} from './content-draft'

// ── newCampaignId: unique, url-safe, never collides with existing ──
const id1 = newCampaignId([])
assert.ok(/^[a-z0-9-]+$/.test(id1), 'id is url-safe')
assert.notEqual(newCampaignId([id1]), id1, 'never reuses an existing id')

// ── draftFromSettings: tolerant of junk, always returns a usable draft ──
const empty = draftFromSettings(null)
assert.equal(empty.mission, '')
assert.deepEqual(empty.programs, [])
assert.deepEqual(empty.campaigns, [])
assert.equal(empty.contact.email, '')

const loaded = draftFromSettings({
  missionHeadline: 'Water for all',
  mission: 'We dig wells.',
  programs: [{ title: 'Wells', description: 'Dig', image: 'x.png' }],
  impactStats: [{ label: 'Wells dug', value: '42' }],
  contact: { address: 'Nairobi', email: 'a@b.c', phone: '+254' },
  campaigns: [{ id: 'water', title: 'Clean Water', goalAmount: 100000, presets: [500, 1000] }],
})
assert.equal(loaded.missionHeadline, 'Water for all')
assert.equal(loaded.programs.length, 1)
assert.equal(loaded.impactStats[0].value, '42')
assert.equal(loaded.campaigns[0].id, 'water')
assert.equal(loaded.campaigns[0].goalAmount, '100000', 'numbers become form strings')
assert.equal(loaded.campaigns[0].presets, '500, 1000', 'presets become a comma list')

// ── validateDraft: blocks the two silent-failure modes ──
const base: NgoDraft = draftFromSettings(null)

const noTitle: NgoDraft = {
  ...base,
  campaigns: [{ id: 'a', title: '  ', description: '', image: '', goalAmount: '', presets: '', allowCustomAmount: true, minAmount: '' }],
}
assert.ok(
  validateDraft(noTitle).some((e) => /title/i.test(e)),
  'a titleless campaign is rejected (readCampaigns would silently drop it)',
)

const unfundable: NgoDraft = {
  ...base,
  campaigns: [{ id: 'a', title: 'Ok', description: '', image: '', goalAmount: '', presets: '', allowCustomAmount: false, minAmount: '' }],
}
assert.ok(
  validateDraft(unfundable).some((e) => /preset/i.test(e)),
  'no custom amount + no presets is rejected (campaign could accept NO donation)',
)

const badNumber: NgoDraft = {
  ...base,
  campaigns: [{ id: 'a', title: 'Ok', description: '', image: '', goalAmount: '-5', presets: '', allowCustomAmount: true, minAmount: '' }],
}
assert.ok(validateDraft(badNumber).length > 0, 'negative goal is rejected')

const good: NgoDraft = {
  ...base,
  campaigns: [{ id: 'a', title: 'Ok', description: '', image: '', goalAmount: '1000', presets: '100, 200', allowCustomAmount: false, minAmount: '' }],
}
assert.deepEqual(validateDraft(good), [], 'a well-formed campaign passes')

// ── settingsFromDraft: emits the shape SP4's readers accept ──
const out = settingsFromDraft(good, { themeId: 'classic', heroTitle: 'keep me' })
assert.equal(out.themeId, 'classic', 'unrelated settings keys are preserved')
assert.equal(out.heroTitle, 'keep me', 'does not clobber other verticals keys')
const camps = out.campaigns as any[]
assert.equal(camps[0].id, 'a')
assert.equal(camps[0].goalAmount, 1000, 'goal is a number, not a string')
assert.deepEqual(camps[0].presets, [100, 200], 'presets are numbers')
assert.equal(camps[0].allowCustomAmount, false)
assert.ok(!('minAmount' in camps[0]), 'empty optional fields are omitted, not sent as NaN/empty')

// Blank rows are dropped rather than persisted as empty objects.
const blanks: NgoDraft = {
  ...base,
  programs: [{ title: '', description: '', image: '' }, { title: 'Real', description: 'd', image: '' }],
  impactStats: [{ label: '', value: '' }],
}
const out2 = settingsFromDraft(blanks, {})
assert.equal((out2.programs as any[]).length, 1, 'blank program dropped')
assert.equal((out2.impactStats as any[]).length, 0, 'blank stat dropped')

// Ids survive an edit round-trip — this is the orphaning guard.
const round = settingsFromDraft(draftFromSettings(out), {})
assert.equal((round.campaigns as any[])[0].id, 'a', 'campaign id survives load->save')

console.log('content-draft.test.ts OK')
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx apps/web/lib/content-draft.test.ts`
Expected: FAIL — `Cannot find module './content-draft'`.

- [ ] **Step 3: Implement**

Create `apps/web/lib/content-draft.ts`:

```ts
// Pure draft/validation/serialization for the Content editor (SP5).
//
// The storefront's readers are deliberately tolerant, which means a malformed
// campaign fails SILENTLY:
//   - readCampaigns() drops any campaign without a string id AND title, so a
//     titleless campaign just vanishes from the live site.
//   - validateDonationAmount() rejects EVERY amount when allowCustomAmount is
//     false and presets is empty, so such a campaign can never take money.
// Both are verified behaviours of apps/storefront/lib/campaigns.ts. The editor
// must therefore block them at save time — the site will not complain.
//
// Form fields are strings (that is what inputs give us); numbers are parsed and
// optional empties are OMITTED at save, never written as NaN or ''.

export type CampaignDraft = {
  id: string
  title: string
  description: string
  image: string
  goalAmount: string
  presets: string          // comma-separated, e.g. "500, 1000, 2500"
  allowCustomAmount: boolean
  minAmount: string
}

export type ProgramDraft = { title: string; description: string; image: string }
export type StatDraft = { label: string; value: string }

export type NgoDraft = {
  missionHeadline: string
  mission: string
  programs: ProgramDraft[]
  impactStats: StatDraft[]
  contact: { address: string; email: string; phone: string }
  campaigns: CampaignDraft[]
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '')

/** A short url-safe id, never colliding with one already in use. */
export function newCampaignId(existing: string[]): string {
  const taken = new Set(existing)
  for (;;) {
    const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    if (!taken.has(id)) return id
  }
}

export function draftFromSettings(settings: unknown): NgoDraft {
  const s = isRecord(settings) ? settings : {}
  const contact = isRecord(s.contact) ? s.contact : {}

  const programs = Array.isArray(s.programs) ? s.programs : []
  const stats = Array.isArray(s.impactStats) ? s.impactStats : []
  const campaigns = Array.isArray(s.campaigns) ? s.campaigns : []

  return {
    missionHeadline: str(s.missionHeadline),
    mission: str(s.mission),
    programs: programs.filter(isRecord).map((p) => ({
      title: str(p.title),
      description: str(p.description),
      image: str(p.image),
    })),
    impactStats: stats.filter(isRecord).map((t) => ({
      label: str(t.label),
      value: str(t.value),
    })),
    contact: {
      address: str(contact.address),
      email: str(contact.email),
      phone: str(contact.phone),
    },
    campaigns: campaigns.filter(isRecord).map((c) => ({
      id: str(c.id) || newCampaignId([]),
      title: str(c.title),
      description: str(c.description),
      image: str(c.image),
      goalAmount: str(c.goalAmount),
      presets: Array.isArray(c.presets) ? c.presets.join(', ') : '',
      allowCustomAmount: c.allowCustomAmount !== false,   // default true
      minAmount: str(c.minAmount),
    })),
  }
}

/** Parse a comma list of positive numbers. Returns null if any entry is bad. */
function parsePresets(raw: string): number[] | null {
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
  const nums = parts.map(Number)
  if (nums.some((n) => !Number.isFinite(n) || n <= 0)) return null
  return nums
}

/** Optional positive number. '' -> undefined. Bad -> null (an error). */
function parseOptionalAmount(raw: string): number | undefined | null {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export function validateDraft(draft: NgoDraft): string[] {
  const errors: string[] = []

  draft.campaigns.forEach((c, i) => {
    const where = c.title.trim() || `Campaign ${i + 1}`

    // readCampaigns() drops a titleless campaign — it would vanish from the site.
    if (!c.title.trim()) {
      errors.push(`${where}: a title is required, or the campaign will not appear on your site.`)
    }

    const presets = parsePresets(c.presets)
    if (presets === null) {
      errors.push(`${where}: suggested amounts must be positive numbers, separated by commas.`)
    }

    // validateDonationAmount() would reject EVERY amount in this state.
    if (!c.allowCustomAmount && (presets === null || presets.length === 0)) {
      errors.push(
        `${where}: add at least one suggested amount, or allow custom amounts. ` +
        `Otherwise no one can donate to this campaign.`,
      )
    }

    if (parseOptionalAmount(c.goalAmount) === null) {
      errors.push(`${where}: the goal must be a positive number.`)
    }
    if (parseOptionalAmount(c.minAmount) === null) {
      errors.push(`${where}: the minimum donation must be a positive number.`)
    }
  })

  return errors
}

/**
 * Serialize a valid draft into the settings JSON the storefront reads. Merges
 * into `prev` so keys belonging to other sections (theme, hero, socials) are
 * preserved rather than clobbered. Blank rows are dropped; empty optionals are
 * omitted entirely rather than written as '' or NaN.
 *
 * Call validateDraft() first — this assumes the draft is valid.
 */
export function settingsFromDraft(
  draft: NgoDraft,
  prev: Record<string, unknown>,
): Record<string, unknown> {
  const campaigns = draft.campaigns.map((c) => {
    const out: Record<string, unknown> = {
      id: c.id,
      title: c.title.trim(),
      allowCustomAmount: c.allowCustomAmount,
    }
    if (c.description.trim()) out.description = c.description.trim()
    if (c.image.trim()) out.image = c.image.trim()

    const goal = parseOptionalAmount(c.goalAmount)
    if (typeof goal === 'number') out.goalAmount = goal

    const min = parseOptionalAmount(c.minAmount)
    if (typeof min === 'number') out.minAmount = min

    const presets = parsePresets(c.presets)
    if (presets && presets.length) out.presets = presets

    return out
  })

  return {
    ...prev,
    missionHeadline: draft.missionHeadline.trim(),
    mission: draft.mission.trim(),
    programs: draft.programs
      .filter((p) => p.title.trim() || p.description.trim())
      .map((p) => ({
        title: p.title.trim(),
        description: p.description.trim(),
        ...(p.image.trim() ? { image: p.image.trim() } : {}),
      })),
    impactStats: draft.impactStats
      .filter((s) => s.label.trim() || s.value.trim())
      .map((s) => ({ label: s.label.trim(), value: s.value.trim() })),
    contact: {
      address: draft.contact.address.trim(),
      email: draft.contact.email.trim(),
      phone: draft.contact.phone.trim(),
    },
    campaigns,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx apps/web/lib/content-draft.test.ts`
Expected: PASS, prints `content-draft.test.ts OK`.

- [ ] **Step 5: Prove the output round-trips through the REAL storefront reader**

This is the whole point of the file — do not skip it. Create a throwaway check:

```bash
cat > /tmp/sp5-roundtrip.ts <<'EOF'
import assert from 'node:assert/strict'
import { draftFromSettings, settingsFromDraft, type NgoDraft } from '../../mcloud-1/apps/web/lib/content-draft'
EOF
```

Simpler: put it inside the repo so imports resolve, run it, then delete it.

Create `apps/web/lib/_sp5_roundtrip.ts`:

```ts
import assert from 'node:assert/strict'
import { draftFromSettings, settingsFromDraft } from './content-draft'
import { readCampaigns, validateDonationAmount } from '../../storefront/lib/campaigns'

const draft = draftFromSettings(null)
draft.campaigns = [{
  id: 'water', title: 'Clean Water', description: 'Wells', image: '',
  goalAmount: '100000', presets: '500, 1000', allowCustomAmount: false, minAmount: '',
}]
const settings = settingsFromDraft(draft, {})

// The storefront must SEE the campaign the editor saved.
const read = readCampaigns(settings)
assert.equal(read.length, 1, 'saved campaign is visible to the storefront')
assert.equal(read[0].id, 'water')

// And a donor must be able to give a preset amount.
assert.deepEqual(validateDonationAmount(read[0], 500), { ok: true, amount: 500 })
assert.equal(validateDonationAmount(read[0], 777).ok, false, 'non-preset rejected when custom is off')

console.log('round-trip through the real storefront reader OK')
```

Run: `npx tsx apps/web/lib/_sp5_roundtrip.ts`
Expected: PASS, prints the OK line. Then **delete the file**: `rm apps/web/lib/_sp5_roundtrip.ts`

If the import path `../../storefront/lib/campaigns` does not resolve, fix it to the real relative path from `apps/web/lib/` to `apps/storefront/lib/campaigns.ts` before concluding anything.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/content-draft.ts apps/web/lib/content-draft.test.ts
git commit -m "feat(web): pure content draft + validation (blocks titleless and unfundable campaigns)"
```

---

## Task 4: The Content page

**Files:**
- Create: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/content/page.tsx`
- Create: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/content/content-client.tsx`
- Create: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/content/campaign-card.tsx`

**Interfaces:**
- Consumes: `draftFromSettings`, `validateDraft`, `settingsFromDraft`, `newCampaignId`, and the draft types from `@/lib/content-draft` (Task 3); `updateStoreSettings(slug, patch)` from `../actions`; `ImageUpload` from `@/components/store/image-upload`; `getVertical` from `@mcloud/verticals`.
- Produces: the `/settings/content` route. Nothing imports from it.

**`ImageUpload`'s real signature** (do not guess):

```ts
<ImageUpload
  value={string}
  onChange={(url: string, path: string) => void}
  bucket="store-assets"
  pathPrefix={`${storeId}/campaigns/${campaign.id}`}   // no trailing slash
  label="Campaign image"
  aspectRatio="wide"
/>
```

**`updateStoreSettings`'s real signature:** `updateStoreSettings(slug: string, patch: { settings?: Json; ... }): Promise<{ error: string | null }>`. It is already session-authorized, `canManage`-gated and service-role. **Do not write to Supabase from the client.**

- [ ] **Step 1: Server page — load the store, guard the vertical**

Create `content/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { getVertical } from '@mcloud/verticals'
import { getStoreSettingsData } from '@/lib/store-data'
import ContentClient from './content-client'

export default async function ContentPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug } = await params

    const session = await getSession()
    if (!session?.user) redirect('/auth/login')

    const result = await getStoreSettingsData(session.user.id, storeSlug, orgSlug)
    if (result.error || !result.data) redirect(`/org/${orgSlug}/${storeSlug}/settings`)

    const store = result.data
    const vertical = getVertical(store.type)

    // Content authoring is for non-commerce verticals. A shop's home content is
    // edited under Design/General, so send a shop back rather than render an
    // empty page.
    if (vertical.commerce) redirect(`/org/${orgSlug}/${storeSlug}/settings`)

    return (
        <ContentClient
            slug={storeSlug}
            storeId={store.id}
            initialSettings={store.settings ?? {}}
        />
    )
}
```

If `getStoreSettingsData`'s return shape differs (check `StoreSettingsResult` at `apps/web/lib/store-data.ts:8`), adapt the destructuring — but keep the vertical guard.

- [ ] **Step 2: The editor client**

Create `content/content-client.tsx`:

```tsx
'use client'

import { useState } from 'react'
import {
    draftFromSettings,
    validateDraft,
    settingsFromDraft,
    newCampaignId,
    type NgoDraft,
} from '@/lib/content-draft'
import { updateStoreSettings } from '../actions'
import CampaignCard from './campaign-card'

export default function ContentClient({
    slug,
    storeId,
    initialSettings,
}: {
    slug: string
    storeId: string
    initialSettings: Record<string, unknown>
}) {
    const [draft, setDraft] = useState<NgoDraft>(() => draftFromSettings(initialSettings))
    const [errors, setErrors] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const set = <K extends keyof NgoDraft>(key: K, value: NgoDraft[K]) => {
        setDraft((d) => ({ ...d, [key]: value }))
        setSaved(false)
    }

    async function onSave() {
        const errs = validateDraft(draft)
        setErrors(errs)
        if (errs.length) return

        setSaving(true)
        // Merge into the previous settings so theme/hero/social keys survive.
        const settings = settingsFromDraft(draft, initialSettings)
        const { error } = await updateStoreSettings(slug, { settings: settings as never })
        setSaving(false)

        // Keep the draft on failure so nothing the merchant typed is lost.
        if (error) setErrors([error])
        else setSaved(true)
    }

    return (
        <div className="space-y-8 pb-24">
            <header>
                <h1 className="text-2xl font-semibold">Content</h1>
                <p className="text-sm opacity-70">
                    What visitors see on your site. Changes go live when you save.
                </p>
            </header>

            {/* ── Mission ─────────────────────────────────────────────── */}
            <section className="space-y-3">
                <h2 className="font-medium">Mission</h2>
                <input
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Headline"
                    value={draft.missionHeadline}
                    onChange={(e) => set('missionHeadline', e.target.value)}
                />
                <textarea
                    className="w-full rounded-lg border px-3 py-2"
                    rows={3}
                    placeholder="What your organisation is for."
                    value={draft.mission}
                    onChange={(e) => set('mission', e.target.value)}
                />
            </section>

            {/* ── Programs ────────────────────────────────────────────── */}
            <section className="space-y-3">
                <h2 className="font-medium">Programs</h2>
                {draft.programs.map((p, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-2">
                        <input
                            className="w-full rounded-lg border px-3 py-2"
                            placeholder="Program title"
                            value={p.title}
                            onChange={(e) => {
                                const next = [...draft.programs]
                                next[i] = { ...p, title: e.target.value }
                                set('programs', next)
                            }}
                        />
                        <textarea
                            className="w-full rounded-lg border px-3 py-2"
                            rows={2}
                            placeholder="What it does"
                            value={p.description}
                            onChange={(e) => {
                                const next = [...draft.programs]
                                next[i] = { ...p, description: e.target.value }
                                set('programs', next)
                            }}
                        />
                        <button
                            type="button"
                            className="text-sm text-red-600"
                            onClick={() => set('programs', draft.programs.filter((_, j) => j !== i))}
                        >
                            Remove program
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    className="rounded-lg border px-3 py-2 text-sm"
                    onClick={() => set('programs', [...draft.programs, { title: '', description: '', image: '' }])}
                >
                    Add program
                </button>
            </section>

            {/* ── Impact stats ────────────────────────────────────────── */}
            <section className="space-y-3">
                <h2 className="font-medium">Impact</h2>
                {draft.impactStats.map((s, i) => (
                    <div key={i} className="flex gap-2">
                        <input
                            className="flex-1 rounded-lg border px-3 py-2"
                            placeholder="Label (e.g. Wells dug)"
                            value={s.label}
                            onChange={(e) => {
                                const next = [...draft.impactStats]
                                next[i] = { ...s, label: e.target.value }
                                set('impactStats', next)
                            }}
                        />
                        <input
                            className="w-32 rounded-lg border px-3 py-2"
                            placeholder="Value"
                            value={s.value}
                            onChange={(e) => {
                                const next = [...draft.impactStats]
                                next[i] = { ...s, value: e.target.value }
                                set('impactStats', next)
                            }}
                        />
                        <button
                            type="button"
                            className="text-sm text-red-600"
                            onClick={() => set('impactStats', draft.impactStats.filter((_, j) => j !== i))}
                        >
                            Remove
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    className="rounded-lg border px-3 py-2 text-sm"
                    onClick={() => set('impactStats', [...draft.impactStats, { label: '', value: '' }])}
                >
                    Add stat
                </button>
            </section>

            {/* ── Contact ─────────────────────────────────────────────── */}
            <section className="space-y-3">
                <h2 className="font-medium">Contact</h2>
                <input
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Address"
                    value={draft.contact.address}
                    onChange={(e) => set('contact', { ...draft.contact, address: e.target.value })}
                />
                <input
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Email"
                    value={draft.contact.email}
                    onChange={(e) => set('contact', { ...draft.contact, email: e.target.value })}
                />
                <input
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Phone"
                    value={draft.contact.phone}
                    onChange={(e) => set('contact', { ...draft.contact, phone: e.target.value })}
                />
            </section>

            {/* ── Campaigns ───────────────────────────────────────────── */}
            <section className="space-y-3">
                <h2 className="font-medium">Campaigns</h2>
                <p className="text-sm opacity-70">
                    What people can donate to. Each campaign tracks its own total raised.
                </p>
                {draft.campaigns.map((c, i) => (
                    <CampaignCard
                        key={c.id}
                        storeId={storeId}
                        campaign={c}
                        onChange={(next) => {
                            const cs = [...draft.campaigns]
                            cs[i] = next
                            set('campaigns', cs)
                        }}
                        onRemove={() => set('campaigns', draft.campaigns.filter((_, j) => j !== i))}
                    />
                ))}
                <button
                    type="button"
                    className="rounded-lg border px-3 py-2 text-sm"
                    onClick={() =>
                        set('campaigns', [
                            ...draft.campaigns,
                            {
                                id: newCampaignId(draft.campaigns.map((c) => c.id)),
                                title: '',
                                description: '',
                                image: '',
                                goalAmount: '',
                                presets: '',
                                allowCustomAmount: true,
                                minAmount: '',
                            },
                        ])
                    }
                >
                    Add campaign
                </button>
            </section>

            {/* ── Save ────────────────────────────────────────────────── */}
            {errors.length > 0 && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                    <ul className="list-disc pl-5 space-y-1">
                        {errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                </div>
            )}

            <div className="sticky bottom-0 flex items-center gap-3 border-t bg-white py-3">
                <button
                    type="button"
                    disabled={saving}
                    onClick={onSave}
                    className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save changes'}
                </button>
                {saved && <span className="text-sm text-green-700">Saved. Your site is updated.</span>}
            </div>
        </div>
    )
}
```

- [ ] **Step 3: The campaign card**

Create `content/campaign-card.tsx`:

```tsx
'use client'

import ImageUpload from '@/components/store/image-upload'
import type { CampaignDraft } from '@/lib/content-draft'

export default function CampaignCard({
    storeId,
    campaign,
    onChange,
    onRemove,
}: {
    storeId: string
    campaign: CampaignDraft
    onChange: (next: CampaignDraft) => void
    onRemove: () => void
}) {
    const set = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) =>
        onChange({ ...campaign, [key]: value })

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <input
                className="w-full rounded-lg border px-3 py-2 font-medium"
                placeholder="Campaign title"
                value={campaign.title}
                onChange={(e) => set('title', e.target.value)}
            />
            <textarea
                className="w-full rounded-lg border px-3 py-2"
                rows={2}
                placeholder="What this campaign funds"
                value={campaign.description}
                onChange={(e) => set('description', e.target.value)}
            />

            <ImageUpload
                value={campaign.image}
                onChange={(url) => set('image', url)}
                bucket="store-assets"
                pathPrefix={`${storeId}/campaigns/${campaign.id}`}
                label="Campaign image"
                aspectRatio="wide"
            />

            <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                    Goal (optional)
                    <input
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                        placeholder="100000"
                        value={campaign.goalAmount}
                        onChange={(e) => set('goalAmount', e.target.value)}
                    />
                </label>
                <label className="text-sm">
                    Minimum donation (optional)
                    <input
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                        placeholder="100"
                        value={campaign.minAmount}
                        onChange={(e) => set('minAmount', e.target.value)}
                    />
                </label>
            </div>

            <label className="block text-sm">
                Suggested amounts
                <input
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    placeholder="500, 1000, 2500"
                    value={campaign.presets}
                    onChange={(e) => set('presets', e.target.value)}
                />
            </label>

            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={campaign.allowCustomAmount}
                    onChange={(e) => set('allowCustomAmount', e.target.checked)}
                />
                Let people enter their own amount
            </label>

            <button
                type="button"
                className="text-sm text-red-600"
                onClick={() => {
                    // Donations are tagged with this campaign id. Removing the
                    // campaign does not delete them, but they stop being
                    // attributable to anything the merchant can see.
                    const ok = window.confirm(
                        `Remove "${campaign.title || 'this campaign'}"?\n\n` +
                        `Donations already received stay in your records, but they will no longer ` +
                        `show against this campaign. This cannot be undone.`,
                    )
                    if (ok) onRemove()
                }}
            >
                Remove campaign
            </button>
        </div>
    )
}
```

- [ ] **Step 4: Build**

Run: `npx turbo build --filter=@mcloud/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/content"
git commit -m "feat(web): Content page — author NGO mission, programs, impact, contact, campaigns"
```

---

## Task 5: NGO Overview

**Files:**
- Modify: `apps/web/lib/store-data.ts:161` (add `type` to the select) and `getStoreOverview`'s return
- Modify: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/settings-home-client.tsx`

**Interfaces:**
- Consumes: `getVertical` from `@mcloud/verticals`; campaign progress from `stores.settings.campaigns` + donation orders.
- Produces: nothing new.

**The blocker to fix first:** `getStoreOverview` selects
`'id, name, slug, logo_url, is_active, currency, custom_domain, settings, is_pro, views'`
— **`type` is missing**, so the Overview literally cannot tell which vertical it is. Add it.

- [ ] **Step 1: Carry `type` through the Overview query**

In `apps/web/lib/store-data.ts`, line ~161, change the store select to include `type`:

```ts
        supabase
            .from('stores')
            .select('id, name, slug, logo_url, is_active, currency, custom_domain, settings, is_pro, views, type')
            .eq('id', storeId)
            .single(),
```

Ensure the returned object exposes it (follow whatever shape the function already returns; do not restructure it).

- [ ] **Step 2: Compute donation metrics for non-commerce verticals**

Still in `getStoreOverview`, after the existing aggregation, add a donation branch. Donations are `orders` with `metadata.isDonation = 'true'` and `metadata.payment_status = 'completed'`, tagged with `metadata.campaignId` — this is exactly what `apps/storefront/lib/campaigns.ts:loadCampaignsWithProgress` already does, so mirror its logic rather than inventing a new one:

```ts
// Donations are orders tagged in metadata (see storefront lib/campaigns.ts).
// Sum completed ones per campaign so a non-commerce vertical can show progress
// instead of product/revenue tiles that mean nothing to it.
const campaigns = Array.isArray((storeRow?.settings as any)?.campaigns)
    ? ((storeRow!.settings as any).campaigns as any[])
    : []

const raisedById: Record<string, number> = {}
let totalRaised = 0
let donationCount = 0

for (const o of allOrders ?? []) {
    const md = (o.metadata ?? {}) as Record<string, unknown>
    if (md.isDonation !== 'true' && md.isDonation !== true) continue
    if (md.payment_status !== 'completed') continue
    const amount = Number(o.total ?? 0)
    totalRaised += amount
    donationCount++
    const cid = typeof md.campaignId === 'string' ? md.campaignId : null
    if (cid) raisedById[cid] = (raisedById[cid] ?? 0) + amount
}

const campaignProgress = campaigns
    .filter((c) => c && typeof c.id === 'string' && typeof c.title === 'string')
    .map((c) => {
        const raised = raisedById[c.id] ?? 0
        const goal = typeof c.goalAmount === 'number' && c.goalAmount > 0 ? c.goalAmount : 0
        return {
            id: c.id as string,
            title: c.title as string,
            raised,
            goal,
            percent: goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0,
        }
    })
    .sort((a, b) => b.raised - a.raised)
```

Return `{ ...existing, totalRaised, donationCount, campaignProgress }`. The existing orders query already selects `total, status` — **it must also select `metadata`** for this to work. Update that select to `'total, status, metadata'`.

- [ ] **Step 3: Render the NGO tiles**

In `settings-home-client.tsx`, gate the commerce-specific blocks. Add at the top of the component:

```tsx
import { getVertical } from '@mcloud/verticals'
// ...
const commerce = getVertical(store?.type).commerce
```

Then:
- Wrap the **Top Product** card and the **funnel** (`Add to cart` / `Checkouts Started` / `Orders Placed`, around lines 218-220) in `{commerce && ( ... )}`.
- Where the tiles show `revenue_total` and `product_count`, render for `!commerce` instead: **Total raised** (`totalRaised`), **Active campaigns** (`campaignProgress.length`), **Donations** (`donationCount`), and a **Top campaign** card (`campaignProgress[0]`) with its `percent` bar.
- Relabel "Recent orders" to "Recent donations" when `!commerce`.
- The payment-setup nudge at line ~195 currently reads "Connect M-Pesa or PayPal so customers can checkout." For `!commerce` use: "Connect M-Pesa or PayPal so people can donate. Takes about 2 minutes."

Reuse the existing tile/table components — do not build new ones.

- [ ] **Step 4: Build**

Run: `npx turbo build --filter=@mcloud/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/store-data.ts "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/settings-home-client.tsx"
git commit -m "feat(web): donation-shaped Overview for non-commerce verticals"
```

---

## Task 6: Guard the hidden routes

**Files:**
- Modify: `settings/products/page.tsx`, `settings/services/page.tsx`, `settings/customers/page.tsx`

Hiding a nav entry does not make its route unreachable. An NGO hitting `/settings/products` directly must not get a half-working product manager.

- [ ] **Step 1: Redirect non-commerce verticals away from commerce routes**

In each of the three pages, after the store is resolved and before rendering:

```tsx
import { getVertical } from '@mcloud/verticals'
// ...
// This surface only exists for verticals that sell things.
if (!getVertical(store.type).commerce) {
    redirect(`/org/${orgSlug}/${storeSlug}/settings`)
}
```

Adapt to each page's existing param/store variables. If a page does not currently load the store, load it via the same helper its siblings use rather than adding a new query.

- [ ] **Step 2: Build**

Run: `npx turbo build --filter=@mcloud/web`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/products/page.tsx" "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/services/page.tsx" "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/customers/page.tsx"
git commit -m "feat(web): guard commerce-only settings routes on non-commerce verticals"
```

---

## Task 7: Copy sweep — store/shop to site

**Files:** merchant-facing strings across `apps/web/app/(merchant)/**` only.

**Do NOT touch:** the `stores` table, `store_id`, `[storeSlug]`, `apps/storefront`, `useStoreHref`, `store-data.ts`, component filenames, or any identifier. Strings only.

- [ ] **Step 1: Find the merchant-facing copy**

```bash
git grep -n -iE "\"[^\"]*\b(store|shop)\b[^\"]*\"|'[^']*\b(store|shop)\b[^']*'|>[^<]*\b(Store|Shop)\b[^<]*<" -- "apps/web/app/(merchant)"
```

Review each hit and judge: is it a **string a merchant reads**, or an identifier? Only change the former.

- [ ] **Step 2: Rewrite the copy**

Replace merchant-facing "store"/"shop" with "site". Examples:
- "Store settings" → "Site settings"
- "Your store is live" → "Your site is live"
- "Store name" → "Site name"
- "Go to store" → "View site"

Keep it natural; do not produce "site-front" or similar. **No em dashes.**

- [ ] **Step 3: Verify no identifier was renamed**

```bash
git diff --stat
git diff | grep -E "^[+-]" | grep -iE "storeSlug|store_id|from\('stores'\)|useStoreHref|apps/storefront"
```
Expected: **no output** from the second command. If anything appears, you renamed an identifier. Revert that hunk.

- [ ] **Step 4: Build**

Run: `npx turbo build --filter=@mcloud/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "refactor(web): merchant-facing copy says site, not store (identifiers unchanged)"
```

---

## Task 8: Verify end to end against a real NGO store

The unit tests prove the logic; this proves the product. `spiritbulb-foundation` is a real NGO store that renders correctly in prod.

- [ ] **Step 1: Run every test**

```bash
for f in packages/verticals/src/index.test.ts packages/verticals/src/nav.test.ts \
         apps/web/lib/content-draft.test.ts \
         apps/storefront/lib/campaigns.test.ts apps/storefront/lib/sections.test.ts \
         apps/storefront/lib/render-page.test.ts apps/storefront/lib/liquid-context.test.ts \
         apps/storefront/lib/orders.test.ts \
         "apps/storefront/app/api/store/[slug]/donate/donate-logic.test.ts" \
         "apps/storefront/app/store/[slug]/donate-island-logic.test.ts"; do
  npx tsx "$f" >/dev/null 2>&1 && echo "PASS $f" || echo "FAIL $f"
done
```
Expected: all PASS.

- [ ] **Step 2: Build both apps**

Run: `npx turbo build --filter=@mcloud/web --filter=@mcloud/storefront`
Expected: PASS.

- [ ] **Step 3: Drive the real admin**

Start the web app and log in as the owner of an NGO store:

```bash
npx turbo run dev --filter=@mcloud/web -- --port 3000
```

Confirm, on the NGO store's settings:
1. The nav shows **Site / Content / Donations / Advanced / Account**. No Catalog, no Products, no Customers.
2. `/settings/products` **redirects** rather than rendering.
3. Content page loads existing mission/programs/campaigns from settings.
4. Adding a campaign with **no title** shows the "will not appear on your site" error and does **not** save.
5. A campaign with custom amounts **off** and **no presets** shows the "no one can donate" error and does **not** save.
6. A valid campaign saves, and the success message appears.
7. No screen says "store" or "shop" to the merchant.

- [ ] **Step 4: Confirm the storefront agrees**

Load the NGO storefront (`/store/<ngo-slug>`) and confirm the campaign saved in Step 3 **appears with its donate button**. This is the real proof: it means the editor wrote a shape `readCampaigns` accepts. If the campaign is missing from the site, the editor emitted something the reader dropped — go back to Task 3, do not paper over it in the template.

- [ ] **Step 5: Confirm a shop is untouched**

Load a shop store's settings (e.g. `locd26`). The nav must still show **Catalog** and **Products**, and the Overview must still show product/revenue tiles. SP5 must not regress the commerce vertical.

- [ ] **Step 6: Final commit and push**

```bash
git push -u origin feat/merchant-vertical-admin
```

---

## Self-review

**Spec coverage:**
- Vertical-aware nav → Tasks 1, 2 ✓
- Content page (mission/programs/impact/contact/campaigns) → Tasks 3, 4 ✓
- Campaign inline editor, auto/immutable ids, delete warning → Tasks 3, 4 ✓
- Validation of the two silent-failure modes → Task 3 ✓
- NGO Overview → Task 5 ✓
- Hidden-route guards (spec §9 risk) → Task 6 ✓
- Copy-only rename → Task 7, plus the label assertion in Task 1's test ✓
- Image upload via existing component → Task 4 ✓
- Existing `updateStoreSettings` write path, no new anon writes → Task 4 ✓

**Known gap, deliberately deferred:** the Analytics tab is kept for NGOs but its internals were not audited (spec §9). If it shows commerce funnels, that is a follow-up, not SP5.

**Type consistency:** `sectionsFor`/`NavSection`/`TabId` (Task 1) are consumed with those exact names in Task 2. `CampaignDraft`/`NgoDraft`/`draftFromSettings`/`validateDraft`/`settingsFromDraft`/`newCampaignId` (Task 3) are consumed with those exact names in Task 4. `ImageUpload`'s props are copied from its real signature. `updateStoreSettings(slug, patch)` matches `settings/actions.ts`.
