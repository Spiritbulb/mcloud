# Admin Panel Expansion — Design Spec

**Date:** 2026-06-26
**Status:** Approved

## Overview

Expand the existing `/admin` area with four new pages: Users, Stores, Orders, and Webhook Logs. Remove all `comingSoon` flags from the nav. Admins can search/filter all entities and take light mutations on users (role change) and stores (suspend/unsuspend, grant/revoke Pro).

## Existing Foundation

- `apps/web/app/admin/layout.tsx` — auth guard (role === "admin"), renders `AdminShell`
- `apps/web/components/admin/admin-nav.tsx` — `ADMIN_SECTIONS` config, sidebar with rail mode
- `apps/web/app/admin/page.tsx` — dashboard with stat cards + quick links
- `apps/web/app/admin/subs/page.tsx` — subscriptions list (activate pending subs)
- `apps/web/app/api/admin/subscriptions/activate/route.ts` — admin auth pattern to reuse

## Pages

### `/admin/users`

Server component fetches all users (`id`, `name`, `email`, `avatar_url`, `role`, `created_at`), sorted by `created_at` desc.

Client component (`UsersClient`) renders a searchable table:

| Column | Notes |
|--------|-------|
| Avatar + Name | fallback initials if no avatar |
| Email | |
| Role | badge: `admin` = error color, `user` = muted |
| Joined | relative date |
| Actions | "Change role" button |

- Search filters name + email client-side (all users in memory; admin-only page, count stays small)
- "Change role" opens a confirmation dialog: "Grant admin access to [Name]? They will have full platform access." / "Revoke admin from [Name]?"
- On confirm: `PATCH /api/admin/users/[id]/role` with `{ role: "admin" | "user" }`
- On success: optimistic update of the row's role badge

### `/admin/stores`

Server component fetches all stores joined with owner user (`id`, `name`, `slug`, `logo_url`, `is_pro`, `is_active`, `pro_since`, `pro_expires_at`, `owner_id`, `created_at`) + owner's `name` and `email` via join.

Client component (`StoresClient`) renders a searchable table:

| Column | Notes |
|--------|-------|
| Logo + Name | fallback initials |
| Slug | monospace |
| Owner | name + email |
| Pro | badge: Pro / Free |
| Status | badge: Active / Suspended |
| Actions | "Manage plan" + "Suspend/Unsuspend" buttons |

- Search filters name + slug + owner email client-side
- **Manage plan** → dialog showing current plan, two actions:
  - Grant Pro: sets `is_pro = true`, `pro_since = now()`, `pro_expires_at = null` + upserts `store_subscriptions` status to `active`
  - Revoke Pro: sets `is_pro = false`, `pro_expires_at = now()` + updates latest subscription status to `cancelled`
  - API: `PATCH /api/admin/stores/[id]/plan` body `{ action: "grant" | "revoke" }`
- **Suspend/Unsuspend** → confirmation dialog → `PATCH /api/admin/stores/[id]/status` body `{ is_active: boolean }`
- Both actions optimistically update the row on success

### `/admin/orders`

Server component fetches all orders (`id`, `order_number`, `store_id`, `customer_email`, `total`, `currency`, `status`, `fulfillment_status`, `created_at`) joined with `stores(name, slug)`, sorted by `created_at` desc.

Client component (`OrdersClient`) renders a filterable table:

| Column | Notes |
|--------|-------|
| Order # | monospace |
| Store | name, links to storefront |
| Customer | email |
| Total | formatted with currency |
| Status | badge (pending/paid/cancelled/refunded) |
| Fulfillment | badge (unfulfilled/fulfilled/partial) |
| Date | relative |

- Search filters order number + customer email + store name client-side
- Filter dropdown for `status`
- Read-only — no mutations

### `/admin/webhooks`

Server component fetches webhook logs (`id`, `provider`, `event_type`, `status`, `store_id`, `created_at`, `error_message`, `payload`) joined with `stores(name)`, sorted by `created_at` desc, limit 500.

Client component (`WebhooksClient`) renders a filterable table:

| Column | Notes |
|--------|-------|
| Provider | e.g. daraja, google_play |
| Event type | |
| Status | badge: success (green) / failed (error) |
| Store | name or "—" if null |
| Date | relative |
| ▶ Expand | click row to show `payload` JSON + `error_message` |

- Filter by provider + status
- Read-only

## API Routes

### `PATCH /api/admin/users/[id]/role`

```
Body: { role: "admin" | "user" }
Auth: session + users.role === "admin"
Action: UPDATE users SET role = $role WHERE id = $id
```

### `PATCH /api/admin/stores/[id]/status`

```
Body: { is_active: boolean }
Auth: session + users.role === "admin"
Action: UPDATE stores SET is_active = $is_active WHERE id = $id
```

### `PATCH /api/admin/stores/[id]/plan`

```
Body: { action: "grant" | "revoke" }
Auth: session + users.role === "admin"

grant:
  UPDATE stores SET is_pro = true, pro_since = now(), pro_expires_at = null WHERE id = $id
  UPDATE store_subscriptions SET status = 'active' WHERE store_id = $id ORDER BY created_at DESC LIMIT 1
  (if no subscription exists, insert one with provider = 'admin', amount = 0, currency = store.currency)

revoke:
  UPDATE stores SET is_pro = false, pro_expires_at = now() WHERE id = $id
  UPDATE store_subscriptions SET status = 'cancelled' WHERE store_id = $id AND status = 'active'
```

## Nav Updates (`admin-nav.tsx`)

- Remove `comingSoon: true` from Users and Stores items
- Remove `comingSoon: true` from Webhooks item (currently present, add it if missing)
- Add Orders item under Commerce section alongside Subscriptions:
  ```
  { id: 'orders', label: 'Orders', icon: 'receipt_long', href: '/admin/orders' }
  ```

## Shared Patterns

- All client components follow the same structure as `SubscriptionsClient`: server page fetches + passes data, client handles interactivity
- Admin auth in API routes: session check → `users.role` check → action (same as existing activate route)
- Confirmation dialogs: use existing UI primitives (shadcn `AlertDialog` or similar already in `@mcloud/ui`)
- Toast/feedback on mutation success/failure: use whatever toast is already wired in the app
- No pagination for now — admin lists are small enough for client-side search

## Out of Scope

- User deletion
- Store deletion  
- Order mutations (refunds, status changes)
- Bulk actions
- Export/CSV
